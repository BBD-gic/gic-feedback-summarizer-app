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
                ...PATTERN_FIELDS.flatMap(p => [p, `${p} - term`, `${p} - quote`]),
                "Child Name",
                "Phone",
                // Ensure all possible liked/disliked challenge columns are fetched
                "Challenge Favorite",
                "Challenge Disliked"
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
            const quote = normalize(record.get(`${pattern} - quote`));
            // const term = normalize(record.get(`${pattern} - term`));

            if (!category) continue;

            if (!categoryMap[category]) {
                categoryMap[category] = { count: 0, quotes: [] };
            }

            categoryMap[category].count += 1;
            if (quote) categoryMap[category].quotes.push(quote);
        }

        if (Object.keys(categoryMap).length > 0) {
            summary[pattern] = {};
            for (const [cat, { count, quotes }] of Object.entries(categoryMap)) {
                // Shuffle and take up to 5 random quotes
                let quotesArr = Array.from(quotes);
                for (let i = quotesArr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [quotesArr[i], quotesArr[j]] = [quotesArr[j], quotesArr[i]];
                }
                quotesArr = quotesArr.slice(0, 5);
                summary[pattern][cat] = {
                    count,
                    quotes: quotesArr
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

    // 👍 Most Liked and 👎 Most Disliked Challenges
    const likedCounts = {};
    const dislikedCounts = {};
    let likedOther = 0;
    let dislikedOther = 0;
    for (const record of filteredRecords) {
        // Check both capitalizations for robustness
        const liked = normalize(record.get("Challenge Favorite")) || normalize(record.get("Challenge favorite"));
        const disliked = normalize(record.get("Challenge Disliked")) || normalize(record.get("Challenge disliked"));
        if (liked) {
            for (const challenge of liked.split(",").map(s => s.trim()).filter(Boolean)) {
                if (/^Other/i.test(challenge)) {
                    likedOther += 1;
                } else {
                    likedCounts[challenge] = (likedCounts[challenge] || 0) + 1;
                }
            }
        }
        if (disliked) {
            for (const challenge of disliked.split(",").map(s => s.trim()).filter(Boolean)) {
                if (/^Other/i.test(challenge)) {
                    dislikedOther += 1;
                } else {
                    dislikedCounts[challenge] = (dislikedCounts[challenge] || 0) + 1;
                }
            }
        }
    }
    if (likedOther > 0) likedCounts['Other'] = likedOther;
    if (dislikedOther > 0) dislikedCounts['Other'] = dislikedOther;
    summaryOut["Most Liked Challenges"] = likedCounts;
    summaryOut["Most Disliked Challenges"] = dislikedCounts;

    // 🖨️ Log liked/disliked challenges
    console.log("\n👍 Most Liked Challenges:");
    Object.entries(likedCounts).sort((a, b) => b[1] - a[1]).forEach(([challenge, count]) => {
        console.log(`  - ${challenge}: ${count}`);
    });
    console.log("\n👎 Most Disliked Challenges:");
    Object.entries(dislikedCounts).sort((a, b) => b[1] - a[1]).forEach(([challenge, count]) => {
        console.log(`  - ${challenge}: ${count}`);
    });

    // 🧾 Log filtered records
    console.log("\n📄 Filtered Records:");
    filteredRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.get("Child Name")} (${record.get("Phone")})`);
    });

    // 📊 Log summary
    console.log("\n📊 Generated Summary:");
    for (const [pattern, categories] of Object.entries(summary)) {
        console.log(`\n🔹 ${pattern}`);
        for (const [category, { count, quotes }] of Object.entries(categories)) {
            console.log(`  - ${category}: ${count}`);
            if (quotes.length) {
                console.log(`    Quotes: ${quotes.join(" | ")}`);
            }
        }
    }

    return { total, summary: summaryOut };
}

module.exports = generatePatternSummary;
