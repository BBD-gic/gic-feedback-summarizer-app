import { useRef, useEffect } from "react";

const MultiSelectDropdown = ({
  options = [],
  placeholder = "Select options...",
  selectedValues = [],
  onChange,
  isOpen,
  setIsOpen,
  disabled = false
}) => {
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen && setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  const toggleOption = (value) => {
    if (disabled) return;

    if (value === "__ALL__") {
      const allValues = options.map(opt => opt.value);
      const isAllSelected = selectedValues.length === allValues.length;
      onChange(isAllSelected ? [] : allValues);
      return;
    }

    const newSelected = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onChange && onChange(newSelected);
  };

  const removeChip = (value) => {
    if (disabled) return;
    onChange && onChange(selectedValues.filter((v) => v !== value));
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "relative",
        width: "100%",
        pointerEvents: disabled ? "none" : "auto",
        opacity: disabled ? 0.5 : 1
      }}
    >
      <div
        onClick={() => !disabled && setIsOpen && setIsOpen(!isOpen)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            setIsOpen && setIsOpen(!isOpen);
          }
        }}
        style={{
          backgroundColor: "#fff",
          borderRadius: "0.6rem",
          padding: "0.5rem 0.75rem",
          boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
          cursor: "pointer",
          userSelect: "none",
          fontSize: "0.95rem",
          fontFamily: "Albert Sans, sans-serif",
          color: "#333",
          minHeight: "44px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.4rem"
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedValues.length === 0 && (
          <span style={{ opacity: 0.5 }}>{placeholder}</span>
        )}

        {selectedValues.map((val) => {
          const label = options.find((opt) => opt.value === val)?.label || val;
          return (
            <span
              key={val}
              style={{
                background: "#e2e8f0",
                borderRadius: "1rem",
                padding: "0.2rem 0.75rem",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              {label}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(val);
                }}
                style={{
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                ×
              </span>
            </span>
          );
        })}
      </div>

      {isOpen && !disabled && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            backgroundColor: "transparent",
            zIndex: 10,
            paddingBottom: "2rem"
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "0.6rem",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              padding: "0.3rem 0",
              marginTop: "0.8rem"
            }}
          >
            {/* Select All Option */}
            {options.length > 1 && (
              <div
                onClick={() => toggleOption("__ALL__")}
                role="option"
                aria-selected={selectedValues.length === options.length}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleOption("__ALL__");
                }}
                style={{
                  padding: "0.6rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontFamily: "Albert Sans, sans-serif",
                  fontSize: "0.95rem",
                  color: "#333",
                  fontWeight: "bold",
                  borderBottom: "1px solid #e2e8f0"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.length === options.length}
                  readOnly
                  style={{
                    marginRight: "0.6rem",
                    accentColor: "#2d3748"
                  }}
                />
                Select All
              </div>
            )}

            {/* Regular Options */}
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => toggleOption(opt.value)}
                role="option"
                aria-selected={selectedValues.includes(opt.value)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggleOption(opt.value);
                }}
                style={{
                  padding: "0.6rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                  fontFamily: "Albert Sans, sans-serif",
                  fontSize: "0.95rem",
                  color: "#333"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt.value)}
                  readOnly
                  style={{
                    marginRight: "0.6rem",
                    accentColor: "#2d3748"
                  }}
                />
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
