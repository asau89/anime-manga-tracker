import { getLibrary, updateEntry, removeFromLibrary, exportLibrary, importLibrary } from '../store/library.js';
import { createAnimeCard } from '../components/anime-card.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getAnimeEpisodes } from '../api/jikan.js';

export function renderLibrary(root) {
  root.innerHTML = `
    <div class="mb-4">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <h2 style="color: var(--pixel-cyan); margin:0;">My Library</h2>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button id="btn-import" class="nes-btn" style="font-size:9px;">📂 Import</button>
          <button id="btn-export" class="nes-btn" style="font-size:9px;">📥 Export</button>
        </div>
      </div>

      <!-- Anime / Manga switcher -->
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <button id="tab-anime" class="nes-btn is-primary lib-type-tab" data-type="anime" style="font-size:10px;">🎬 Anime</button>
        <button id="tab-manga" class="nes-btn lib-type-tab" data-type="manga" style="font-size:10px;">📖 Manga</button>
      </div>

      <!-- Search + Sort + View toggles row -->
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; align-items:center;">
        <input type="text" id="lib-search" class="nes-input is-dark" placeholder="🔍 Search..." style="flex:1; min-width:160px; font-size:9px;" />
        <select id="lib-sort" class="nes-select is-dark" style="font-size:9px; padding:4px 8px; min-width:160px; background:#0d0d1a; color:#e0e0e0; border:3px solid #fff;">
          <option value="date_desc">📅 Newest First</option>
          <option value="date_asc">📅 Oldest First</option>
          <option value="title_asc">🔤 Title A-Z</option>
          <option value="title_desc">🔤 Title Z-A</option>
          <option value="rating_desc">⭐ Highest Rated</option>
          <option value="rating_asc">⭐ Lowest Rated</option>
          <option value="score_desc">🏅 MAL Score High</option>
        </select>
        <div style="display:flex; gap:4px;">
          <button id="view-grid" class="nes-btn is-primary" style="font-size:9px; padding:4px 10px;" title="Grid view">▦</button>
          <button id="view-list" class="nes-btn" style="font-size:9px; padding:4px 10px;" title="List view">☰</button>
        </div>
      </div>

      <!-- Status filter -->
      <div id="status-filters" style="display:flex; gap: 8px; flex-wrap: wrap;"></div>
    </div>
    <div id="library-container"></div>
    <input type="file" id="import-file-input" accept=".json" style="display:none;" />
  `;

  let currentType   = 'anime';
  let currentFilter = 'all';
  let currentView   = 'grid';   // 'grid' | 'list'
  let searchQuery   = '';
  let sortMode      = 'date_desc';

  const libraryContainer = document.getElementById('library-container');
  const statusFiltersEl  = document.getElementById('status-filters');
  const libSearch        = document.getElementById('lib-search');
  const libSort          = document.getElementById('lib-sort');

  const statusFilters = {
    anime: [
      { value: 'all',           label: 'All' },
      { value: 'watching',      label: 'Watching' },
      { value: 'completed',     label: 'Completed' },
      { value: 'plan_to_watch', label: 'Plan to Watch' },
      { value: 'on_hold',       label: 'On Hold' },
      { value: 'dropped',       label: 'Dropped' },
    ],
    manga: [
      { value: 'all',           label: 'All' },
      { value: 'watching',      label: 'Reading' },
      { value: 'completed',     label: 'Completed' },
      { value: 'plan_to_watch', label: 'Plan to Read' },
      { value: 'on_hold',       label: 'On Hold' },
      { value: 'dropped',       label: 'Dropped' },
    ],
  };

  const buildFilters = (type) => {
    statusFiltersEl.innerHTML = '';
    currentFilter = 'all';
    statusFilters[type].forEach(({ value, label }) => {
      const btn = document.createElement('button');
      btn.className = `nes-btn filter-btn ${value === 'all' ? 'is-primary' : ''}`;
      btn.style.fontSize = '9px';
      btn.textContent = label;
      btn.dataset.filter = value;
      btn.onclick = () => {
        statusFiltersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-primary'));
        btn.classList.add('is-primary');
        currentFilter = value;
        renderItems();
      };
      statusFiltersEl.appendChild(btn);
    });
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      switch (sortMode) {
        case 'date_asc':    return new Date(a.date_added) - new Date(b.date_added);
        case 'date_desc':   return new Date(b.date_added) - new Date(a.date_added);
        case 'title_asc':   return (a.title_english || a.title).localeCompare(b.title_english || b.title);
        case 'title_desc':  return (b.title_english || b.title).localeCompare(a.title_english || a.title);
        case 'rating_desc': return (b.user_rating || 0) - (a.user_rating || 0);
        case 'rating_asc':  return (a.user_rating || 0) - (b.user_rating || 0);
        case 'score_desc':  return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
        default: return 0;
      }
    });
  };

  const renderItems = () => {
    libraryContainer.innerHTML = '';
    const library = getLibrary();

    let items = library.filter(i => i.media_type === currentType);
    if (currentFilter !== 'all') items = items.filter(i => i.user_status === currentFilter);

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.title_english || '').toLowerCase().includes(q)
      );
    }

    items = sortItems(items);

    if (items.length === 0) {
      const label = currentType === 'manga' ? 'manga' : 'anime';
      const statusObj = statusFilters[currentType].find(f => f.value === currentFilter);
      const statusLabel = statusObj ? statusObj.label.toLowerCase() : '';
      libraryContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; font-size: 10px; color: #888;">
          <p>No ${label} found${currentFilter !== 'all' ? ` with status "${statusLabel}"` : ''}${searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
        </div>
      `;
      return;
    }

    if (currentView === 'grid') {
      const grid = document.createElement('div');
      grid.className = 'card-grid';
      items.forEach(item => {
        const onSelect = currentType === 'anime'
          ? () => showManageAnimeModal(item, renderItems)
          : () => showManageMangaModal(item, renderItems);
        grid.appendChild(createAnimeCard(item, onSelect, null, true));
      });
      libraryContainer.appendChild(grid);
    } else {
      // List view
      const list = document.createElement('div');
      list.className = 'lib-list-view';
      items.forEach(item => {
        list.appendChild(createListRow(item, currentType, renderItems));
      });
      libraryContainer.appendChild(list);
    }
  };

  // ── List row ──────────────────────────────────────────────────
  function createListRow(item, type, refresh) {
    const row = document.createElement('div');
    row.className = 'lib-list-row';
    const title    = item.title_english || item.title;
    const progress = type === 'anime'
      ? `${item.episodes_watched || 0} / ${item.episodes || '?'} ep`
      : `${item.chapters_read || 0} / ${item.chapters || '?'} ch`;
    const rating   = item.user_rating > 0 ? `⭐ ${item.user_rating.toFixed(1)}` : '—';
    const statusColors = { watching:'#00d4ff', completed:'#00ff41', plan_to_watch:'#ffb000', on_hold:'#888', dropped:'#ff2244' };
    const badgeColor   = statusColors[item.user_status] || '#fff';
    const favIcon = item.is_favorite ? '⭐' : '';
    row.innerHTML = `
      <img src="${item.image_url}" class="lib-list-thumb" alt="" loading="lazy" />
      <div class="lib-list-title">
        <span style="font-size:9px; color:#e0e0e0;">${favIcon} ${title}</span>
        <span style="font-size:7px; color:#555; display:block; margin-top:3px;">${(item.genres || []).slice(0,3).join(' · ')}</span>
      </div>
      <span class="lib-list-progress">${progress}</span>
      <span class="lib-list-rating">${rating}</span>
      <span class="lib-list-badge" style="color:${badgeColor}; border-color:${badgeColor};">${(item.user_status || '').replace(/_/g,' ').toUpperCase()}</span>
    `;
    row.style.cursor = 'pointer';
    row.onclick = () => type === 'anime'
      ? showManageAnimeModal(item, refresh)
      : showManageMangaModal(item, refresh);
    return row;
  }

  // ── View toggle ───────────────────────────────────────────────
  document.getElementById('view-grid').onclick = () => {
    currentView = 'grid';
    document.getElementById('view-grid').classList.add('is-primary');
    document.getElementById('view-list').classList.remove('is-primary');
    renderItems();
  };
  document.getElementById('view-list').onclick = () => {
    currentView = 'list';
    document.getElementById('view-list').classList.add('is-primary');
    document.getElementById('view-grid').classList.remove('is-primary');
    renderItems();
  };

  // ── Search ────────────────────────────────────────────────────
  libSearch.oninput = () => { searchQuery = libSearch.value.trim(); renderItems(); };

  // ── Sort ──────────────────────────────────────────────────────
  libSort.onchange = () => { sortMode = libSort.value; renderItems(); };

  // ── Type tabs ─────────────────────────────────────────────────
  root.querySelectorAll('.lib-type-tab').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.lib-type-tab').forEach(b => b.classList.remove('is-primary'));
      btn.classList.add('is-primary');
      currentType = btn.dataset.type;
      searchQuery = '';
      libSearch.value = '';
      buildFilters(currentType);
      renderItems();
    };
  });

  // ── Export ────────────────────────────────────────────────────
  document.getElementById('btn-export').onclick = () => {
    exportLibrary();
    showToast('Library exported!', 'success');
  };

  // ── Import ────────────────────────────────────────────────────
  document.getElementById('btn-import').onclick = () => {
    showModal(
      '📂 Import Library',
      `<div style="font-size:10px; line-height:2;">
        <p style="margin-bottom:14px;">Import a previously exported <strong>AniMind JSON backup</strong>.</p>
        <div class="nes-field" style="margin-bottom:14px;">
          <label>Import Mode</label>
          <div class="nes-select is-dark" style="margin-top:8px;">
            <select id="import-mode">
              <option value="merge" selected>Merge (keep existing, add new)</option>
              <option value="replace">Replace (overwrite everything)</option>
            </select>
          </div>
        </div>
        <p style="font-size:8px; color:#ff4444;">⚠️ Replace mode will erase your current library!</p>
      </div>`,
      () => {
        const mode = document.getElementById('import-mode')?.value || 'merge';
        const fileInput = document.getElementById('import-file-input');
        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            try {
              const count = importLibrary(ev.target.result, mode);
              showToast(mode === 'replace'
                ? `Library replaced! ${count} titles loaded.`
                : `Merged! ${count} new titles added.`, 'success');
              renderItems();
            } catch {
              showToast('Import failed. Invalid file.', 'error');
            }
          };
          reader.readAsText(file);
        };
        fileInput.click();
      },
      { confirmText: 'Choose File', cancelText: 'Cancel' }
    );
  };

  buildFilters('anime');
  renderItems();
}

// ══════════════════════════════════════════════════════════════════
//  ANIME manage modal
// ══════════════════════════════════════════════════════════════════
function showManageAnimeModal(item, refreshCallback) {
  const title    = item.title_english || item.title;
  const totalEps = item.episodes || '?';
  const favLabel = item.is_favorite ? '★ Unfavorite' : '☆ Favorite';

  const html = `
    <div style="display:flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
      <img src="${item.image_url}" style="width:130px; height:185px; object-fit:cover; border: 4px solid white; flex-shrink:0;" />
      <div style="flex:1; font-size:10px; line-height:2.2;">
        <p><strong>Type:</strong> ${item.type || 'TV'}</p>
        <p><strong>Episodes:</strong> ${totalEps}</p>
        <p><strong>Score (MAL):</strong> ${item.score || 'N/A'}</p>
        <p><strong>Genres:</strong> ${(item.genres || []).join(', ') || 'N/A'}</p>
        <p><strong>Progress:</strong> <span style="color:var(--pixel-green);">${item.episodes_watched || 0}</span> / ${totalEps} eps</p>
      </div>
    </div>

    <div class="nes-field" style="margin-bottom:15px;">
      <label>Your Status</label>
      <div class="nes-select is-dark" style="margin-top:8px;">
        <select id="edit_status">
          <option value="plan_to_watch" ${item.user_status === 'plan_to_watch' ? 'selected' : ''}>Plan to Watch</option>
          <option value="watching"      ${item.user_status === 'watching'      ? 'selected' : ''}>Watching</option>
          <option value="completed"     ${item.user_status === 'completed'     ? 'selected' : ''}>Completed</option>
          <option value="on_hold"       ${item.user_status === 'on_hold'       ? 'selected' : ''}>On Hold</option>
          <option value="dropped"       ${item.user_status === 'dropped'       ? 'selected' : ''}>Dropped</option>
        </select>
      </div>
    </div>

    <div class="nes-field" style="margin-bottom:15px;">
      <label>Your Rating (0.0–10.0)</label>
      <input type="number" id="edit_rating" class="nes-input is-dark" value="${(item.user_rating || 0).toFixed(1)}" step="0.1" min="0" max="10" style="margin-top:8px;" />
    </div>

    <div class="nes-field" style="margin-bottom:20px;">
      <label>Notes</label>
      <textarea id="edit_notes" class="nes-textarea is-dark" rows="2" style="margin-top:8px; font-size:10px;">${item.notes || ''}</textarea>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button id="btn-ep-tracker"  class="nes-btn is-warning" style="font-size:10px;">📺 Episode Tracker</button>
      <button id="btn-fav-toggle"  class="nes-btn ${item.is_favorite ? 'is-primary' : ''}" style="font-size:10px;">${favLabel}</button>
      <button id="btn-delete"      class="nes-btn is-error"   style="font-size:10px;">🗑 Remove</button>
    </div>
  `;

  showModal(`Manage: ${title}`, html, () => {
    const newStatus = document.getElementById('edit_status')?.value;
    const newRating = parseFloat(document.getElementById('edit_rating')?.value) || 0;
    const newNotes  = document.getElementById('edit_notes')?.value || '';

    const updates = {
      user_status: newStatus,
      user_rating: isNaN(newRating) ? 0 : Math.round(Math.min(10, Math.max(0, newRating)) * 10) / 10,
      notes: newNotes,
    };

    if (newStatus === 'completed' && item.episodes) {
      updates.episodes_watched      = item.episodes;
      updates.watched_episodes_list = Array.from({ length: item.episodes }, (_, i) => i + 1);
    }

    updateEntry(item.mal_id, item.media_type, updates);
    showToast('Entry saved!', 'success');
    refreshCallback();
  }, { confirmText: 'Save', cancelText: 'Cancel' });

  setTimeout(() => {
    document.getElementById('btn-ep-tracker')?.addEventListener('click', () => {
      document.getElementById('modal-container').style.display = 'none';
      openEpisodeTracker(item, refreshCallback);
    });
    document.getElementById('btn-fav-toggle')?.addEventListener('click', () => {
      updateEntry(item.mal_id, item.media_type, { is_favorite: !item.is_favorite });
      showToast(item.is_favorite ? 'Removed from favorites.' : '⭐ Added to favorites!', 'success');
      item.is_favorite = !item.is_favorite;
      document.getElementById('modal-container').style.display = 'none';
      refreshCallback();
    });
    document.getElementById('btn-delete')?.addEventListener('click', () => {
      showModal(
        'Confirm Remove',
        `<p style="font-size:10px;">Remove "<strong>${title}</strong>" from your library?</p>`,
        () => {
          removeFromLibrary(item.mal_id, item.media_type);
          showToast('Removed from library.', 'error');
          refreshCallback();
        },
        { confirmText: 'Yes, Remove', cancelText: 'Cancel' }
      );
    });
  }, 80);
}

// ══════════════════════════════════════════════════════════════════
//  MANGA manage modal
// ══════════════════════════════════════════════════════════════════
function showManageMangaModal(item, refreshCallback) {
  const title      = item.title_english || item.title;
  const totalChaps = item.chapters  || '?';
  const totalVols  = item.volumes   || '?';
  const favLabel   = item.is_favorite ? '★ Unfavorite' : '☆ Favorite';

  const html = `
    <div style="display:flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
      <img src="${item.image_url}" style="width:130px; height:185px; object-fit:cover; border: 4px solid white; flex-shrink:0;" />
      <div style="flex:1; font-size:10px; line-height:2.2;">
        <p><strong>Type:</strong> ${item.type || 'Manga'}</p>
        <p><strong>Chapters:</strong> ${totalChaps}</p>
        <p><strong>Volumes:</strong> ${totalVols}</p>
        <p><strong>Score:</strong> ${item.score || 'N/A'}</p>
        <p><strong>Genres:</strong> ${(item.genres || []).join(', ') || 'N/A'}</p>
        <p><strong>Read:</strong>
          <span style="color:var(--pixel-green);">${item.chapters_read || 0}</span> / ${totalChaps} chapters
        </p>
      </div>
    </div>

    <div class="nes-field" style="margin-bottom:15px;">
      <label>Your Status</label>
      <div class="nes-select is-dark" style="margin-top:8px;">
        <select id="edit_status">
          <option value="plan_to_watch" ${item.user_status === 'plan_to_watch' ? 'selected' : ''}>Plan to Read</option>
          <option value="watching"      ${item.user_status === 'watching'      ? 'selected' : ''}>Reading</option>
          <option value="completed"     ${item.user_status === 'completed'     ? 'selected' : ''}>Completed</option>
          <option value="on_hold"       ${item.user_status === 'on_hold'       ? 'selected' : ''}>On Hold</option>
          <option value="dropped"       ${item.user_status === 'dropped'       ? 'selected' : ''}>Dropped</option>
        </select>
      </div>
    </div>

    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:15px;">
      <div class="nes-field" style="flex:1; min-width:120px;">
        <label>Chapters Read</label>
        <input type="number" id="edit_chapters" class="nes-input is-dark" value="${item.chapters_read || 0}" min="0" style="margin-top:8px;" />
      </div>
      <div class="nes-field" style="flex:1; min-width:120px;">
        <label>Volumes Read</label>
        <input type="number" id="edit_volumes" class="nes-input is-dark" value="${item.volumes_read || 0}" min="0" style="margin-top:8px;" />
      </div>
    </div>

    <div class="nes-field" style="margin-bottom:15px;">
      <label>Your Rating (0.0–10.0)</label>
      <input type="number" id="edit_rating" class="nes-input is-dark" value="${(item.user_rating || 0).toFixed(1)}" step="0.1" min="0" max="10" style="margin-top:8px;" />
    </div>

    <div class="nes-field" style="margin-bottom:20px;">
      <label>Notes</label>
      <textarea id="edit_notes" class="nes-textarea is-dark" rows="2" style="margin-top:8px; font-size:10px;">${item.notes || ''}</textarea>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button id="btn-chap-tracker" class="nes-btn is-warning" style="font-size:10px;">📖 Chapter Tracker</button>
      <button id="btn-fav-toggle"   class="nes-btn ${item.is_favorite ? 'is-primary' : ''}" style="font-size:10px;">${favLabel}</button>
      <button id="btn-delete"       class="nes-btn is-error"   style="font-size:10px;">🗑 Remove</button>
    </div>
  `;

  showModal(`Manage: ${title}`, html, () => {
    const newStatus = document.getElementById('edit_status')?.value;
    const newChaps  = parseInt(document.getElementById('edit_chapters')?.value, 10) || 0;
    const newVols   = parseInt(document.getElementById('edit_volumes')?.value,  10) || 0;
    const newRating = parseFloat(document.getElementById('edit_rating')?.value) || 0;
    const newNotes  = document.getElementById('edit_notes')?.value || '';

    const updates = {
      user_status:   newStatus,
      chapters_read: Math.max(0, newChaps),
      volumes_read:  Math.max(0, newVols),
      episodes_watched: Math.max(0, newChaps),
      user_rating:   isNaN(newRating) ? 0 : Math.round(Math.min(10, Math.max(0, newRating)) * 10) / 10,
      notes:         newNotes,
    };

    if (newStatus === 'completed') {
      if (item.chapters) {
        updates.chapters_read         = item.chapters;
        updates.episodes_watched      = item.chapters;
        updates.watched_chapters_list = Array.from({ length: item.chapters }, (_, i) => i + 1);
      }
      if (item.volumes) updates.volumes_read = item.volumes;
    }

    updateEntry(item.mal_id, item.media_type, updates);
    showToast('Manga entry saved!', 'success');
    refreshCallback();
  }, { confirmText: 'Save', cancelText: 'Cancel' });

  setTimeout(() => {
    document.getElementById('btn-chap-tracker')?.addEventListener('click', () => {
      document.getElementById('modal-container').style.display = 'none';
      openChapterTracker(item, refreshCallback);
    });
    document.getElementById('btn-fav-toggle')?.addEventListener('click', () => {
      updateEntry(item.mal_id, item.media_type, { is_favorite: !item.is_favorite });
      showToast(item.is_favorite ? 'Removed from favorites.' : '⭐ Added to favorites!', 'success');
      item.is_favorite = !item.is_favorite;
      document.getElementById('modal-container').style.display = 'none';
      refreshCallback();
    });
    document.getElementById('btn-delete')?.addEventListener('click', () => {
      showModal(
        'Confirm Remove',
        `<p style="font-size:10px;">Remove "<strong>${title}</strong>" from your library?</p>`,
        () => {
          removeFromLibrary(item.mal_id, item.media_type);
          showToast('Removed from library.', 'error');
          refreshCallback();
        },
        { confirmText: 'Yes, Remove', cancelText: 'Cancel' }
      );
    });
  }, 80);
}

// ══════════════════════════════════════════════════════════════════
//  Episode Tracker (anime only)
// ══════════════════════════════════════════════════════════════════
async function openEpisodeTracker(item, refreshCallback) {
  showModal('Episode Tracker', '<p style="font-size:10px;">Fetching episodes...</p>', null, { hideCancel: true });

  try {
    const res      = await getAnimeEpisodes(item.mal_id);
    const episodes = res.data || [];

    if (episodes.length === 0) {
      showModal('Episode Tracker', '<p style="font-size:10px;">No episode data available in Jikan for this anime.</p>', null, { hideCancel: true });
      return;
    }

    const watchedList = item.watched_episodes_list || [];
    const lastWatched = watchedList.length > 0 ? Math.max(...watchedList) : 0;

    const epsHtml = episodes.map(ep => {
      const epNum     = ep.mal_id;
      const isWatched = watchedList.includes(epNum);
      const isLast    = epNum === lastWatched && lastWatched > 0;
      return `
        <label style="display:flex; align-items:center; gap:10px; padding: 8px; border-bottom: 1px dashed #333; cursor:pointer; ${isLast ? 'background:rgba(0,212,255,0.1); border-left: 3px solid var(--pixel-cyan);' : ''}">
          <input type="checkbox" class="nes-checkbox is-dark ep-checkbox" data-epnum="${epNum}" ${isWatched ? 'checked' : ''} />
          <span style="font-size:9px; flex:1; ${isWatched ? 'color: var(--pixel-green);' : ''}">${isLast ? '👁 ' : ''}Ep ${epNum}: ${ep.title || '(No title)'}</span>
          <span style="font-size:9px; color:#666;">${ep.aired ? new Date(ep.aired).toLocaleDateString() : ''}</span>
        </label>
      `;
    }).join('');

    const html = `
      <div style="font-size:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Progress: <strong style="color:var(--pixel-green);">${watchedList.length}</strong> / ${episodes.length} episodes</span>
        <div style="display:flex; gap:8px;">
          <button id="btn-mark-all"   class="nes-btn is-success" style="font-size:9px; padding:4px 8px;">✅ Mark All</button>
          <button id="btn-unmark-all" class="nes-btn"            style="font-size:9px; padding:4px 8px;">⬜ Unmark All</button>
        </div>
      </div>
      <div style="max-height: 380px; overflow-y: auto; border: 3px solid var(--pixel-cyan);">
        ${epsHtml}
      </div>
    `;

    showModal(`📺 ${item.title_english || item.title}`, html, () => {
      const checkboxes = document.querySelectorAll('.ep-checkbox');
      const newWatched = [];
      checkboxes.forEach(cb => { if (cb.checked) newWatched.push(parseInt(cb.getAttribute('data-epnum'), 10)); });
      updateEntry(item.mal_id, item.media_type, { watched_episodes_list: newWatched, episodes_watched: newWatched.length });
      showToast(`Progress saved! ${newWatched.length}/${episodes.length} eps`, 'success');
      refreshCallback();
    }, { confirmText: 'Save Progress', cancelText: 'Cancel' });

    setTimeout(() => {
      document.getElementById('btn-mark-all')?.addEventListener('click', () => {
        document.querySelectorAll('.ep-checkbox').forEach(cb => cb.checked = true);
      });
      document.getElementById('btn-unmark-all')?.addEventListener('click', () => {
        document.querySelectorAll('.ep-checkbox').forEach(cb => cb.checked = false);
      });
    }, 80);

  } catch (e) {
    console.error('Episode tracker error:', e);
    showModal('Episode Tracker', '<p class="nes-text is-error" style="font-size:10px;">Failed to load episode data.</p>', null, { hideCancel: true });
  }
}

// ══════════════════════════════════════════════════════════════════
//  Chapter Tracker (manga — uses AniList chapter count)
// ══════════════════════════════════════════════════════════════════
async function openChapterTracker(item, refreshCallback) {
  const title      = item.title_english || item.title;
  const totalCount = item.chapters || 0;

  let chapters = [];
  if (totalCount > 0) {
    chapters = Array.from({ length: totalCount }, (_, i) => ({ number: i + 1, title: `Chapter ${i + 1}` }));
  }

  if (chapters.length === 0) {
    showModal(
      'Chapter Tracker',
      `<p style="font-size:10px; line-height:2;">
        No chapter count available for this manga.
        You can still track your progress using the <strong>Chapters Read</strong> field in the manage panel.
      </p>`,
      null,
      { hideCancel: true }
    );
    return;
  }

  const totalChaps  = chapters.length;
  const watchedList = item.watched_chapters_list || [];
  const lastRead    = watchedList.length > 0 ? Math.max(...watchedList) : 0;

  const chapsHtml = chapters.map(chap => {
    const chapNum = chap.number;
    const isRead  = watchedList.includes(chapNum);
    const isLast  = chapNum === lastRead && lastRead > 0;
    return `
      <label style="display:flex; align-items:center; gap:10px; padding:7px 10px; border-bottom:1px dashed #333; cursor:pointer;
        ${isLast ? 'background:rgba(255,176,0,0.08); border-left:3px solid var(--pixel-amber);' : ''}">
        <input type="checkbox" class="nes-checkbox is-dark chap-checkbox" data-chapnum="${chapNum}" ${isRead ? 'checked' : ''} />
        <span style="font-size:9px; flex:1; ${isRead ? 'color:var(--pixel-green);' : ''}">
          ${isLast ? '📖 ' : ''}${chap.title || `Chapter ${chapNum}`}
        </span>
      </label>
    `;
  }).join('');

  const html = `
    <div style="font-size:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <span>Read: <strong style="color:var(--pixel-green);">${watchedList.length}</strong> / ${totalChaps} chapters</span>
      <div style="display:flex; gap:8px;">
        <button id="btn-mark-all"   class="nes-btn is-success" style="font-size:9px; padding:4px 8px;">✅ Mark All</button>
        <button id="btn-unmark-all" class="nes-btn"            style="font-size:9px; padding:4px 8px;">⬜ Unmark All</button>
      </div>
    </div>
    <div style="max-height:380px; overflow-y:auto; border:3px solid var(--pixel-amber);">
      ${chapsHtml}
    </div>
    <p style="font-size:8px; color:#555; margin-top:10px; line-height:1.8;">
      ℹ️ Chapter data based on AniList chapter count.
    </p>
  `;

  showModal(`📖 ${title}`, html, () => {
    const checkboxes = document.querySelectorAll('.chap-checkbox');
    const newRead    = [];
    checkboxes.forEach(cb => { if (cb.checked) newRead.push(parseInt(cb.getAttribute('data-chapnum'), 10)); });
    updateEntry(item.mal_id, item.media_type, { watched_chapters_list: newRead, chapters_read: newRead.length, episodes_watched: newRead.length });
    showToast(`Chapters saved! ${newRead.length}/${totalChaps} read`, 'success');
    refreshCallback();
  }, { confirmText: 'Save Progress', cancelText: 'Cancel' });

  setTimeout(() => {
    document.getElementById('btn-mark-all')?.addEventListener('click', () => {
      document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = true);
    });
    document.getElementById('btn-unmark-all')?.addEventListener('click', () => {
      document.querySelectorAll('.chap-checkbox').forEach(cb => cb.checked = false);
    });
  }, 80);
}
