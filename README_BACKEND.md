# Backend (Node + Express + SQLite)


## Environment
Copy `.env.example` to `.env` and set OPENAI_KEY (optional for local echo fallback).


## Scripts
- `npm run init-db` — creates chat.db and messages table
- `npm start` — runs server


## Endpoints
- `GET /history` — returns all messages
- `POST /send` — body: `{ text: string }`. Returns `{ reply: string }`