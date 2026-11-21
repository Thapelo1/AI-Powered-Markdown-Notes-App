# Margin — AI Markdown Notes

A small React + Node app for writing markdown notes and using GPT to summarize or rewrite them. Your draft is saved in this browser; the OpenAI API key stays on the server.

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and add your OpenAI API key.
4. Start the app: `npm run dev`
5. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The app's backend uses `gpt-4o-mini` by default. Set `OPENAI_MODEL` in `.env` to use another model. To build for production, run `npm run build`, then `npm start`; the Node server serves the built app and API on port 3001.
