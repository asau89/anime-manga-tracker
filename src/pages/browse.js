import { searchAnime, getTopAnime, getSeasonNow, getAnimeById } from '../api/jikan.js';
import { searchMangaAL, getTopMangaAL, getTopManhwaAL, getMangaByIdAL } from '../api/anilist.js';
import { createAnimeCard } from '../components/anime-card.js';
import { addToLibrary, isInLibrary } from '../store/library.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';

let currentMode = 'anime'; // 'anime' | 'manga'
let currentPage = 1;
let currentLoader = null; // stores the current data-loading function for Load More

export async function renderBrowse(root) {
  root.innerHTML = `
    <div class="mb-4">
      <h2 style="color: var(--pixel-cyan);">Browse</h2>

      <!-- Anime / Manga mode toggle -->
      <div style="display:flex; gap:10px; margin-top:14px; margin-bottom:18px;">
        <button id="mode-anime" class="nes-btn is-primary" style="font-size:10px;">🎬 Anime</button>
        <button id="mode-manga" class="nes-btn" style="font-size:10px;">📖 Manga</button>
      </div>

      <div style="display:flex; gap: 10px; margin-bottom:12px;">
        <input type="text" id="search-input" class="nes-input is-dark" placeholder="Search anime title..." style="flex-grow: 1;" />
        <button id="search-btn" class="nes-btn is-primary">Search</button>
      </div>
      <div id="quick-tabs" style="display:flex; gap: 10px; flex-wrap: wrap;"></div>
    </div>
    <div id="results-container">
      <p>Loading...</p>
    </div>
  `;

  const resultsContainer = document.getElementById('results-container');
  const searchInput      = document.getElementById('search-input');
  const quickTabs        = document.getElementById('quick-tabs');

  // ── Helpers ───────────────────────────────────────────────────
  const setModeUI = (mode) => {
    currentMode = mode;
    document.getElementById('mode-anime').className = `nes-btn ${mode === 'anime' ? 'is-primary' : ''}`;
    document.getElementById('mode-manga').className = `nes-btn ${mode === 'manga' ? 'is-primary' : ''}`;
    searchInput.placeholder = mode === 'anime'
      ? 'Search anime title...'
      : 'Search manga/manhwa title...';
    buildQuickTabs(mode);
  };

  const addTab = (label, fn) => {
    const btn = document.createElement('button');
    btn.className = 'nes-btn';
    btn.style.fontSize = '9px';
    btn.textContent = label;
    btn._loadFn = fn;
    btn.onclick = () => {
      quickTabs.querySelectorAll('button').forEach(b => b.classList.remove('is-success'));
      btn.classList.add('is-success');
      fn();
    };
    quickTabs.appendChild(btn);
    return btn;
  };

  const buildQuickTabs = (mode) => {
    quickTabs.innerHTML = '';
    if (mode === 'anime') {
      addTab('▶ This Season', loadSeasonal);
      addTab('🏆 Top Anime', loadTopAnime);
    } else {
      addTab('🏆 Top Manga', loadTopManga);
      addTab('📰 Top Manhwa', loadTopManhwa);
    }
  };

  // ── Render card grid (append mode for pagination) ─────────────
  const renderItems = (items, mediaType = 'anime', append = false) => {
    if (!append) resultsContainer.innerHTML = '';

    // Remove existing Load More button if re-rendering
    document.getElementById('load-more-btn')?.remove();

    if (!items || items.length === 0) {
      if (!append) resultsContainer.innerHTML = '<p style="font-size:10px;">No results found.</p>';
      return;
    }

    let grid = resultsContainer.querySelector('.card-grid');
    if (!grid || !append) {
      grid = document.createElement('div');
      grid.className = 'card-grid';
      resultsContainer.appendChild(grid);
    }

    items.forEach(item => {
      item.media_type = mediaType;
      const inLib = isInLibrary(item.mal_id, mediaType);
      const card = createAnimeCard(
        item,
        () => showDetails(item, mediaType),
        inLib ? null : (i) => promptAddToLibrary(i, mediaType),
        false
      );
      if (inLib) {
        const badge = document.createElement('div');
        badge.style.cssText = 'position:absolute;top:6px;right:6px;background:#006600;color:#fff;font-size:7px;padding:3px 6px;border:2px solid #00ff41;';
        badge.textContent = '✓ SAVED';
        card.appendChild(badge);
      }
      grid.appendChild(card);
    });

    // Add Load More button after the grid if we got a full page
    if (items.length >= 20 && currentLoader) {
      const lmBtn = document.createElement('button');
      lmBtn.id = 'load-more-btn';
      lmBtn.className = 'nes-btn is-primary';
      lmBtn.style.cssText = 'display:block; margin:20px auto 0; font-size:10px;';
      lmBtn.textContent = '▼ Load More';
      lmBtn.onclick = () => {
        currentPage++;
        currentLoader(true);
      };
      resultsContainer.appendChild(lmBtn);
    }
  };

  // ── Data loaders ──────────────────────────────────────────────
  const showError = (msg) => {
    resultsContainer.innerHTML = `<p class="nes-text is-error" style="font-size:10px;">${msg}</p>`;
  };

  const loadSeasonal = async (append = false) => {
    currentLoader = loadSeasonal;
    if (!append) { currentPage = 1; resultsContainer.innerHTML = '<p style="font-size:10px;">Loading seasonal anime...</p>'; }
    try { renderItems((await getSeasonNow()).data, 'anime', append); }
    catch { showError('Failed to load seasonal anime.'); }
  };

  const loadTopAnime = async (append = false) => {
    currentLoader = loadTopAnime;
    if (!append) { currentPage = 1; resultsContainer.innerHTML = '<p style="font-size:10px;">Loading top anime...</p>'; }
    try { renderItems((await getTopAnime(currentPage)).data, 'anime', append); }
    catch { showError('Failed to load top anime.'); }
  };

  const loadTopManga = async (append = false) => {
    currentLoader = loadTopManga;
    if (!append) { currentPage = 1; resultsContainer.innerHTML = '<p style="font-size:10px;">Loading top manga via AniList...</p>'; }
    try { renderItems((await getTopMangaAL(currentPage)).data, 'manga', append); }
    catch (e) { showError(`Failed to load top manga. (${e.message})`); }
  };

  const loadTopManhwa = async (append = false) => {
    currentLoader = loadTopManhwa;
    if (!append) { currentPage = 1; resultsContainer.innerHTML = '<p style="font-size:10px;">Loading top manhwa via AniList...</p>'; }
    try { renderItems((await getTopManhwaAL(currentPage)).data, 'manga', append); }
    catch (e) { showError(`Failed to load top manhwa. (${e.message})`); }
  };

  const doSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    currentPage = 1;
    currentLoader = null;
    resultsContainer.innerHTML = `<p style="font-size:10px;">Searching via ${currentMode === 'manga' ? 'AniList' : 'Jikan'}...</p>`;
    quickTabs.querySelectorAll('button').forEach(b => b.classList.remove('is-success'));
    try {
      if (currentMode === 'anime') {
        renderItems((await searchAnime(query)).data, 'anime');
      } else {
        renderItems((await searchMangaAL(query)).data, 'manga');
      }
    } catch (e) {
      showError(`Search failed: ${e.message}`);
    }
  };

  // ── Events ────────────────────────────────────────────────────
  document.getElementById('search-btn').onclick = doSearch;
  searchInput.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };

  document.getElementById('mode-anime').onclick = () => {
    setModeUI('anime');
    const first = quickTabs.querySelector('button');
    if (first) { first.classList.add('is-success'); first._loadFn(); }
  };

  document.getElementById('mode-manga').onclick = () => {
    setModeUI('manga');
    const first = quickTabs.querySelector('button');
    if (first) { first.classList.add('is-success'); first._loadFn(); }
  };

  // ── Initial load ──────────────────────────────────────────────
  setModeUI('anime');
  const firstTab = quickTabs.querySelector('button');
  if (firstTab) { firstTab.classList.add('is-success'); firstTab._loadFn(); }
}

// ── Detail modal ─────────────────────────────────────────────────
async function showDetails(item, mediaType) {
  const image  = item.image_url || item.images?.webp?.image_url || '';
  const inLib  = isInLibrary(item.mal_id, mediaType);
  const isAnime = mediaType === 'anime';

  // Fetch full details if synopsis is missing
  let fullItem = item;
  if (!item.synopsis || item.synopsis === 'No synopsis available.') {
    try {
      if (isAnime) {
        const res = await getAnimeById(item.mal_id);
        fullItem = res.data || item;
      } else {
        const res = await getMangaByIdAL(item.mal_id);
        fullItem = res.data || item;
      }
    } catch (_) {}
  }

  const addBtnHtml = inLib
    ? `<p style="font-size:9px; color:var(--pixel-green); margin-top:10px;">✓ Already in your library</p>`
    : `<button id="detail-add-btn" class="nes-btn is-success" style="margin-top:12px; font-size:9px;">+ Add to Library</button>`;

  const countLabel = isAnime ? 'Episodes' : 'Chapters';
  const countValue = isAnime ? (fullItem.episodes || '?') : (fullItem.chapters || '?');
  const sourceLabel = isAnime ? 'Jikan / MAL' : 'AniList';

  const authorsHtml = !isAnime && (fullItem.authors || []).length > 0
    ? `<p><strong>Authors:</strong> ${fullItem.authors.map(a => a.name || a).join(', ')}</p>`
    : '';

  const html = `
    <div style="font-size:8px; color:#555; margin-bottom:10px;">Source: ${sourceLabel}</div>
    <div style="display:flex; gap: 18px; flex-wrap: wrap;">
      <div style="flex: 0 0 160px;">
        <img src="${image}" style="width: 100%; border: 4px solid white;" loading="lazy" />
      </div>
      <div style="flex: 1; min-width: 200px; font-size: 10px; line-height: 2.2;">
        <p><strong>Type:</strong> ${fullItem.type || (isAnime ? 'TV' : 'Manga')}</p>
        <p><strong>${countLabel}:</strong> ${countValue}</p>
        <p><strong>Score:</strong> ${fullItem.score || 'N/A'}</p>
        <p><strong>Status:</strong> ${fullItem.status || 'Unknown'}</p>
        ${isAnime
          ? `<p><strong>Aired:</strong> ${fullItem.aired?.string || fullItem.year || 'Unknown'}</p>`
          : `<p><strong>Year:</strong> ${fullItem.year || 'Unknown'}</p>`}
        ${authorsHtml}
        <p><strong>Genres:</strong> ${(fullItem.genres || []).map(g => g.name ?? g).join(', ') || 'N/A'}</p>
        ${addBtnHtml}
      </div>
    </div>
    <div style="margin-top: 15px; border: 2px solid #555; padding: 10px; max-height: 180px; overflow-y: auto; font-size: 10px; line-height: 1.8;">
      ${fullItem.synopsis || 'No synopsis available.'}
    </div>
  `;

  showModal(fullItem.title_english || fullItem.title, html, null, { hideCancel: false, cancelText: 'Close' });

  setTimeout(() => {
    document.getElementById('detail-add-btn')?.addEventListener('click', () => {
      document.getElementById('modal-container').style.display = 'none';
      promptAddToLibrary(fullItem, mediaType);
    });
  }, 50);
}

// ── Add to Library modal ──────────────────────────────────────────
function promptAddToLibrary(item, mediaType) {
  const title   = item.title_english || item.title;
  const isAnime = mediaType === 'anime';

  const html = `
    <div style="font-size:10px;">
      <p style="margin-bottom:15px;">
        Adding <span style="color:var(--pixel-cyan);">${isAnime ? '🎬 Anime' : '📖 Manga'}</span>:
        <strong>${title}</strong>
      </p>
      <div class="nes-field">
        <label for="status_select">Set Status</label>
        <div class="nes-select is-dark" style="margin-top: 8px;">
          <select id="status_select">
            <option value="plan_to_watch" selected>${isAnime ? 'Plan to Watch' : 'Plan to Read'}</option>
            <option value="watching">${isAnime ? 'Watching' : 'Reading'}</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>
    </div>
  `;

  showModal(`Add to Library`, html, () => {
    const userStatus = document.getElementById('status_select').value;
    addToLibrary({ ...item, media_type: mediaType }, userStatus);
    showToast(`"${title}" added to library!`, 'success');
  }, { confirmText: 'Add', cancelText: 'Cancel' });
}
