import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";

const PATTERN_FIELDS = [
    "Engagement & Enjoyment",
    "Creativity & Pride in Building",
    "Challenges Faced & Problem-Solving",
    "Teamwork Dynamics",
    "Mentor Support & Relationship",
    "Suggestions for Improvement",
    "Recommendation Sentiment",
    "Overall Sentiment"
];

const DiveDeep = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const summaryData = location.state?.summaryData;

    const [pattern, setPattern] = useState("Overall Sentiment");
    const [options, setOptions] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [results, setResults] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    // If no summaryData, redirect back
    useEffect(() => {
        if (!summaryData) {
            navigate("/");
        }
    }, [summaryData, navigate]);

    // Set default pattern and select all on mount
    useEffect(() => {
        if (options.length > 0 && !pattern) {
            setPattern("Overall Sentiment");
            setSelectedOptions(options);
            setSelectAll(true);
        }
    }, [options, pattern]);


    // Fetch available options for selected pattern
    useEffect(() => {
        if (!pattern || !summaryData) {
            setOptions([]);
            setSelectedOptions([]);
            setSelectAll(false);
            return;
        }
        const summary = summaryData.summary?.[pattern] || {};
        const opts = Object.keys(summary);
        setOptions(opts);
        // Always select all categories when pattern changes
        setSelectedOptions(opts);
    }, [pattern, summaryData]);

    // Handle select all
    useEffect(() => {
        const allSelected = options.length > 0 && selectedOptions.length === options.length;
        if (selectAll !== allSelected) {
            setSelectAll(allSelected);
        }
    }, [options, selectedOptions, selectAll]);



    // Fetch results for selected pattern and selected options
    useEffect(() => {
        if (!pattern || !summaryData || selectedOptions.length === 0) {
            setResults([]);
            return;
        }
        const summary = summaryData.summary?.[pattern] || {};
        let students = [];
        selectedOptions.forEach(opt => {
            const cat = summary[opt];
            if (cat && cat.quotes) {
                cat.quotes.forEach(q => {
                    // Try to extract name, grade, gender from both object and string cases
                    let name = "-", grade = "-", gender = "-", quote = "-";
                    if (typeof q === "object") {
                        name = q.name || q.Name || q.childName || q.child_name || "-";
                        grade = q.grade || q.Grade || q.childGrade || q.child_grade || "-";
                        gender = q.gender || q.Gender || q.childGender || q.child_gender || "-";
                        quote = q.quote || q.Quote || "-";
                    } else {
                        quote = q;
                    }
                    students.push({
                        name,
                        grade,
                        gender,
                        quote,
                        category: opt
                    });
                });
            }
        });
        setResults(students);
    }, [pattern, selectedOptions, summaryData]);

    return (
        <div style={{
            padding: "3rem 4rem",
            width: "100%",
            height: "100vh", // use fixed viewport height
            background: "#fafafa",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto", // ensure scrolling
            alignItems: "center" // center all children horizontally
        }}>
            <div style={{
                position: "sticky",
                top: 0,
                zIndex: 1000,
                width: "100%"
            }}>
                <Header />
            </div>
            <div style={{ display: "flex", gap: "1rem", marginTop: "2rem", marginBottom: "1rem", justifyContent: "center", alignItems: "flex-start", width: "100%", maxWidth: 1200 }}>
                <div style={{ flex: 5, minWidth: 0, display: "flex", flexDirection: "column", height: 160 }}>
                    <label style={{ fontWeight: 800, fontSize: "15px", display: "block", marginBottom: "6px", color: "#1f2937" }}>Pattern</label>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "6px 10px",
                        background: "#ffffff",
                        borderRadius: "8px",
                        border: "1px solid #d1d5db",
                        padding: "10px 15px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        width: "100%",
                        maxWidth: "100%",
                        height: "100%"
                    }}>
                        {PATTERN_FIELDS.map((p, idx) => (
                            <div key={p} style={{ marginBottom: 0, display: "flex", alignItems: "center" }}>
                                <input
                                    type="checkbox"
                                    checked={pattern === p}
                                    onChange={() => {
                                        setPattern(p);
                                    }}
                                    id={p}
                                    style={{ marginRight: "8px", transform: "scale(1.0)" }}
                                />
                                <label htmlFor={p} style={{ fontSize: "12px", color: "#4b5563", cursor: "pointer" }}>{p}</label>
                            </div>
                        ))}
                    </div>
                </div>
                {pattern && (
                    <div style={{ flex: 2, minWidth: 0, display: "flex", flexDirection: "column", height: 160 }}>
                        <label style={{ fontWeight: 800, fontSize: "15px", display: "block", marginBottom: "6px", color: "#1f2937" }}>Categories</label>
                        <div style={{
                            background: "#ffffff",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            padding: "10px 15px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            height: "100%",
                            overflowY: "auto",
                            width: "100%"
                        }}>
                            {options.map(opt => (
                                <div key={opt} style={{ marginBottom: "10px" }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedOptions.includes(opt)}
                                        onChange={() => {
                                            if (selectedOptions.includes(opt)) {
                                                // Allow deselecting even if only one is left
                                                setSelectedOptions(selectedOptions.filter(o => o !== opt));
                                            } else {
                                                setSelectedOptions([...selectedOptions, opt]);
                                            }
                                        }}
                                        id={opt}
                                        style={{ marginRight: "8px", transform: "scale(1.0)" }}
                                    />
                                    <label htmlFor={opt} style={{ fontSize: "12px", color: "#4b5563" }}>{opt}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div style={{ width: "100%", maxWidth: 1200, display: "flex", flexDirection: "column", flex: 1, marginTop: "1rem", overflow: "auto", alignItems: "center" }}>
                {results.length === 0 ? (
                    <div style={{
                        marginTop: "80px",
                        textAlign: "center",
                        width: "100%",
                        padding: "4rem",
                        color: "#6b7280",
                        fontSize: "16px",
                        background: "#ffffff",
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                    }}>
                        <p>No students found for this selection.</p>
                    </div>
                ) : (
                    <div style={{
                        width: "100%",
                        maxWidth: 1200,
                        background: "#ffffff",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        border: "1px solid #e5e7eb",
                        overflowY: "auto",
                        maxHeight: "60vh",
                        marginTop: "2rem"
                    }}>
                        <table style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            fontSize: "13px",
                            lineHeight: "1.45"
                        }}>
                            <colgroup>
                                <col style={{ width: '16.67%' }} />
                                <col style={{ width: '8.33%' }} />
                                <col style={{ width: '8.33%' }} />
                                <col style={{ width: '16.67%' }} />
                                <col style={{ width: '33.33%' }} />
                            </colgroup>
                            <thead style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                                background: "#f8f9fa"
                            }}>
                                <tr>
                                    {["Name", "Grade", "Gender", "Category", "Quote"].map((header) => (
                                        <th key={header} style={{
                                            padding: "10px 14px",
                                            borderBottom: "1px solid #e5e7eb",
                                            textAlign: "left",
                                            fontWeight: 600,
                                            fontSize: "12px",
                                            color: "#374151",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.4px"
                                        }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((student, i) => {
                                    const baseBg = i % 2 === 0 ? "#ffffff" : "#edf1f5";
                                    return (
                                        <tr key={i}
                                            style={{
                                                backgroundColor: baseBg,
                                                transition: "background-color 0.2s ease"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e3e8ee"}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = baseBg}
                                        >
                                            <td style={{
                                                padding: "10px 14px",
                                                color: "#1f2937",
                                                fontWeight: 500,
                                                verticalAlign: "top",
                                                wordBreak: "break-word"
                                            }}>{student.name}</td>
                                            <td style={{
                                                padding: "10px 14px",
                                                color: "#6b7280",
                                                verticalAlign: "top",
                                                wordBreak: "break-word"
                                            }}>{student.grade}</td>
                                            <td style={{
                                                padding: "10px 14px",
                                                color: "#6b7280",
                                                verticalAlign: "top",
                                                wordBreak: "break-word"
                                            }}>{student.gender}</td>
                                            <td style={{
                                                padding: "10px 14px",
                                                color: "#4b5563",
                                                fontWeight: 500,
                                                verticalAlign: "top",
                                                wordBreak: "break-word"
                                            }}>{student.category}</td>
                                            <td style={{
                                                padding: "10px 14px",
                                                fontStyle: "italic",
                                                color: "#374151",
                                                verticalAlign: "top",
                                                wordBreak: "break-word"
                                            }}>{student.quote}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>


                )}
            </div>
        </div>
    );
};

export default DiveDeep;
