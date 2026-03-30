import { chatWithAdvisor, checkConnection } from '../api/ollama.js';
import { getLibrary } from '../store/library.js';
import { searchAnime } from '../api/jikan.js';

export async function renderAiAdvisor(root) {
  root.innerHTML = `
    <div class="mb-4">
      <h2 style="color: var(--pixel-green);">AI Advisor</h2>
      <p style="font-size:9px; color:#aaa;">Powered by local Qwen via Ollama. Ask me anything about anime!</p>
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

  const connected = await checkConnection();

  if (connected) {
    statusBar.innerHTML = '<p style="margin:0; color: var(--pixel-green);">✅ STATUS: ONLINE — Qwen node connected.</p>';
    appendMessage('Advisor', 'Greetings, Player 1! I can see your library. Ask me what to watch, or pick a quick prompt below.', 'var(--pixel-green)');
    chatInput.disabled = false;
    chatBtn.disabled = false;
  } else {
    statusBar.innerHTML = '<p style="margin:0; color: #ff4444;">❌ STATUS: OFFLINE — Cannot reach Ollama at localhost:11434. Start Ollama and run your Qwen model.</p>';
    appendMessage('System', 'Connection failed. Please run: ollama run qwen:3.5-9b\nThen reload this page.', '#ff4444');
    return;
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

    // --- API-Driven RAG ---
    let jikanContext = '';
    try {
      // Extract potential anime name from prompt keywords
      const keywords = text.replace(/recommend|watch|anime|manga|similar to|like|what|should|I|next|me|a|an|the/gi, '').trim();
      if (keywords.length > 2) {
        const searchRes = await searchAnime(keywords);
        if (searchRes?.data?.length > 0) {
          const top3 = searchRes.data.slice(0, 3);
          jikanContext = '--- RELEVANT JIKAN DATA ---\n' +
            top3.map(a =>
              `Title: ${a.title_english || a.title}\nScore: ${a.score}\nGenres: ${(a.genres || []).map(g => g.name).join(', ')}\nSynopsis: ${(a.synopsis || '').substring(0, 400)}...`
            ).join('\n\n');
        }
      }
    } catch (e) {
      // RAG is best-effort, don't fail on it
    }

    // For 3-5 second response times on heavy 9B models, the prompt must be incredibly tiny.
    const library = getLibrary();
    // Only send the Absolute Top 5 highest rated shows to keep token processing under 200 tokens.
    const topLibrary = [...library]
      .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
      .slice(0, 5);

    const libSummary = topLibrary.length > 0
      ? topLibrary.map(i => `${i.title} [${i.user_status}] Rating:${i.user_rating}/10`).join(', ')
      : 'Empty library.';

    const fullContext = `--- USER TOP 5 LIBRARY CONTEXT ---\n${libSummary}\n\n${jikanContext}`;

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
            if (json.error) {
              throw new Error(json.error);
            }
            if (json.message?.content) {
              // Now we have actual text, stop the timer and clear the thinking message once
              if (!hasStartedStreaming) {
                hasStartedStreaming = true;
                clearInterval(thinkingTimer);
                thinkingNode.textContent = '';
              }
              fullResponse += json.message.content;
              
              // Basic retro Markdown formatting
              let formatted = fullResponse
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--pixel-yellow);">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\s*-\s/g, '<br/>• ');
                
              thinkingNode.innerHTML = formatted;
              chatBox.scrollTop = chatBox.scrollHeight;
            }
          } catch (err) { 
            // Only throw if it's an API-level error JSON, ignore JSON parse chunk errors
            if (json && err.message === json.error) throw err;
          }
        }
      }

      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: fullResponse });

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
