import { useEffect, useState } from "react";
import MultiSelectDropdown from "./MultiSelectDropdown";

const fetchFilters = async (selections) => {
  const res = await fetch("https://gic-feedback-summarizer-app.onrender.com/filters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(selections),
  });
  return res.json();
};

const FilterForm = ({ onGenerateSummary }) => {
  const [filters, setFilters] = useState(null);
  const [selected, setSelected] = useState({ City: [], Cohort: [], Batch: [], Gender: [], Grade: [] });
  const [openDropdown, setOpenDropdown] = useState(null);

  const fieldOrder = ["City", "Cohort", "Batch", "Gender", "Grade"];

  useEffect(() => {
    fetchFilters({}).then(setFilters);
  }, []);

  const handleChange = async (label, values) => {
    const currentIdx = fieldOrder.indexOf(label);
    const updated = { ...selected };
    updated[label] = values;
    for (let i = currentIdx + 1; i < fieldOrder.length; i++) {
      updated[fieldOrder[i]] = [];
    }

    const upstreamSelections = {};
    for (let i = 0; i <= currentIdx; i++) {
      upstreamSelections[fieldOrder[i]] = updated[fieldOrder[i]];
    }

    const newFilters = await fetchFilters(upstreamSelections);
    const mergedFilters = { ...filters?.options };
    for (let i = currentIdx + 1; i < fieldOrder.length; i++) {
      mergedFilters[fieldOrder[i]] = newFilters.options[fieldOrder[i]] || [];
    }

    setFilters({ options: mergedFilters });
    setSelected(updated);
    if (values.length === 0) setOpenDropdown(label);
  };

  const isEnabled = (label) => {
    const idx = fieldOrder.indexOf(label);
    if (label === "City") return true;
    return fieldOrder.slice(0, idx).every(key => selected[key]?.length);
  };

  const getOptions = (label) => {
    if (!filters) return [];
    const available = new Set(filters.options?.[label] || []);
    const selectedSet = new Set(selected[label] || []);
    const merged = new Set([...available, ...selectedSet]);

    return Array.from(merged)
      .filter(Boolean)
      .sort()
      .map(val => ({ value: val, label: val }));
  };

  // 🔧 Styles
  const headerStyle = {
    fontFamily: "Bungee Shade, cursive",
    fontSize: "2.2rem",
    lineHeight: "2.8rem",
    textAlign: "left",
    color: "#333",
    margin: "1rem",
    opacity: 0.7
  };

  const containerStyle = {
    width: "95%",
    maxWidth: "400px",
    marginLeft: "1rem",
    backgroundColor: "#efefef",
    borderRadius: "1rem",
    boxShadow: "inset 0 3px 6px 0px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "70vh"
  };

  const labelStyle = {
    fontWeight: "600",
    fontFamily: "Albert Sans, sans-serif",
    fontSize: "0.85rem",
    color: "#444",
    marginBottom: "0.3rem"
  };

  const buttonStyle = {
    width: "100%",
    padding: "0.7rem 1.2rem",
    backgroundColor: "black",
    opacity: 0.65,
    color: "#fff",
    fontFamily: "Abhaya Libre, serif",
    fontSize: "1.1rem",
    border: "none",
    borderRadius: "0 0 1rem 1rem",
    cursor: "pointer",
    transition: "opacity 0.18s"
  };

  // Add a style tag for hover effect (only once)
  if (typeof window !== "undefined" && !window.__filterform_btn_hover) {
    const style = document.createElement("style");
    style.innerHTML = `
      .filterform-generate-btn:hover {
        opacity: 0.8 !important;
      }
    `;
    document.head.appendChild(style);
    window.__filterform_btn_hover = true;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <h2 style={headerStyle}>
        FEEDBACK<br />SUMMARIZER
      </h2>

      <div style={containerStyle}>
        <div className="scrollable-content">
          {fieldOrder.map((label) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={labelStyle}>{label}</div>
              <MultiSelectDropdown
                options={getOptions(label)}
                selectedValues={selected[label]}
                onChange={(vals) => handleChange(label, vals)}
                placeholder={`Select ${label}...`}
                isOpen={openDropdown === label}
                setIsOpen={(val) => setOpenDropdown(val ? label : null)}
                disabled={!isEnabled(label)}
                style={{
                  height: "32px",      // reduced height
                  fontSize: "0.85rem", // smaller text
                  padding: "4px 8px"   // optional: tighter padding
                }}
              />
            </div>
          ))}
        </div>

        <button onClick={() => onGenerateSummary(selected)} style={buttonStyle} className="filterform-generate-btn">
          Generate Summary
        </button>
      </div>
    </div>
  );
};

export default FilterForm;
