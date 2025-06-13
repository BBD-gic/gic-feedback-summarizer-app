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

// Reflection patterns and their Airtable field names
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

function cleanRollupValue(raw) {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.length === 1 ? parsed[0] : parsed;
        return parsed;
    } catch {
        return Array.isArray(raw) ? raw[0] : raw.toString().trim();
    }
}

function normalize(val) {
    return Array.isArray(val) ? val.join(", ") : val?.toString()?.trim();
}

async function generatePatternSummary(selections = {}) {
    const records = [];

    await base(tableName)
        .select({
            fields: [
                ...Object.values(FIELD_NAMES),
                ...PATTERN_FIELDS.flatMap(p => [p, `${p} - term`]),
                "Child Name",
                "Phone"
            ]
        })
        .eachPage((fetched, next) => {
            records.push(...fetched);
            next();
        });

    // ✅ De-duplicate records by Phone
    const uniqueRecordsMap = new Map();
    for (const record of records) {
        const phone = record.get("Phone");
        if (phone && !uniqueRecordsMap.has(phone)) {
            uniqueRecordsMap.set(phone, record);
        }
    }
    const uniqueRecords = Array.from(uniqueRecordsMap.values());

    // 🎯 Apply filter selections
    const filteredRecords = uniqueRecords.filter(record => {
        return Object.entries(FIELD_NAMES).every(([key, field]) => {
            const selected = selections[key] || [];
            const raw = record.get(field);
            const value = cleanRollupValue(raw);
            const isMatch = selected.length === 0 || selected.includes(value);

            if (!isMatch) {
                console.log(`❌ Record "${record.get("Child Name")}" failed on ${key}: selected = [${selected}], value = "${value}"`);
            }

            return isMatch;
        });
    });

    console.log(`\n✅ Matching records after filter: ${filteredRecords.length}`);

    const total = filteredRecords.length;
    const summary = {};

    for (const pattern of PATTERN_FIELDS) {
        const categoryMap = {};

        for (const record of filteredRecords) {
            const category = normalize(record.get(pattern));
            const term = normalize(record.get(`${pattern} - term`));

            if (!category) continue;

            if (!categoryMap[category]) {
                categoryMap[category] = { count: 0, terms: new Set() };
            }

            categoryMap[category].count += 1;
            if (term) categoryMap[category].terms.add(term);
        }

        if (Object.keys(categoryMap).length > 0) {
            summary[pattern] = {};
            for (const [cat, { count, terms }] of Object.entries(categoryMap)) {
                let termsArr = Array.from(terms).sort();
                if (termsArr.length > 10) {
                    // Shuffle and take 10 random terms
                    for (let i = termsArr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [termsArr[i], termsArr[j]] = [termsArr[j], termsArr[i]];
                    }
                    termsArr = termsArr.slice(0, 10).sort();
                }
                summary[pattern][cat] = {
                    count,
                    terms: termsArr
                };
            }
        }
    }

    // Prepare summary object with header lines
    const summaryOut = {};
    summaryOut["Total records available"] = uniqueRecords.length;
    summaryOut["Records fetched"] = total;
    for (const [pattern, cats] of Object.entries(summary)) {
        summaryOut[pattern] = cats;
    }

    // 🧾 Log filtered records
    console.log("\n📄 Filtered Records:");
    filteredRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.get("Child Name")} (${record.get("Phone")})`);
    });

    // 📊 Log summary
    console.log("\n📊 Generated Summary:");
    for (const [pattern, categories] of Object.entries(summary)) {
        console.log(`\n🔹 ${pattern}`);
        for (const [category, { count, terms }] of Object.entries(categories)) {
            console.log(`  - ${category}: ${count}`);
            if (terms.length) {
                console.log(`    Terms: ${terms.join(", ")}`);
            }
        }
    }

    return { total, summary: summaryOut };
}

module.exports = generatePatternSummary;
