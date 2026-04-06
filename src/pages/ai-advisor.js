import { chatWithAdvisor, checkConnection, warmUpModel, getModelName } from '../api/ollama.js';
import { getLibrary } from '../store/library.js';
import { searchAnime } from '../api/jikan.js';

export async function renderAiAdvisor(root) {
  root.innerHTML = `
    <div class="mb-4">
      <h2 style="color: var(--pixel-green);">AI Advisor</h2>
      <p style="font-size:9px; color:#aaa;">Powered by local LLM via Ollama. Ask me anything about anime!</p>
    </div>

    <div id="status-bar" class="nes-container is-dark mb-4" style="font-size:9px; padding:10px 15px;">
      <p style="margin:0;">⏳ Connecting to Ollama at localhost:11434...</p>
    </div>

    <div id="chat-box" class="ai-terminal">
      <!-- Messages injected here -->
    </div>

    <div style="display:flex; gap:10px; margin-top:10px;">
      <input type="text" id="chat-input" class="nes-input is-dark" placeholder="Ask me anything, e.g. 'I like One Piece, what next?'" style="flex-grow:1; font-size:9px;" disabled />
      <button id="chat-send" class="nes-btn is-primary" style="font-size:10px; white-space:nowrap;" disabled>Send ▶</button>
    </div>

    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
      <p style="font-size:9px; color:#888; width:100%; margin:0 0 5px;">Quick prompts:</p>
      <button class="nes-btn preset-btn" style="font-size:8px;" data-prompt="Recommend me anime based on my library history.">📚 Based on Library</button>
      <button class="nes-btn preset-btn" style="font-size:8px;" data-prompt="What is a great dark psychological anime I should watch?">🌑 Dark &amp; Psychological</button>
      <button class="nes-btn preset-btn" style="font-size:8px;" data-prompt="Recommend a feel-good comedy anime for a relaxing evening.">😂 Feel-Good Comedy</button>
      <button class="nes-btn preset-btn" style="font-size:8px;" data-prompt="What is the best action anime with great fight scenes?">⚔️ Action-Packed</button>
    </div>
  `;

  const chatBox = document.getElementById('chat-box');
  const chatInput = document.getElementById('chat-input');
  const chatBtn = document.getElementById('chat-send');
  const statusBar = document.getElementById('status-bar');

  let history = [];
  let isThinking = false;

  function appendMessage(sender, text, color = '#e0e0e0') {
    const msg = document.createElement('div');
    msg.style.cssText = 'margin-bottom: 12px; border-bottom: 1px dashed #333; padding-bottom: 10px;';
    msg.innerHTML = `<span style="color:${color}; font-size:9px;">[${sender}]</span><br/><span class="msg-content" style="font-size:9px; line-height:1.8; white-space:pre-wrap;"></span>`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    const contentSpan = msg.querySelector('.msg-content');
    contentSpan.textContent = text;
    return contentSpan;
  }

  // --- Check connection ---
  const connected = await checkConnection();

  if (!connected) {
    statusBar.innerHTML = '<p style="margin:0; color: #ff4444;">❌ STATUS: OFFLINE — Cannot reach Ollama at localhost:11434. Start Ollama first.</p>';
    appendMessage('System', 'Connection failed. Please start Ollama and refresh the page.', '#ff4444');
    return;
  }

  // Get model name and start warm-up simultaneously — don't block the UI
  const [modelName] = await Promise.all([
    getModelName().catch(() => 'unknown'),
    warmUpModel()   // fire-and-forget, runs in background
  ]);

  statusBar.innerHTML = `<p style="margin:0; color: var(--pixel-green);">✅ STATUS: ONLINE — Model: <strong style="color:var(--pixel-yellow);">${modelName}</strong> — Warming up, first reply may be slightly slower.</p>`;
  appendMessage('Advisor', 'Greetings, Player 1! My neural circuits are warming up. Ask me what to watch, or pick a quick prompt below.', 'var(--pixel-green)');
  chatInput.disabled = false;
  chatBtn.disabled = false;

  // Helper: build a tiny library summary string
  function buildLibrarySummary() {
    const library = getLibrary();
    const top5 = [...library]
      .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
      .slice(0, 5);
    return top5.length > 0
      ? top5.map(i => `${i.title}[${i.user_status}]${i.user_rating}/10`).join(', ')
      : 'empty';
  }

  // Helper: fetch Jikan context with a hard timeout so it never blocks the LLM call
  async function fetchJikanContext(text) {
    try {
      // Strip common stop words to get meaningful keywords
      const keywords = text
        .replace(/\b(recommend|watch|anime|manga|similar|like|what|should|i|next|me|a|an|the|is|are|for|my|give|some|any|good|great|best)\b/gi, '')
        .trim();
      if (keywords.length < 3) return '';

      // Race the Jikan search against a 2-second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 2000)
      );
      const searchPromise = searchAnime(keywords);
      const searchRes = await Promise.race([searchPromise, timeoutPromise]);

      if (!searchRes?.data?.length) return '';
      const top3 = searchRes.data.slice(0, 3);
      return '--- JIKAN DATA ---\n' +
        top3.map(a =>
          `${a.title_english || a.title} | Score:${a.score} | ${(a.genres || []).map(g => g.name).join('/')} | ${(a.synopsis || '').substring(0, 200)}`
        ).join('\n');
    } catch {
      return ''; // Jikan is always best-effort
    }
  }

  async function handleSend(overrideText = null) {
    if (isThinking) return;

    const text = overrideText || chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage('Player 1', text, 'var(--pixel-cyan)');

    isThinking = true;
    chatBtn.textContent = '...';
    chatBtn.classList.remove('is-primary');
    chatInput.disabled = true;

    const thinkingNode = appendMessage('Advisor', 'Agent is thinking... [0s]', '#888');
    let elapsedSeconds = 0;
    let hasStartedStreaming = false;
    const thinkingTimer = setInterval(() => {
      if (!hasStartedStreaming) {
        elapsedSeconds++;
        thinkingNode.textContent = `Agent is thinking... [${elapsedSeconds}s]`;
      }
    }, 1000);

    // --- Build context in parallel with (not before) the LLM setup ---
    // Jikan search runs concurrently; we cap it at 2s so it never delays Ollama
    const jikanPromise = fetchJikanContext(text);
    const libSummary = buildLibrarySummary();

    // Wait for Jikan (already capped at 2s), then fire LLM
    const jikanContext = await jikanPromise;
    const fullContext = `--- USER TOP 5 LIBRARY ---\n${libSummary}\n\n${jikanContext}`.trim();

    try {
      const reader = await chatWithAdvisor(text, history, fullContext);
      const decoder = new TextDecoder('utf-8');
      let fullResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          let json;
          try {
            json = JSON.parse(line);
            if (json.error) throw new Error(json.error);
            if (json.message?.content) {
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                clearInterval(thinkingTimer);
                thinkingNode.textContent = '';
              }
              fullResponse += json.message.content;

              // Retro markdown formatting
              const formatted = fullResponse
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--pixel-yellow);">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\s*-\s/g, '<br/>• ');

              thinkingNode.innerHTML = formatted;
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          } catch (err) {
            if (json && err.message === json.error) throw err;
          }
        }
      }

      // Only keep last 4 messages in history (prevents token explosion)
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: fullResponse });
      if (history.length > 8) history = history.slice(-8);

    } catch (e) {
      clearInterval(thinkingTimer);
      thinkingNode.textContent = `Error: ${e.message || 'Could not reach Ollama. Is the model running?'}`;
      thinkingNode.style.color = '#ff4444';
    }

    isThinking = false;
    chatBtn.textContent = 'Send ▶';
    chatBtn.classList.add('is-primary');
    chatInput.disabled = false;
    chatInput.focus();
  }

  chatBtn.onclick = () => handleSend();
  chatInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); };

  root.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => handleSend(btn.getAttribute('data-prompt'));
  });
}
