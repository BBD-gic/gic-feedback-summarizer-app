// 📁 server/update-summaries.js
const fs = require("fs");
const path = require("path");
const Airtable = require("airtable");
require("dotenv").config();

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableB = process.env.AIRTABLE_TABLE_2;
const CACHE_FILE = path.join(__dirname, "summary_cache.txt");

async function updateSummariesFromCache() {
  // Do NOT empty the cache file at the start; only read from it

  if (!fs.existsSync(CACHE_FILE)) {
    console.error("❌ summary_cache.txt not found.");
    return;
  }

  // Read and parse all JSON arrays from cache file
  const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
  const summaryArrays = fileContent
    .split(/\n(?=\[)/) // split on newlines before a [
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => {
      try {
        return JSON.parse(chunk);
      } catch (e) {
        console.error("❌ Failed to parse chunk:", chunk.slice(0, 100), e);
        return [];
      }
    });

  const summaries = summaryArrays.flat();
  console.log(`📦 Loaded ${summaries.length} summaries from cache`);

  // Fetch all phone + name mappings from Airtable
  const phoneNameToRecordIds = {};
  await base(tableB)
    .select({ fields: ["Phone", "Child Name"] })
    .eachPage((records, fetchNextPage) => {
      records.forEach((record) => {
        const phone = record.get("Phone");
        const name = record.get("Child Name");
        if (phone && name) {
          const key = phone.toString().trim() + "|" + name.toString().trim();
          if (!phoneNameToRecordIds[key]) phoneNameToRecordIds[key] = [];
          phoneNameToRecordIds[key].push(record.id);
        }
      });
      fetchNextPage();
    });

  const updatesToApply = [];

  for (const summary of summaries) {
    const phone = summary.phone?.toString().trim();
    const name = summary.name?.toString().trim();
    if (!phone || !name) {
      console.warn("⚠️ Missing phone or name for summary:", summary);
      continue;
    }

    console.log(`🔍 Processing: ${name}, phone: ${phone}`);
    console.log("📇 Record IDs in summary:", summary.recordIds);

    for (const id of summary.recordIds || []) {
      if (!id) continue;
      // For each record, update all fields at once
      const fields = {
        "Reflection Depth": summary.reflection_depth?.toString() || "",
        "Challenge Favorite": summary.challenge_favorite?.toString() || "",
        "Challenge Disliked": summary.challenge_disliked?.toString() || "",
        "Highlight Quote 1": summary.highlight_quotes?.[0]?.quote?.toString() || "",
        "Highlight Quote 2": summary.highlight_quotes?.[1]?.quote?.toString() || "",
        "Tags 1": Array.isArray(summary.highlight_quotes?.[0]?.tags) ? summary.highlight_quotes[0].tags.map(String) : [],
        "Tags 2": Array.isArray(summary.highlight_quotes?.[1]?.tags) ? summary.highlight_quotes[1].tags.map(String) : [],
        // Hardcoded pattern fields
        "Engagement & Enjoyment": summary.patterns?.["Engagement & Enjoyment"]?.category?.toString() || "",
        "Engagement & Enjoyment - term": summary.patterns?.["Engagement & Enjoyment"]?.term?.toString() || "",
        "Engagement & Enjoyment - quote": summary.patterns?.["Engagement & Enjoyment"]?.quote?.toString() || "",
        "Creativity & Pride in Building": summary.patterns?.["Creativity & Pride in Building"]?.category?.toString() || "",
        "Creativity & Pride in Building - term": summary.patterns?.["Creativity & Pride in Building"]?.term?.toString() || "",
        "Creativity & Pride in Building - quote": summary.patterns?.["Creativity & Pride in Building"]?.quote?.toString() || "",
        "Challenges Faced & Problem-Solving": summary.patterns?.["Challenges Faced & Problem-Solving"]?.category?.toString() || "",
        "Challenges Faced & Problem-Solving - term": summary.patterns?.["Challenges Faced & Problem-Solving"]?.term?.toString() || "",
        "Challenges Faced & Problem-Solving - quote": summary.patterns?.["Challenges Faced & Problem-Solving"]?.quote?.toString() || "",
        "Teamwork Dynamics": summary.patterns?.["Teamwork Dynamics"]?.category?.toString() || "",
        "Teamwork Dynamics - term": summary.patterns?.["Teamwork Dynamics"]?.term?.toString() || "",
        "Teamwork Dynamics - quote": summary.patterns?.["Teamwork Dynamics"]?.quote?.toString() || "",
        "Mentor Support & Relationship": summary.patterns?.["Mentor Support & Relationship"]?.category?.toString() || "",
        "Mentor Support & Relationship - term": summary.patterns?.["Mentor Support & Relationship"]?.term?.toString() || "",
        "Mentor Support & Relationship - quote": summary.patterns?.["Mentor Support & Relationship"]?.quote?.toString() || "",
        "Suggestions for Improvement": summary.patterns?.["Suggestions for Improvement"]?.category?.toString() || "",
        "Suggestions for Improvement - term": summary.patterns?.["Suggestions for Improvement"]?.term?.toString() || "",
        "Suggestions for Improvement - quote": summary.patterns?.["Suggestions for Improvement"]?.quote?.toString() || "",
        "Recommendation Sentiment": summary.patterns?.["Recommendation Sentiment"]?.category?.toString() || "",
        "Recommendation Sentiment - term": summary.patterns?.["Recommendation Sentiment"]?.term?.toString() || "",
        "Recommendation Sentiment - quote": summary.patterns?.["Recommendation Sentiment"]?.quote?.toString() || "",
        "Overall Sentiment": summary.patterns?.["Overall Sentiment"]?.category?.toString() || "",
        "Overall Sentiment - term": summary.patterns?.["Overall Sentiment"]?.term?.toString() || "",
        "Overall Sentiment - quote": summary.patterns?.["Overall Sentiment"]?.quote?.toString() || "",
        "Summary Generated": "true"
      };
      updatesToApply.push({
        id,
        typecast: true,
        fields
      });
      console.log(`✅ Queued update for ${name} → ${id}`);
    }
  }

  if (updatesToApply.length === 0) {
    console.warn("⚠️ No updates to apply. Please check if recordIds exist and match Airtable records.");
    // Delete the cache file even if no updates are applied
    try {
      fs.unlinkSync(CACHE_FILE);
      console.log("🗑️ summary_cache.txt deleted (no updates to apply).");
    } catch (e) {
      console.error("❌ Failed to delete summary_cache.txt:", e);
    }
    return;
  }

  // Push each update one at a time, print error if it comes up
  let updated = 0;
  for (const updateObj of updatesToApply) {
    try {
      // Use await base(tableB).update(id, fields, {typecast: true}) for single record update
      await base(tableB).update(updateObj.id, updateObj.fields, { typecast: true });
      updated += 1;
      console.log(`✅ Updated ${updated}/${updatesToApply.length} records in Airtable.`);
    } catch (e) {
      console.error("❌ Airtable update error for record:", updateObj, e);
    }
  }

  console.log(`🎉 Done. Total records updated: ${updated}`);

  // Delete the cache file after successful update
  try {
    fs.unlinkSync(CACHE_FILE);
    console.log("🗑️ summary_cache.txt deleted after update.");
  } catch (e) {
    console.error("❌ Failed to delete summary_cache.txt:", e);
  }
}

if (require.main === module) {
  // Only create the cache file if it does not exist; do NOT clear it before running updates
  if (!fs.existsSync(CACHE_FILE)) {
    fs.writeFileSync(CACHE_FILE, "", "utf-8");
  }
  updateSummariesFromCache();
}

module.exports = updateSummariesFromCache;
