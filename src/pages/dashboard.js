import { getStats, getLibrary, getFavorites, getPlanToWatch, updateEntry } from '../store/library.js';
import { getSettings } from '../store/settings.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

const STATUS_LABELS = {
  anime: { watching: 'Watching', plan_to_watch: 'Plan to Watch', completed: 'Completed', on_hold: 'On Hold', dropped: 'Dropped' },
  manga: { watching: 'Reading', plan_to_watch: 'Plan to Read', completed: 'Completed', on_hold: 'On Hold', dropped: 'Dropped' },
};
const STATUS_COLORS = {
  watching: 'var(--pixel-cyan)', completed: 'var(--pixel-green)',
  plan_to_watch: 'var(--pixel-amber)', on_hold: '#888888', dropped: 'var(--pixel-red)',
};

function getStatusLabel(userStatus, mediaType) {
  return (STATUS_LABELS[mediaType] || STATUS_LABELS.anime)[userStatus] || (userStatus || '').replace(/_/g, ' ');
}

function renderStarsSmall(rating) {
  const r = parseFloat(rating);
  if (isNaN(r) || r <= 0) return '';
  const percentage = Math.min(100, Math.max(0, (r / 10) * 100));
  return `
    <div style="display:flex; align-items:center; justify-content:center; margin-top:4px;">
      <div style="display:inline-block; position:relative; color:#333; font-size:9px; line-height:1; letter-spacing:1px; text-shadow: 1px 1px 0px #000;">
        ★★★★★
        <div style="position:absolute; top:0; left:0; width:${percentage}%; overflow:hidden; color:#ffb400; white-space:nowrap; text-shadow: 1px 1px 0px #8a6d00;">
          ★★★★★
        </div>
      </div>
      <span style="margin-left:4px; font-size:7px; font-weight:bold; color:var(--pixel-amber);">${r.toFixed(1)}</span>
    </div>
  `;
}

function buildRecentRow(items, mediaType) {
  if (items.length === 0) return '';
  return items.map(item => {
    const label = getStatusLabel(item.user_status, mediaType);
    const color = STATUS_COLORS[item.user_status] || '#fff';
    const rating = (item.user_rating > 0) ? item.user_rating : item.score;
    const favBadge = item.is_favorite ? '<span style="position:absolute;top:4px;left:4px;font-size:10px;">⭐</span>' : '';
    return `
      <div style="flex-shrink:0; width:120px; cursor:pointer; text-align:center;" onclick="window.location.hash='#/library'">
        <div style="position:relative;">
          <img src="${item.image_url}" style="width:120px; height:170px; object-fit:cover; border:3px solid ${color};" />
          ${favBadge}
          <div style="position:absolute;bottom:0;left:0;right:0; background:rgba(0,0,0,0.78); padding:4px 2px; font-size:7px; color:${color}; text-align:center;">
            ${label.toUpperCase()}
          </div>
        </div>
        <p style="font-size:7px; margin:5px 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; color:#ccc;">${item.title_english || item.title}</p>
        ${renderStarsSmall(rating)}
      </div>`;
  }).join('');
}

function buildFavoritesRow(favorites) {
  if (favorites.length === 0) return '<p style="font-size:9px; color:#555; padding:10px 0;">No favorites yet. Click ☆ Favorite in any Library entry!</p>';
  return favorites.map(item => {
    const border = item.media_type === 'manga' ? '#ff88ff' : 'var(--pixel-amber)';
    const rating = item.user_rating > 0 ? item.user_rating : null;
    return `
      <div style="flex-shrink:0; width:120px; text-align:center; cursor:pointer;" onclick="window.location.hash='#/library'">
        <div style="position:relative;">
          <img src="${item.image_url}" style="width:120px; height:170px; object-fit:cover; border:3px solid ${border}; box-shadow:0 0 10px ${border}88;" />
          <div style="position:absolute;top:4px;right:4px;font-size:12px;">⭐</div>
        </div>
        <p style="font-size:7px; margin:5px 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; color:#ccc;">${item.title_english || item.title}</p>
        ${rating ? renderStarsSmall(rating) : ''}
      </div>`;
  }).join('');
}

export function renderDashboard(root) {
  const stats     = getStats();
  const settings  = getSettings();
  const library   = getLibrary();
  const favorites = getFavorites();

  const sorted      = [...library].sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
  const recentAnime = sorted.filter(i => i.media_type === 'anime').slice(0, 8);
  const recentManga = sorted.filter(i => i.media_type === 'manga').slice(0, 8);

  const genreMap = {};
  library.forEach(item => (item.genres || []).forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1; }));
  const topGenres  = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const genresHtml = topGenres.length > 0
    ? topGenres.map(([name, count]) =>
        `<span style="background:#0d0d30;border:2px solid var(--pixel-cyan);padding:3px 8px;font-size:8px;margin:3px;display:inline-block;color:var(--pixel-cyan);">${name} <span style="color:#888;">(${count})</span></span>`
      ).join('')
    : '<span style="font-size:10px; color:#555;">No genres tracked yet.</span>';

  const animeRowHtml = recentAnime.length > 0
    ? buildRecentRow(recentAnime, 'anime')
    : '<p style="font-size:9px; color:#555; padding:10px 0;">No anime in library yet. Go to Browse → 🎬 Anime!</p>';

  const mangaRowHtml = recentManga.length > 0
    ? buildRecentRow(recentManga, 'manga')
    : '<p style="font-size:9px; color:#555; padding:10px 0;">No manga in library yet. Go to Browse → 📖 Manga!</p>';

  root.innerHTML = `
    <div class="mb-4" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
      <div>
        <h2 style="color: var(--pixel-green); margin-bottom:5px;">Welcome back, ${settings.username}!</h2>
        <p style="font-size:8px; color:#555;">AnimeTracker OS v1.0 — Anime via Jikan · Manga via AniList · AI via Ollama</p>
      </div>
      <button id="btn-random-picker" class="nes-btn is-warning" style="font-size:10px; align-self:center;">🎲 What To Watch?</button>
    </div>

    <!-- Stats Grid -->
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:22px;">
      <div class="nes-container is-dark" style="text-align:center; padding:14px !important;">
        <p style="font-size:8px; color:var(--pixel-cyan); margin-bottom:6px;">🎬 ANIME</p>
        <p style="font-size:30px; margin:0; color:var(--pixel-green);">${stats.animeCount}</p>
      </div>
      <div class="nes-container is-dark" style="text-align:center; padding:14px !important;">
        <p style="font-size:8px; color:var(--pixel-cyan); margin-bottom:6px;">📖 MANGA</p>
        <p style="font-size:30px; margin:0; color:#ff88ff;">${stats.mangaCount}</p>
      </div>
      <div class="nes-container is-dark" style="text-align:center; padding:14px !important;">
        <p style="font-size:8px; color:var(--pixel-cyan); margin-bottom:6px;">✅ COMPLETED</p>
        <p style="font-size:30px; margin:0; color:var(--pixel-amber);">${stats.completed}</p>
      </div>
      <div class="nes-container is-dark" style="text-align:center; padding:14px !important;">
        <p style="font-size:8px; color:var(--pixel-cyan); margin-bottom:6px;">📺 EPS / CH</p>
        <p style="font-size:30px; margin:0; color:var(--pixel-green);">${stats.totalEps}</p>
      </div>
    </div>

    <!-- Favorites Hall of Fame -->
    <div class="nes-container with-title is-dark mb-4" style="border-color: var(--pixel-amber) !important;">
      <p class="title" style="color:var(--pixel-amber);">⭐ Favorites Hall of Fame</p>
      <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:10px; min-height:60px;">
        ${buildFavoritesRow(favorites)}
      </div>
    </div>

    <!-- Recently Added: Anime -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Recently Added Anime 🎬</p>
      <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:10px; min-height:60px;">
        ${animeRowHtml}
      </div>
    </div>

    <!-- Recently Added: Manga -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Recently Added Manga 📖</p>
      <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:10px; min-height:60px;">
        ${mangaRowHtml}
      </div>
    </div>

    <!-- Top Genres -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Top Genres</p>
      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">${genresHtml}</div>
    </div>

    <!-- Quick Actions -->
    <div class="nes-container with-title is-dark">
      <p class="title">Quick Actions</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:5px;">
        <button class="nes-btn is-success" onclick="window.location.hash='#/browse'">🎬 Browse Anime</button>
        <button class="nes-btn is-primary" onclick="window.location.hash='#/browse'">📖 Browse Manga</button>
        <button class="nes-btn"            onclick="window.location.hash='#/stats'">📊 My Stats</button>
        <button class="nes-btn is-error"   onclick="window.location.hash='#/ai-advisor'">🤖 AI Advisor</button>
        <button class="nes-btn is-warning" onclick="window.location.hash='#/library'">📚 My Library</button>
      </div>
    </div>
  `;

  // ── Random Picker ─────────────────────────────────────────────
  document.getElementById('btn-random-picker')?.addEventListener('click', () => {
    const planList = getPlanToWatch();
    if (planList.length === 0) {
      showModal(
        '🎲 Random Picker',
        `<p style="font-size:10px; line-height:2;">Your <strong>Plan to Watch / Read</strong> list is empty!<br/>Browse and add some titles first.</p>`,
        null, { hideCancel: true }
      );
      return;
    }

    // Pick a random item
    const pick = planList[Math.floor(Math.random() * planList.length)];

    // Slot-machine HTML
    const html = `
      <div style="text-align:center; font-size:9px;">
        <div id="slot-drum" style="height:48px; overflow:hidden; border:3px solid var(--pixel-amber); margin-bottom:16px; background:#000; position:relative; display:flex; align-items:center; justify-content:center;">
          <span id="slot-text" style="color:var(--pixel-amber); animation:slotSpin 1.8s ease-out forwards;">${pick.title_english || pick.title}</span>
        </div>
        <div style="display:flex; gap:16px; justify-content:center; align-items:center; flex-wrap:wrap;">
          <img src="${pick.image_url}" style="width:100px; height:145px; object-fit:cover; border:3px solid var(--pixel-amber); box-shadow:0 0 14px rgba(255,176,0,0.4);" />
          <div style="text-align:left; font-size:9px; line-height:2.2; max-width:200px;">
            <p><strong style="color:var(--pixel-amber);">${pick.title_english || pick.title}</strong></p>
            <p>Type: ${pick.type || (pick.media_type === 'anime' ? 'Anime' : 'Manga')}</p>
            <p>${pick.media_type === 'anime' ? `Episodes: ${pick.episodes || '?'}` : `Chapters: ${pick.chapters || '?'}`}</p>
            <p>Score: ${pick.score || 'N/A'}</p>
            <p style="color:#888;">Genres: ${(pick.genres || []).slice(0,3).join(', ')}</p>
          </div>
        </div>
        <p style="margin-top:14px; color:#555; font-size:8px; line-height:1.8;">
          ${pick.synopsis ? pick.synopsis.slice(0, 120) + '...' : ''}
        </p>
      </div>
    `;

    showModal('🎲 Tonight\'s Pick!', html, () => {
      // Start Watching/Reading
      updateEntry(pick.mal_id, pick.media_type, { user_status: 'watching' });
      showToast(`Started ${pick.media_type === 'anime' ? 'watching' : 'reading'}: ${pick.title_english || pick.title}!`, 'success');
    }, { confirmText: `▶ Start ${pick.media_type === 'anime' ? 'Watching' : 'Reading'}`, cancelText: 'Maybe Later' });
  });
}
