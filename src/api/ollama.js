const BASE_URL = 'http://localhost:11434/api';

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

export async function chatWithAdvisor(message, history = [], jikanContext = null) {
  const models = await getAvailableModels();
  if (models.length === 0) {
    throw new Error('No Ollama models found installed. Please run "ollama pull qwen:0.5b" (or another model) in your terminal.');
  }
  
  // Try to find a qwen model, otherwise use the first one available
  const modelToUse = models.find(m => m.includes('qwen')) || models[0];

  let systemPrompt = `You are a retro-styled AI Anime/Manga Advisor NPC inside the 'AnimeTracker OS'. 
Your primary goal is to be the ultimate otaku recommender. Follow these strict rules:
1. Act like a helpful, slightly nerdy 8-bit RPG merchant who specializes in anime and manga.
2. ALWAYS provide the Title, a brief 1-2 sentence pitch, and EXACTLY WHY they would like it.
3. If the user provides their Library Context, you MUST analyze their highest-rated shows and use them to justify your recommendations (e.g., "Since you rated Death Note a 10/10, you might enjoy...").
4. Keep responses punchy and concise. Use bullet points and relevant emojis (📺, 📖, ⚔️) to format your output cleanly.
5. Do NOT hallucinate or make up fake anime. If you are unsure, say your "memory crystal is cloudy" and ask for clarification.`;
  
  if (jikanContext) {
    systemPrompt += `\n\nBACKGROUND CONTEXT (Real data from Jikan API, use this to answer the user):\n${jikanContext}`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        messages: messages,
        stream: true
      })
    });
    
    if (!response.ok) throw new Error('Ollama API error. Is the model installed?');
    return response.body.getReader();
  } catch (error) {
    console.error('Ollama Error:', error);
    throw error;
  }
}
