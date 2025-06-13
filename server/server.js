const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const syncChildData = require("./sync-child-data");
const generateFilters = require("./generate-filters");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // Required for POST JSON

// Sync route
app.get("/sync-child-data", async (req, res) => {
  try {
    const count = await syncChildData();
    res.json({ success: true, message: `✅ Updated ${count} records.` });
  } catch (error) {
    console.error("❌ Error syncing:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Dynamic filter route
app.post("/filters", async (req, res) => {
  try {
    const selections = req.body || {};
    console.log("\n--- Filter Request ---");
    console.log("Selected options:");
    console.table(selections);
    const filters = await generateFilters(selections);
    console.log("Available options:");
    console.table(
      Object.fromEntries(
        Object.entries(filters.options).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v])
      )
    );
    res.json(filters);
  } catch (error) {
    console.error("❌ Error generating filters:", error);
    res.status(500).json({ success: false, message: "Error generating filters" });
  }
});

const generatePatternSummary = require("./generate-summary");

app.post("/generate-summary", async (req, res) => {
  try {
    const selections = req.body || {};
    const result = await generatePatternSummary(selections);
    res.json(result);
  } catch (err) {
    console.error("❌ Error generating summary:", err);
    res.status(500).json({ success: false, message: "Error generating summary" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
