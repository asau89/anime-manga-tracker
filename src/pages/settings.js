import { getSettings, saveSettings, resetSettings } from '../store/settings.js';
import { exportLibrary, clearLibrary, getLibrary } from '../store/library.js';
import { getAvailableModels } from '../api/ollama.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

export async function renderSettings(root) {
  const settings = getSettings();

  // Fetch available Ollama models
  let models = [];
  try { models = await getAvailableModels(); } catch (_) {}

  const modelOptions = models.length > 0
    ? models.map(m => `<option value="${m}" ${settings.aiModel === m ? 'selected' : ''}>${m}</option>`).join('')
    : `<option value="">No models found — is Ollama running?</option>`;

  root.innerHTML = `
    <div class="mb-4">
      <h2 style="color:var(--pixel-amber);">⚙️ Settings</h2>
      <p style="font-size:8px; color:#555;">Preferences are saved to your browser automatically.</p>
    </div>

    <!-- Profile -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">👤 Profile</p>
      <div class="nes-field" style="margin-bottom:16px;">
        <label style="font-size:9px;">Player Name</label>
        <input type="text" id="setting-username" class="nes-input is-dark" value="${settings.username}" maxlength="20" style="margin-top:8px; font-size:9px;" />
        <p style="font-size:7px; color:#555; margin-top:4px;">Shown on the Dashboard.</p>
      </div>
    </div>

    <!-- AI Advisor -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">🤖 AI Advisor</p>
      <div class="nes-field" style="margin-bottom:12px;">
        <label style="font-size:9px;">Preferred Model</label>
        <div class="nes-select is-dark" style="margin-top:8px;">
          <select id="setting-model">
            <option value="" ${!settings.aiModel ? 'selected' : ''}>Auto (best available)</option>
            ${modelOptions}
          </select>
        </div>
        <p style="font-size:7px; color:#555; margin-top:4px;">Override the auto-detected Ollama model.</p>
      </div>
      <div style="font-size:9px; color:#555; margin-top:8px; line-height:2;">
        Installed models: <span style="color:var(--pixel-green);">${models.length > 0 ? models.join(', ') : 'None found'}</span>
      </div>
    </div>

    <!-- Display -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">🖥️ Display</p>
      <label style="display:flex; align-items:center; gap:12px; cursor:pointer; font-size:9px;">
        <input type="checkbox" class="nes-checkbox is-dark" id="setting-scanlines" ${settings.scanlines ? 'checked' : ''} />
        <span>CRT Scanline Effect</span>
      </label>
      <p style="font-size:7px; color:#555; margin-top:6px; margin-left:24px;">Toggle the green scan-line overlay. Looks sick but can cause eye strain.</p>
    </div>

    <!-- Data Management -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">💾 Data Management</p>
      <p style="font-size:9px; color:#888; margin-bottom:14px; line-height:2;">
        Library: <strong style="color:var(--pixel-green);">${getLibrary().length} titles</strong> stored in browser localStorage.
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button id="btn-export-settings" class="nes-btn" style="font-size:9px;">📥 Export Backup</button>
        <button id="btn-clear-library"   class="nes-btn is-error" style="font-size:9px;">🗑 Clear Library</button>
        <button id="btn-reset-settings"  class="nes-btn" style="font-size:9px;">↩ Reset Preferences</button>
      </div>
    </div>

    <!-- Save button -->
    <div style="display:flex; justify-content:flex-end; margin-top:8px;">
      <button id="btn-save-settings" class="nes-btn is-success" style="font-size:10px;">💾 Save Settings</button>
    </div>
  `;

  // ── Save settings ──────────────────────────────────────────────
  document.getElementById('btn-save-settings').onclick = () => {
    const username = document.getElementById('setting-username').value.trim() || 'Player 1';
    const aiModel  = document.getElementById('setting-model').value || null;
    const scanlines = document.getElementById('setting-scanlines').checked;

    saveSettings({ username, aiModel, scanlines });

    // Apply scanlines immediately
    document.querySelector('.scanlines').style.display = scanlines ? 'block' : 'none';

    showToast('Settings saved!', 'success');
  };

  // ── Export ────────────────────────────────────────────────────
  document.getElementById('btn-export-settings').onclick = () => {
    exportLibrary();
    showToast('Backup exported!', 'success');
  };

  // ── Clear library ─────────────────────────────────────────────
  document.getElementById('btn-clear-library').onclick = () => {
    showModal(
      '⚠️ Clear Library',
      `<p style="font-size:10px; line-height:2; color:#ff4444;">
        This will permanently delete all <strong>${getLibrary().length}</strong> titles from your library.<br/>
        This cannot be undone! Consider exporting a backup first.
      </p>`,
      () => {
        clearLibrary();
        showToast('Library cleared.', 'error');
        renderSettings(root);
      },
      { confirmText: 'YES, DELETE ALL', cancelText: 'Cancel' }
    );
  };

  // ── Reset preferences ─────────────────────────────────────────
  document.getElementById('btn-reset-settings').onclick = () => {
    resetSettings();
    showToast('Preferences reset to defaults.', 'success');
    renderSettings(root);
  };

  // ── Apply existing scanlines setting ──────────────────────────
  const scanlinesEl = document.querySelector('.scanlines');
  if (scanlinesEl) scanlinesEl.style.display = settings.scanlines ? 'block' : 'none';
}
