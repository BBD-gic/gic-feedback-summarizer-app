import { useState } from "react";
import Header from "../components/Header";
import FilterForm from "../components/FilterForm";
import SummaryPanel from "../components/SummaryPanel";
import "../assets/fonts/fonts.css"

const Index = () => {
  const [selectedFilters, setSelectedFilters] = useState({});

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        fontFamily: "Albert Sans, sans-serif",
      }}
    >
      <Header />
      <div
        style={{
          display: "flex",
          height: "92vh",
          padding: "2vh 2vw",
          gap: "2vw",
          boxSizing: "border-box",
        }}
      >
        <div style={{ flex: "1", minWidth: "320px" }}>
          <FilterForm onGenerateSummary={setSelectedFilters} />
        </div>
        <div style={{ flex: "2", minWidth: "400px" }}>
          {selectedFilters ? (
            <SummaryPanel selectedFilters={selectedFilters} />
          ) : (
            <div style={{ padding: "1rem", fontFamily: "Abhaya Libre, serif", color: "#666" }}>
              <p>Please select filters and click <strong>Generate Summary</strong> to see the feedback summary here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
