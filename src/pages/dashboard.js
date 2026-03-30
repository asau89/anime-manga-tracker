import { getStats, getLibrary } from '../store/library.js';

// Status labels that are context-aware for media type
const STATUS_LABELS = {
  anime: {
    watching:      'Watching',
    plan_to_watch: 'Plan to Watch',
    completed:     'Completed',
    on_hold:       'On Hold',
    dropped:       'Dropped',
  },
  manga: {
    watching:      'Reading',
    plan_to_watch: 'Plan to Read',
    completed:     'Completed',
    on_hold:       'On Hold',
    dropped:       'Dropped',
  },
};

const STATUS_COLORS = {
  watching:      'var(--pixel-cyan)',
  completed:     'var(--pixel-green)',
  plan_to_watch: 'var(--pixel-amber)',
  on_hold:       '#888888',
  dropped:       'var(--pixel-red)',
};

function getStatusLabel(userStatus, mediaType) {
  return (STATUS_LABELS[mediaType] || STATUS_LABELS.anime)[userStatus]
    || (userStatus || '').replace(/_/g, ' ');
}

function buildRecentRow(items, mediaType) {
  if (items.length === 0) return '';
  return items.map(item => {
    const label = getStatusLabel(item.user_status, mediaType);
    const color = STATUS_COLORS[item.user_status] || '#fff';
    const dest  = mediaType === 'anime'
      ? `window.location.hash='#/library'`
      : `window.location.hash='#/library'`;
    return `
      <div style="flex-shrink:0; width:120px; cursor:pointer; text-align:center;" onclick="${dest}">
        <div style="position:relative;">
          <img src="${item.image_url}" style="width:120px; height:170px; object-fit:cover; border:3px solid ${color};" />
          <div style="position:absolute;bottom:0;left:0;right:0; background:rgba(0,0,0,0.78); padding:4px 2px; font-size:7px; color:${color}; text-align:center;">
            ${label.toUpperCase()}
          </div>
        </div>
        <p style="font-size:7px; margin:5px 0 0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px; color:#ccc;">${item.title_english || item.title}</p>
      </div>`;
  }).join('');
}

export function renderDashboard(root) {
  const stats   = getStats();
  const library = getLibrary();

  // Split into anime and manga, sorted by date_added (newest first)
  const sorted = [...library].sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
  const recentAnime = sorted.filter(i => i.media_type === 'anime').slice(0, 8);
  const recentManga = sorted.filter(i => i.media_type === 'manga').slice(0, 8);

  // Genre breakdown aggregated across all library items
  const genreMap = {};
  library.forEach(item => {
    (item.genres || []).forEach(g => {
      genreMap[g] = (genreMap[g] || 0) + 1;
    });
  });
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
    <div class="mb-4">
      <h2 style="color: var(--pixel-green); margin-bottom:5px;">Welcome back, Player 1</h2>
      <p style="font-size:8px; color:#555;">AnimeTracker OS v1.0 — Anime via Jikan · Manga via MangaUpdates · AI via Ollama</p>
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
      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:5px;">
        ${genresHtml}
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="nes-container with-title is-dark">
      <p class="title">Quick Actions</p>
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:5px;">
        <button class="nes-btn is-success" onclick="window.location.hash='#/browse'">🎬 Browse Anime</button>
        <button class="nes-btn is-primary" onclick="window.location.hash='#/browse'">📖 Browse Manga</button>
        <button class="nes-btn is-error"   onclick="window.location.hash='#/ai-advisor'">🤖 AI Advisor</button>
        <button class="nes-btn is-warning" onclick="window.location.hash='#/library'">📚 My Library</button>
      </div>
    </div>
  `;
}
