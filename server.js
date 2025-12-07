// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const sqlite3 = require("sqlite3").verbose();
const axios = require("axios");

// ------------------- Load .env -------------------
dotenv.config();

// ------------------- Check API key -------------------
if (!process.env.OPENAI_API_KEY) {
    console.warn("⚠️  OPENAI_API_KEY not found. AI responses will fallback to echo messages.");
} else {
    console.log("✅ OPENROUTER API key loaded successfully");
}

// ------------------- Express setup -------------------
const app = express();
app.use(cors());
app.use(express.json());

// ------------------- Database setup -------------------
const db = new sqlite3.Database("./chat.db", (err) => {
    if (err) console.error("DB Error:", err);
    else console.log("✅ Connected to SQLite database");
});

// Create messages table if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

// ------------------- Routes -------------------

// Get chat history
app.get("/history", (req, res) => {
    db.all("SELECT * FROM messages ORDER BY id ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB read error" });
        res.json(rows);
    });
});

// Send chat message
app.post("/chat", async (req, res) => {
    const userMsg = req.body.message;

    if (!userMsg) return res.status(400).json({ error: "Message required" });

    // Save user message
    db.run("INSERT INTO messages (role, content) VALUES (?, ?)", ["user", userMsg]);

    let aiReply = "";

    try {
        if (process.env.OPENAI_API_KEY) {
            // Call OpenRouter API
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: userMsg }]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            aiReply = response.data.choices[0].message.content.trim();
        } else {
            // Fallback if key not found
            aiReply = "Echo: " + userMsg;
        }
    } catch (err) {
        console.error("OpenRouter API Error:", err.response?.data || err.message);
        aiReply = "AI error: " + (err.response?.data?.error?.message || err.message);
    }

    // Save AI reply
    db.run("INSERT INTO messages (role, content) VALUES (?, ?)", ["ai", aiReply]);

    res.json({ user: userMsg, ai: aiReply });
});

// ------------------- Start server -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
