# Retro Anime/Manga Tracker with AI Recommendations

A personal, offline-first anime and manga tracking application featuring a nostalgic 8-bit NES aesthetic, powered by local LLMs via Ollama. 

## Features
- **Pixel/Retro UI**: A stunning nostalgic interface powered by `NES.css` and custom CRT effects.
- **Search & Browse**: Discover new titles using the free Jikan API (MyAnimeList unofficial API).
- **Personal Library**: Keep track of what you are Watching, Completed, or Planning to Watch directly in your browser's local storage.
- **Detailed Episode Tracker**: See exact episode listings and check them off one by one.
- **AI Advisor (Local RAG)**: Connects to your local instance of Ollama (default: Qwen) to deliver hallucination-free anime recommendations based on your library and live Jikan API data.

## Prerequisites
- Node.js (v18+)
- [Ollama](https://ollama.com/) running locally.

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Set up Ollama**: 
   Ensure Ollama is running and you have downloaded your preferred Qwen model. Make sure the local server is exposed at `http://localhost:11434`.
   ```bash
   ollama pull qwen
   ollama serve
   ```
   *(Note: You can configure the exact model name inside the app settings if you use a specific quantization or parameter size like 9B).*

## Architecture
The frontend is built with pure Vanilla JavaScript, HTML, and CSS served using Vite.
- Data persistence is handled via `window.localStorage`.
- AI Recommendations use **API-driven RAG**: The app dynamically queries the Jikan API for real anime context and feeds it directly to Ollama, ensuring hyper-accurate responses without the need for a vector database.

## License
MIT