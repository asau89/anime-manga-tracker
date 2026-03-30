import { getLibrary, updateEntry, removeFromLibrary, exportLibrary } from '../store/library.js';
import { createAnimeCard } from '../components/anime-card.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { getAnimeEpisodes } from '../api/jikan.js';
import { getMangaChaptersMU } from '../api/mangaupdates.js';

export function renderLibrary(root) {
  root.innerHTML = `
    <div class="mb-4">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <h2 style="color: var(--pixel-cyan); margin:0;">My Library</h2>
        <button id="btn-export" class="nes-btn" style="font-size:9px;">📥 Export JSON</button>
      </div>

      <!-- Anime / Manga switcher -->
      <div style="display:flex; gap:8px; margin-bottom:14px;">
        <button id="tab-anime" class="nes-btn is-primary lib-type-tab" data-type="anime" style="font-size:10px;">🎬 Anime</button>
        <button id="tab-manga" class="nes-btn lib-type-tab" data-type="manga" style="font-size:10px;">📖 Manga</button>
      </div>

      <!-- Status filter -->
      <div id="status-filters" style="display:flex; gap: 8px; flex-wrap: wrap;"></div>
    </div>
    <div id="library-container"></div>
  `;

  let currentType   = 'anime'; // 'anime' | 'manga'
  let currentFilter = 'all';

  const libraryContainer = document.getElementById('library-container');
  const statusFiltersEl  = document.getElementById('status-filters');

  // ── Status filter labels per media type ───────────────────────
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

  // ── Build status filter buttons ───────────────────────────────
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

  // ── Render card grid ──────────────────────────────────────────
  const renderItems = () => {
    libraryContainer.innerHTML = '';
    const library = getLibrary();

    const ofType = library.filter(i => i.media_type === currentType);
    const filtered = currentFilter === 'all'
      ? ofType
      : ofType.filter(i => i.user_status === currentFilter);

    if (filtered.length === 0) {
      const label = currentType === 'manga' ? 'manga' : 'anime';
      libraryContainer.innerHTML = `
        <div style="text-align:center; padding: 40px; font-size: 10px; color: #888;">
          <p>No ${label} found${currentFilter !== 'all' ? ` with status "${currentFilter.replace(/_/g, ' ')}"` : ''}.</p>
          ${ofType.length === 0 ? `<p style="margin-top:10px;">Go to <strong>Browse</strong> and switch to ${label} mode to add some!</p>` : ''}
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'card-grid';

    filtered.forEach(item => {
      const onSelect = currentType === 'anime'
        ? () => showManageAnimeModal(item, renderItems)
        : () => showManageMangaModal(item, renderItems);
      grid.appendChild(createAnimeCard(item, onSelect, null, true));
    });

    libraryContainer.appendChild(grid);
  };

  // ── Type tab switching ────────────────────────────────────────
  root.querySelectorAll('.lib-type-tab').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('.lib-type-tab').forEach(b => b.classList.remove('is-primary'));
      btn.classList.add('is-primary');
      currentType = btn.dataset.type;
      buildFilters(currentType);
      renderItems();
    };
  });

  document.getElementById('btn-export').onclick = () => {
    exportLibrary();
    showToast('Library exported!', 'success');
  };

  // ── Init ──────────────────────────────────────────────────────
  buildFilters('anime');
  renderItems();
}

// ══════════════════════════════════════════════════════════════════
//  ANIME manage modal
// ══════════════════════════════════════════════════════════════════
function showManageAnimeModal(item, refreshCallback) {
  const title    = item.title_english || item.title;
  const totalEps = item.episodes || '?';

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
      <label>Your Rating (0–10)</label>
      <input type="number" id="edit_rating" class="nes-input is-dark" value="${item.user_rating || 0}" min="0" max="10" style="margin-top:8px;" />
    </div>

    <div class="nes-field" style="margin-bottom:20px;">
      <label>Notes</label>
      <textarea id="edit_notes" class="nes-textarea is-dark" rows="2" style="margin-top:8px; font-size:10px;">${item.notes || ''}</textarea>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button id="btn-ep-tracker" class="nes-btn is-warning" style="font-size:10px;">📺 Episode Tracker</button>
      <button id="btn-delete"     class="nes-btn is-error"   style="font-size:10px;">🗑 Remove</button>
    </div>
  `;

  showModal(`Manage: ${title}`, html, () => {
    const newStatus = document.getElementById('edit_status')?.value;
    const newRating = parseInt(document.getElementById('edit_rating')?.value, 10);
    const newNotes  = document.getElementById('edit_notes')?.value || '';

    const updates = {
      user_status: newStatus,
      user_rating: isNaN(newRating) ? 0 : Math.min(10, Math.max(0, newRating)),
      notes: newNotes,
    };

    if (newStatus === 'completed' && item.episodes) {
      updates.episodes_watched       = item.episodes;
      updates.watched_episodes_list  = Array.from({ length: item.episodes }, (_, i) => i + 1);
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
  const title       = item.title_english || item.title;
  const totalChaps  = item.chapters  || '?';
  const totalVols   = item.volumes   || '?';

  const html = `
    <div style="display:flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
      <img src="${item.image_url}" style="width:130px; height:185px; object-fit:cover; border: 4px solid white; flex-shrink:0;" />
      <div style="flex:1; font-size:10px; line-height:2.2;">
        <p><strong>Type:</strong> ${item.type || 'Manga'}</p>
        <p><strong>Chapters:</strong> ${totalChaps}</p>
        <p><strong>Volumes:</strong> ${totalVols}</p>
        <p><strong>Score (MAL):</strong> ${item.score || 'N/A'}</p>
        <p><strong>Genres:</strong> ${(item.genres || []).join(', ') || 'N/A'}</p>
        <p><strong>Read:</strong>
          <span style="color:var(--pixel-green);">${item.chapters_read || 0}</span> / ${totalChaps} chapters
          &nbsp;|&nbsp;
          <span style="color:#ffb000;">${item.volumes_read || 0}</span> / ${totalVols} vols
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
      <label>Your Rating (0–10)</label>
      <input type="number" id="edit_rating" class="nes-input is-dark" value="${item.user_rating || 0}" min="0" max="10" style="margin-top:8px;" />
    </div>

    <div class="nes-field" style="margin-bottom:20px;">
      <label>Notes</label>
      <textarea id="edit_notes" class="nes-textarea is-dark" rows="2" style="margin-top:8px; font-size:10px;">${item.notes || ''}</textarea>
    </div>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <button id="btn-chap-tracker" class="nes-btn is-warning" style="font-size:10px;">📖 Chapter Tracker</button>
      <button id="btn-delete" class="nes-btn is-error"   style="font-size:10px;">🗑 Remove</button>
    </div>
  `;

  showModal(`Manage: ${title}`, html, () => {
    const newStatus  = document.getElementById('edit_status')?.value;
    const newChaps   = parseInt(document.getElementById('edit_chapters')?.value, 10) || 0;
    const newVols    = parseInt(document.getElementById('edit_volumes')?.value,  10) || 0;
    const newRating  = parseInt(document.getElementById('edit_rating')?.value,   10);
    const newNotes   = document.getElementById('edit_notes')?.value || '';

    const updates = {
      user_status:   newStatus,
      chapters_read: Math.max(0, newChaps),
      volumes_read:  Math.max(0, newVols),
      episodes_watched: Math.max(0, newChaps),
      user_rating:   isNaN(newRating) ? 0 : Math.min(10, Math.max(0, newRating)),
      notes:         newNotes,
    };

    // Auto-complete: fill chapters/volumes when marked Completed
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
      showModal(
        'Episode Tracker',
        '<p style="font-size:10px;">No episode data available in Jikan for this anime.</p>',
        null,
        { hideCancel: true }
      );
      return;
    }

    const watchedList = item.watched_episodes_list || [];
    const lastWatched = watchedList.length > 0 ? Math.max(...watchedList) : 0;

    const epsHtml = episodes.map(ep => {
      const epNum    = ep.mal_id;
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

    const watchedCount = watchedList.length;
    const totalCount   = episodes.length;

    const html = `
      <div style="font-size:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Progress: <strong style="color:var(--pixel-green);">${watchedCount}</strong> / ${totalCount} episodes</span>
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
      checkboxes.forEach(cb => {
        if (cb.checked) newWatched.push(parseInt(cb.getAttribute('data-epnum'), 10));
      });

      updateEntry(item.mal_id, item.media_type, {
        watched_episodes_list: newWatched,
        episodes_watched:      newWatched.length,
      });

      showToast(`Progress saved! ${newWatched.length}/${totalCount} eps`, 'success');
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
//  Chapter Tracker (manga — uses MangaUpdates for chapter data)
// ══════════════════════════════════════════════════════════════════
async function openChapterTracker(item, refreshCallback) {
  const title      = item.title_english || item.title;

  // Show loading state while we fetch chapter list
  showModal('Chapter Tracker', '<p style="font-size:10px;">Fetching chapter data from MangaUpdates...</p>', null, { hideCancel: true });

  let chapters = [];
  try {
    chapters = await getMangaChaptersMU(item.mal_id, item.chapters);
  } catch (e) {
    console.warn('getMangaChaptersMU failed, falling back to total count', e);
    if (item.chapters) {
      chapters = Array.from({ length: item.chapters }, (_, i) => ({ number: i + 1, title: `Chapter ${i + 1}` }));
    }
  }

  if (chapters.length === 0) {
    showModal(
      'Chapter Tracker',
      `<p style="font-size:10px; line-height:2;">
        No chapter count available for this manga in MangaUpdates.
        You can still track your progress using the <strong>Chapters Read</strong> field in the manage panel.
      </p>`,
      null,
      { hideCancel: true }
    );
    return;
  }

  const totalChaps = chapters.length;

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

  const readCount = watchedList.length;

  const html = `
    <div style="font-size:10px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <span>Read: <strong style="color:var(--pixel-green);">${readCount}</strong> / ${totalChaps} chapters</span>
      <div style="display:flex; gap:8px;">
        <button id="btn-mark-all"   class="nes-btn is-success" style="font-size:9px; padding:4px 8px;">✅ Mark All</button>
        <button id="btn-unmark-all" class="nes-btn"            style="font-size:9px; padding:4px 8px;">⬜ Unmark All</button>
      </div>
    </div>
    <div style="max-height:380px; overflow-y:auto; border:3px solid var(--pixel-amber);">
      ${chapsHtml}
    </div>
    <p style="font-size:8px; color:#555; margin-top:10px; line-height:1.8;">
      ℹ️ Chapter data sourced from MangaUpdates. Numbers are sequential based on latest chapter.
    </p>
  `;

  showModal(`📖 ${title}`, html, () => {
    const checkboxes = document.querySelectorAll('.chap-checkbox');
    const newRead    = [];
    checkboxes.forEach(cb => {
      if (cb.checked) newRead.push(parseInt(cb.getAttribute('data-chapnum'), 10));
    });

    updateEntry(item.mal_id, item.media_type, {
      watched_chapters_list: newRead,
      chapters_read:         newRead.length,
      episodes_watched:      newRead.length,
    });

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
