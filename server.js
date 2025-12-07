// server.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const Database = require("better-sqlite3");
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
const db = new Database("chat.db");

// Create messages table if it doesn't exist
db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ------------------- Routes -------------------

// Get chat history
app.get("/history", (req, res) => {
    try {
        const rows = db.prepare("SELECT * FROM messages ORDER BY id ASC").all();
        res.json(rows);
    } catch (err) {
        console.error("DB read error:", err);
        res.status(500).json({ error: "DB read error" });
    }
});

// Send chat message
app.post("/chat", async (req, res) => {
    const userMsg = req.body.message;

    if (!userMsg) return res.status(400).json({ error: "Message required" });

    // Save user message
    db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("user", userMsg);

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
    db.prepare("INSERT INTO messages (role, content) VALUES (?, ?)").run("ai", aiReply);

    res.json({ user: userMsg, ai: aiReply });
});

// ------------------- Start server -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
