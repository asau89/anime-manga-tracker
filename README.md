<div align="center">
  <h1>🎮 Retro Anime & Manga Tracker OS</h1>
  <p>
    <b>A nostalgic 8-bit aesthetic tracking application powered by Local AI.</b>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/Vite-B73BA5?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
    <img src="https://img.shields.io/badge/Ollama-000000?style=for-the-badge&logo=ollama&logoColor=white" alt="Ollama" />
  </p>
</div>

---

## 📖 Overview
**Retro Anime & Manga Tracker OS** is a fully offline-first, browser-based media library crafted with pure Vanilla JavaScript and styled using `NES.css`. It functions as your personal database for Anime and Manga, retrieving real-time statistics and episodes from public APIs, and leverages local LLMs (via Ollama) to give ultra-fast, hallucination-free recommendations.

## ✨ Features
- **🕹️ 8-Bit Pixel Aesthetic**: A stunning nostalgic interface featuring CRT scanline effects, pixel fonts, and CSS-driven retro containers.
- **📚 Dual Library System**: Distinct tracking pipelines for **Anime** (via Jikan API) and **Manga/Manhwa** (via AniList API).
- **✅ Detailed Progress Tracking**: Check off individual episodes or chapters. Marking an entire series as "Completed" will intelligently auto-fill your tracker!
- **🤖 Local AI Advisor (RAG)**: Connects seamlessly to hardware-local LLMs (like `llama3.2:1b` or `qwen2.5`) via Ollama. It dynamically pulls your Top 5 highest-rated shows and feeds them into a custom prompt, delivering instantaneous, highly personalized recommendations as an 8-bit NPC.
- **🛡️ Privacy-First & Offline**: Your entire library is persisted directly to `window.localStorage`. No cloud accounts, no tracking.

## 🛠️ Tech Stack
- **Frontend Core**: HTML5, Vanilla JavaScript, CSS Variables.
- **Styling UI**: [NES.css](https://nostalgic-css.github.io/NES.css/)
- **Bundler**: [Vite](https://vitejs.dev/).
- **External Data**:
  - [Jikan REST API](https://jikan.moe/) (MyAnimeList unofficial API) for Anime.
  - [AniList GraphQL API](https://anilist.co/graphiql) for Manga & Manhwa.
- **AI Integration**: [Ollama](https://ollama.com/) local endpoint (`http://localhost:11434/api/chat`).

## 🚀 Quick Setup

### Prerequisites
1. **Node.js**: v18 or higher.
2. **Ollama**: Installed and running locally on your machine.

### Installation

1. **Clone and Install**
```bash
git clone https://github.com/yourusername/anime-manga-tracker.git
cd anime-manga-tracker
npm install
```

2. **Pull a Local AI Model**
To use the AI Advisor, pull a lightweight logic model (Recommended: LLaMA-3.2 1B for speed).
```bash
ollama pull llama3.2:1b
```

3. **Start the Dev Server**
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser. Ensure your Ollama client is active in the background for the Advisor to connect!
