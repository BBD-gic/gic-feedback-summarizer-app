import copyIcon from "../assets/images/copy-button.png";
import downloadIcon from "../assets/images/download-button.png";
import html2canvas from "html2canvas";

import { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";

const patternEmojis = {
  "Engagement & Enjoyment": "🎉",
  "Creativity & Pride in Building": "🎨",
  "Challenges Faced & Problem-Solving": "🧩",
  "Teamwork Dynamics": "🤝",
  "Mentor Support & Relationship": "👩‍🏫",
  "Suggestions for Improvement": "💡",
  "Recommendation Sentiment": "👍",
  "Overall Sentiment": "🌟"
};



const SummaryPanel = ({ selectedFilters }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef();

  // New state for update popup
  const [updating, setUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const updateTimeoutRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetch("https://gic-feedback-summarizer-app.onrender.com/generate-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedFilters || {})
    })
      .then(res => res.json())
      .then(data => {
        setSummaryData(data);
        setLoading(false);
      });
  }, [selectedFilters]);

  let copiedTimeout = null;

  const formatSelectedFilters = (filters) => {
    if (!filters || Object.keys(filters).length === 0) return "No filters applied.";

    const activeFilters = Object.entries(filters)
      .filter(([, values]) => Array.isArray(values) && values.length > 0)
      .map(([key, values]) => `${key}: ${values.join(", ")}`);

    return activeFilters.length > 0
      ? activeFilters.join(" | ")
      : "No filters applied.";
  };


  const handleCopy = (e) => {
    const summaryText = summaryRef.current?.innerText || "";
    const filterText = formatSelectedFilters(selectedFilters);
    const fullText = `📊 Selected Filters: ${filterText}\n\n${summaryText}`;

    navigator.clipboard.writeText(fullText);

    const alert = document.createElement("div");
    alert.textContent = "Copied to Clipboard!";
    Object.assign(alert.style, {
      position: "fixed",
      left: `${e?.clientX || window.innerWidth / 2}px`,
      top: `${(e?.clientY || window.innerHeight / 2) + 20}px`,
      background: "#000",
      color: "#fff",
      padding: "0.7rem 1.5rem",
      borderRadius: "0.7rem",
      fontSize: "0.9rem",
      zIndex: 9999,
      opacity: 1,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      pointerEvents: "none",
      transform: "translate(-50%, 0)"
    });
    document.body.appendChild(alert);
    if (copiedTimeout) clearTimeout(copiedTimeout);
    copiedTimeout = setTimeout(() => {
      alert.remove();
    }, 2000);
  };


  const handleDownload = async () => {
    const summaryElement = summaryRef.current;
    if (!summaryElement) return;

    const clone = summaryElement.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.top = "-9999px";
    clone.style.left = "0";
    clone.style.width = `${summaryElement.offsetWidth}px`;
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";

    // Add filter header
    const filterBanner = document.createElement("div");
    filterBanner.textContent = `📊 Selected Filters: ${formatSelectedFilters(selectedFilters)}`;
    filterBanner.style.fontSize = "0.95rem";
    filterBanner.style.fontWeight = "bold";
    filterBanner.style.marginBottom = "1rem";
    filterBanner.style.color = "#444";
    filterBanner.style.fontFamily = "Albert Sans, sans-serif";

    clone.insertBefore(filterBanner, clone.firstChild);

    document.body.appendChild(clone);

    await new Promise((res) => setTimeout(res, 100));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight > pdf.internal.pageSize.getHeight()) {
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      while (position < canvas.height) {
        const pageCanvas = document.createElement("canvas");
        const ctx = pageCanvas.getContext("2d");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.min(
          pageHeight * (canvas.width / pdfWidth),
          canvas.height - position
        );

        ctx.drawImage(
          canvas,
          0,
          position,
          canvas.width,
          pageCanvas.height,
          0,
          0,
          canvas.width,
          pageCanvas.height
        );

        const pageImg = pageCanvas.toDataURL("image/png");
        if (position > 0) pdf.addPage();
        pdf.addImage(pageImg, "PNG", 0, 0, pdfWidth, (pageCanvas.height * pdfWidth) / canvas.width);
        position += pageCanvas.height;
      }
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }

    pdf.save("summary.pdf");
  };


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "85vh",
        marginTop: "1rem",
        marginRight: "1rem",
        position: "relative"
      }}
    >
      {/* Blur overlay when updating */}
      {updating && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 2000
        }} />
      )}
      {/* Centered popup (fixed to whole screen) */}
      {updating && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#222",
          color: "#fff",
          padding: "2.2rem 2.5rem 1.7rem 2.5rem",
          borderRadius: "1.2rem",
          boxShadow: "0 6px 32px rgba(0,0,0,0.18)",
          fontSize: "1.25rem",
          fontFamily: "Albert Sans, serif",
          zIndex: 3000,
          minWidth: "22rem",
          textAlign: "center"
        }}>
          {updateStatus === "" ? (
            <>
              <div style={{ fontSize: "2.2rem", marginBottom: "0.7rem" }}>⏳</div>
              <div>Please wait while summaries are updated...</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "2.2rem", marginBottom: "0.7rem" }}>✅</div>
              <div>{updateStatus}</div>
            </>
          )}
        </div>
      )}
      {/* Summary Box */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: "1rem",
          overflow: "hidden",
          boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
          filter: updating ? "blur(2px)" : "none",
          pointerEvents: updating ? "none" : "auto"
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(0,0,0,0.1)",
            borderRadius: "1rem 1rem 0 0",
            padding: "0.3rem 1.2rem"
          }}
        >
          <h2 style={{ fontFamily: "Abhaya Libre, serif", fontSize: "1rem", margin: 0, color: "black", opacity: 0.5 }}>
            Summary
          </h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleCopy} title="Copy" style={iconBtnStyle}>
              <img src={copyIcon} alt="Copy" style={iconStyle} />
            </button>
            <button onClick={handleDownload} title="Download" style={iconBtnStyle}>
              <img src={downloadIcon} alt="Download" style={{ ...iconStyle, height: "1.3rem" }} />
            </button>
          </div>
        </div>
        <div
          ref={summaryRef}
          style={{
            flex: 1,
            overflowY: "auto",
            fontSize: "1rem",
            lineHeight: "1.5",
            fontFamily: "Albert Sans, sans-serif", // changed from Abhaya Libre
            padding: "1rem 2rem" // ensures no text is cut off behind scrollbar
          }}
        >
          {loading || !summaryData ? (
            <p>⏳ Generating summary...</p>
          ) : (
            <>
              {/* Show total and fetched records at the top, small font */}
              {summaryData.summary["Total records available"] !== undefined && (
                <div style={{ fontSize: "0.95rem", color: "#444", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.92rem", marginBottom: "0.1rem" }}>
                    <strong>Total records available:</strong> {summaryData.summary["Total records available"]}
                  </div>
                  <div style={{ fontSize: "0.92rem", marginBottom: "0.7rem" }}>
                    <strong>Records fetched:</strong> {summaryData.summary["Records fetched"]}
                  </div>
                </div>
              )}
              {Object.entries(summaryData.summary)
                .filter(([pattern]) => pattern !== "Total records available" && pattern !== "Records fetched")
                .map(([pattern, categories]) => (
                  <div key={pattern} style={{ marginBottom: "1.75rem" }}>
                    <h3 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
                      {patternEmojis[pattern] || "🔹"} {pattern}
                    </h3>
                    {Object.entries(categories).map(([category, { count, terms }]) => (
                      <div key={category} style={{ marginBottom: "0.75rem", paddingLeft: "1rem" }}>
                        <p style={{ margin: 0, fontSize: "1rem" }}>
                          • <strong>{count} out of {summaryData.total}</strong> students were <em>{category.toLowerCase()}</em>.
                        </p>
                        {terms.length > 0 && (
                          <p style={{ fontSize: "0.95rem", color: "#4a5568", marginLeft: "1rem", marginTop: "0.25rem" }}>
                            🏷️ Common phrases: {terms.map((term, i) => (
                              <span key={i} style={{ marginRight: "0.5rem" }}>
                                "{term}"
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
            </>
          )}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          filter: updating ? "blur(2px)" : "none",
          pointerEvents: updating ? "none" : "auto"
        }}
      >
        <button
          style={{ ...bottomBtnStyle, minWidth: "20rem" }}
          className="summary-bottom-btn"
          onClick={async () => {
            setUpdating(true);
            setUpdateStatus("");
            try {
              const res = await fetch("https://gic-feedback-summarizer-app.onrender.com/sync-child-data");
              let data;
              try {
                data = await res.json();
              } catch {
                // fallback
              }
              // Always show the same message regardless of backend
              setUpdateStatus("Updated Unsummarized Records.");
              updateTimeoutRef.current = setTimeout(() => {
                setUpdating(false);
                setUpdateStatus("");
              }, 2000);
            } catch (err) {
              setUpdateStatus("Error updating summaries");
              updateTimeoutRef.current = setTimeout(() => {
                setUpdating(false);
                setUpdateStatus("");
              }, 2000);
            }
          }}
        >
          Update Summaries
        </button>
        <button
          style={bottomBtnStyle}
          className="summary-bottom-btn"
        >
          Dive Deep
        </button>
      </div>
    </div>
  );
};

const iconBtnStyle = {
  width: "2.2rem",
  height: "2.2rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  backgroundColor: "transparent",
  opacity: 0.5
};

const iconStyle = {
  width: "1.5rem",
  height: "1.1rem",
};

const bottomBtnStyle = {
  padding: "1rem 1.4rem",
  backgroundColor: "black",
  opacity: 0.65,
  color: "#fff",
  fontFamily: "Abhaya Libre, serif",
  fontSize: "1.1rem",
  border: "none",
  borderRadius: "0.7rem",
  cursor: "pointer",
  marginTop: "0.5rem",
  transition: "opacity 0.18s"
};

// Add a style tag for hover effect
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    .summary-bottom-btn:hover {
      opacity: 0.8 !important;
    }
  `;
  document.head.appendChild(style);
}

export default SummaryPanel;
