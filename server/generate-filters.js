const Airtable = require("airtable");
require("dotenv").config();

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_2;

const FIELD_NAMES = {
  City: "City Rollup (from Child UID)",
  Cohort: "Cohort Rollup (from Child UID)",
  Batch: "Batches Rollup (from Child UID)",
  Gender: "Child Gender Rollup (from Child UID)",
  Grade: "Child Grade Rollup (from Child UID)",
};

function cleanRollupValue(raw) {
  if (raw == null) return null;
  // If it's already a string (not an array), try to parse, else return as is
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      // If parsed is an array with one value, return the value
      if (Array.isArray(parsed) && parsed.length === 1) return parsed[0];
      return parsed;
    } catch {
      return raw;
    }
  }
  // If it's an array, flatten and dedupe
  if (Array.isArray(raw)) {
    if (raw.length === 1) return raw[0];
    return raw;
  }
  return raw;
}

function flattenAndUnique(arr) {
  return Array.from(new Set([].concat(...arr.map(v => Array.isArray(v) ? v : [v])))).filter(Boolean).sort();
}

async function generateFilters(selections = {}) {
  const records = [];
  const seenKeys = new Set();

  await base(tableName)
    .select({
      fields: Object.values(FIELD_NAMES).concat(["Phone", "Child Name"]),
    })
    .eachPage((fetched, fetchNext) => {
      for (const record of fetched) {
        const phone = record.get("Phone");
        const name = record.get("Child Name");
        const key = `${phone}_${name}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          records.push(record);
        }
      }
      fetchNext();
    });

  // Filter records by selected values
  const filteredRecords = records.filter(record => {
    return Object.entries(FIELD_NAMES).every(([filterKey, field]) => {
      const selected = selections[filterKey] || [];
      const value = cleanRollupValue(record.get(field));
      return selected.length === 0 || selected.includes(value);
    });
  });

  // Generate available options from filtered records
  const availableOptions = {
    City: new Set(),
    Cohort: new Set(),
    Batch: new Set(),
    Gender: new Set(),
    Grade: new Set(),
  };

  for (const record of filteredRecords) {
    for (const [key, field] of Object.entries(FIELD_NAMES)) {
      let value = cleanRollupValue(record.get(field));
      // If value is an array, add each element
      if (Array.isArray(value)) {
        value.forEach(v => v && availableOptions[key].add(v));
      } else if (value) {
        availableOptions[key].add(value);
      }
    }
  }

  // If no records match, return all options (for initial load or empty filter)
  const optionsToReturn = Object.fromEntries(
    Object.entries(availableOptions).map(([key, set]) => [key, set.size ? Array.from(set).sort() : flattenAndUnique(records.map(r => cleanRollupValue(r.get(FIELD_NAMES[key]))))])
  );

  return {
    options: optionsToReturn,
    filteredRecordCount: filteredRecords.length,
  };
}

module.exports = generateFilters;
