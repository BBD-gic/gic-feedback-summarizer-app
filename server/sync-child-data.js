// 📁 server/sync-child-uid.js
const fs = require("fs");
const path = require("path");
const Airtable = require("airtable");
const { OpenAI } = require("openai");
require("dotenv").config();
const updateSummariesFromCache = require("./update-summaries");

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CACHE_FILE = path.join(__dirname, "summary_cache.txt");

async function syncChildData() {
  const tableA = process.env.AIRTABLE_TABLE_1;
  const tableB = process.env.AIRTABLE_TABLE_2;

  const phoneToRecordIdMap = {};
  await base(tableA)
    .select({ fields: ["Phone number"] })
    .eachPage((records, fetchNextPage) => {
      records.forEach((record) => {
        const phone = record.get("Phone number");
        if (phone) {
          const normalized = phone.toString().trim().slice(-10);
          phoneToRecordIdMap[normalized] = record.id;
        }
      });
      fetchNextPage();
    });

  const updates = [];
  const summaryGeneratedStudents = new Set();
  const studentMap = {};

  await base(tableB)
    .select({ fields: ["Phone", "Child UID", "Child Name", "Conversation", "Created", "Summary Generated"] })
    .eachPage((records, fetchNextPage) => {
      records.forEach((record) => {
        const phone = record.get("Phone");
        const uid = record.get("Child UID");
        const name = record.get("Child Name");
        const convo = record.get("Conversation");
        const created = record.get("Created");
        const summary = record.get("Summary Generated");

        if (!phone || !name || !convo) return;

        // Link UID if missing
        if (!uid) {
          const normalized = phone.toString().trim().slice(-10);
          const recordId = phoneToRecordIdMap[normalized];
          if (recordId) {
            updates.push({ id: record.id, fields: { "Child UID": [recordId] } });
          }
        }

        const key = phone.trim() + "|" + name.trim();
        if (!studentMap[key]) studentMap[key] = [];
        studentMap[key].push({ recordId: record.id, conversation: convo, created, hasSummary: summary === true });

        if (summary === true) summaryGeneratedStudents.add(key);
      });
      fetchNextPage();
    });

  // Perform UID updates in batches
  for (let i = 0; i < updates.length; i += 10) {
    await base(tableB).update(updates.slice(i, i + 10));
  }
  console.log(`✅ Updated ${updates.length} records with Child UID`);

  // Build list of students that still need summaries, or have some chats without summary
  const toProcess = [];
  for (const [key, chats] of Object.entries(studentMap)) {
    const hasUnprocessed = chats.some(c => !c.hasSummary);
    const hasProcessed = chats.some(c => c.hasSummary);
    if (hasUnprocessed || (hasUnprocessed && hasProcessed)) {
      const [phone, name] = key.split("|");
      const sorted = chats.sort((a, b) => new Date(a.created) - new Date(b.created));
      const combined = sorted.map(c => c.conversation.trim()).join("\n");
      const recordIds = sorted.map(c => c.recordId);
      toProcess.push({ phone, name, conversation: combined, recordIds });
    }
  }

  const CHUNK_SIZE = 3;
  const summaries = [];

  for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
    const batch = toProcess.slice(i, i + CHUNK_SIZE);
    const promptInput = JSON.stringify(batch, null, 2);
    const prompt = fs.readFileSync(path.join(__dirname, "prompt.txt"), "utf-8").replace("{{INPUT}}", promptInput);

    console.log("\uD83D\uDCC4 Prompt input:\n", promptInput);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      });

      let rawOutput = completion.choices[0].message.content.trim();
      if (rawOutput.startsWith("```") && rawOutput.includes("json")) {
        rawOutput = rawOutput.replace(/```json|```/g, "").trim();
      }

      fs.appendFileSync(CACHE_FILE, rawOutput + "\n", "utf-8");
      const parsed = JSON.parse(rawOutput);
      parsed.forEach(summary => {
        summary.recordIds = batch.find(b => b.name === summary.name)?.recordIds || [];
      });
      summaries.push(...parsed);
    } catch (e) {
      console.error("❌ OpenAI error:", e);
    }
  }

  // Final Airtable updates from all summaries
  // Instead of updating here, call updateSummariesFromCache
  await updateSummariesFromCache();
  console.log("✅ Airtable records updated with summaries from cache.");
}

if (require.main === module) {
  syncChildData();
}

module.exports = syncChildData;

