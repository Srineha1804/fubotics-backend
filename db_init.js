// Run once to create DB and table (safer than doing it inline in server.js for first-run)
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';


const init = async () => {
const db = await open({ filename: './chat.db', driver: sqlite3.Database });
await db.exec(`
CREATE TABLE IF NOT EXISTS messages (
id INTEGER PRIMARY KEY AUTOINCREMENT,
sender TEXT NOT NULL,
text TEXT NOT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);
console.log('DB initialized (chat.db)');
await db.close();
};


init().catch(err => console.error(err));