const BASE_URL = 'http://localhost:11434/api';

// Cache the discovered model name so we don't fetch it on every message
let cachedModel = null;

export async function checkConnection() {
  try {
    const res = await fetch(`${BASE_URL}/tags`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function getAvailableModels() {
  try {
    const res = await fetch(`${BASE_URL}/tags`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.models.map(m => m.name);
  } catch (e) {
    return [];
  }
}

/**
 * Returns the best available model name, caching the result so
 * we don't hit the API on every single chat message.
 */
export async function getModelName() {
  if (cachedModel) return cachedModel;
  const models = await getAvailableModels();
  if (models.length === 0) {
    throw new Error('No Ollama models found. Please run "ollama pull qwen2.5:1.5b" in your terminal.');
  }
  // Use llama3.2:latest as the primary model, fall back if not installed
  cachedModel =
    models.find(m => m === 'llama3.2:latest') ||
    models.find(m => m.startsWith('llama3.2')) ||
    models.find(m => m.includes('llama')) ||
    models.find(m => m.includes('qwen')) ||
    models[0];
  return cachedModel;
}

/**
 * Warm-up: sends a 1-token request so Ollama loads the model into GPU/RAM
 * BEFORE the user actually types their first message. Fire-and-forget.
 */
export async function warmUpModel() {
  try {
    const model = await getModelName();
    await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
        keep_alive: '30m',      // Keep model in memory for 30 minutes
        options: { num_predict: 1 }  // Only generate 1 token — instant
      })
    });
    console.log(`[Ollama] Model "${model}" pre-loaded into memory.`);
  } catch (e) {
    // Best-effort — silently fail, the real request will still work
  }
}

const SYSTEM_PROMPT = `You are a retro-styled AI Anime/Manga Advisor NPC inside the 'AnimeTracker OS'. Your primary goal is to be the ultimate otaku recommender. Follow these strict rules:
1. Act like a helpful, slightly nerdy 8-bit RPG merchant who specializes in anime and manga.
2. ALWAYS provide the Title, a brief 1-2 sentence pitch, and EXACTLY WHY they would like it based on their library.
3. If the user provides Library Context, analyze their highest-rated shows to justify recommendations (e.g., "Since you rated Death Note a 10/10, you might enjoy...").
4. Keep responses punchy and concise. Use bullet points and relevant emojis (📺, 📖, ⚔️) to format your output cleanly.
5. Do NOT hallucinate or make up fake anime. If you are unsure, say your "memory crystal is cloudy" and ask for clarification.`;

export async function chatWithAdvisor(message, history = [], context = null) {
  const model = await getModelName();

  const systemContent = context
    ? `${SYSTEM_PROMPT}\n\nCONTEXT:\n${context}`
    : SYSTEM_PROMPT;

  // Cap history to last 4 messages (2 turns) to prevent token explosion
  const trimmedHistory = history.slice(-4);

  const messages = [
    { role: 'system', content: systemContent },
    ...trimmedHistory,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        keep_alive: '30m',   // Keep hot for the entire session
        options: {
          num_ctx: 2048,     // Smaller context window = faster processing
          num_predict: 400,  // Cap output length (prevents runaway generation)
          temperature: 0.7,  // Standard creativity
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      })
    });

    if (!response.ok) throw new Error('Ollama API error. Is the model installed?');
    return response.body.getReader();
  } catch (error) {
    console.error('Ollama Error:', error);
    throw error;
  }
}
