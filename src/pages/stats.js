import { getDetailedStats } from '../store/library.js';

export function renderStats(root) {
  const stats = getDetailedStats();

  if (!stats) {
    root.innerHTML = `
      <div style="text-align:center; padding:60px 20px;">
        <h2 style="color:var(--pixel-cyan);">📊 Statistics</h2>
        <p style="font-size:10px; color:#555; margin-top:20px;">Add some anime or manga to your library to see your stats!</p>
        <button class="nes-btn is-primary" style="margin-top:20px; font-size:10px;" onclick="window.location.hash='#/browse'">Browse Titles</button>
      </div>
    `;
    return;
  }

  const { total, animeCount, mangaCount, ratingBuckets, statusMap, topGenres,
          meanScore, ratedCount, totalHours, completionRate, months } = stats;

  // ── Helpers ───────────────────────────────────────────────────
  const maxRatingCount = Math.max(...ratingBuckets.map(b => b.count), 1);
  const maxGenreCount  = topGenres.length > 0 ? topGenres[0][1] : 1;
  const maxMonthCount  = Math.max(...months.map(m => m.count), 1);
  const statusTotal    = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;

  const statusColors = {
    watching:      '#00d4ff',
    completed:     '#00ff41',
    plan_to_watch: '#ffb000',
    on_hold:       '#888888',
    dropped:       '#ff2244',
  };
  const statusLabels = {
    watching:      'Watching',
    completed:     'Completed',
    plan_to_watch: 'Plan to Watch',
    on_hold:       'On Hold',
    dropped:       'Dropped',
  };

  // ── Score rating bar chart ─────────────────────────────────────
  const ratingChartHtml = ratingBuckets.map(b => {
    const pct = Math.round((b.count / maxRatingCount) * 100);
    const color = b.score <= 4 ? '#ff2244' : b.score <= 6 ? '#ffb000' : b.score <= 8 ? '#00d4ff' : '#00ff41';
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
        <span style="font-size:7px; color:${color};">${b.count > 0 ? b.count : ''}</span>
        <div style="width:100%; background:#111; border:1px solid #333; display:flex; flex-direction:column; justify-content:flex-end; height:80px;">
          <div style="width:100%; background:${color}; height:${pct}%; transition:height 0.6s ease; box-shadow: 0 0 6px ${color}44;"></div>
        </div>
        <span style="font-size:7px; color:#888;">${b.score}</span>
      </div>
    `;
  }).join('');

  // ── Status breakdown donut (CSS pixel art style)  ─────────────
  const statusBarsHtml = Object.entries(statusMap).map(([key, count]) => {
    const pct   = Math.round((count / statusTotal) * 100);
    const color = statusColors[key] || '#fff';
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">
          <span style="font-size:8px; color:${color};">${statusLabels[key]}</span>
          <span style="font-size:8px; color:#888;">${count} (${pct}%)</span>
        </div>
        <div style="height:10px; background:#111; border:1px solid #333; width:100%;">
          <div style="height:100%; width:${pct}%; background:${color}; box-shadow:0 0 4px ${color}66; transition:width 0.6s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  // ── Genre horizontal bar chart ─────────────────────────────────
  const genreChartHtml = topGenres.map(([name, count], idx) => {
    const pct = Math.round((count / maxGenreCount) * 100);
    const hue = (idx * 36) % 360;
    return `
      <div style="margin-bottom:7px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
          <span style="font-size:7px; color:#ccc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${name}</span>
          <span style="font-size:7px; color:#888;">${count}</span>
        </div>
        <div style="height:8px; background:#111; border:1px solid #222; width:100%;">
          <div style="height:100%; width:${pct}%; background:hsl(${hue},80%,55%); transition:width 0.6s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  // ── Monthly activity chart ─────────────────────────────────────
  const monthChartHtml = months.map(m => {
    const pct = Math.round((m.count / maxMonthCount) * 100);
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:4px; flex:1;">
        <span style="font-size:6px; color:var(--pixel-amber);">${m.count > 0 ? m.count : ''}</span>
        <div style="width:100%; background:#111; border:1px solid #333; display:flex; flex-direction:column; justify-content:flex-end; height:60px;">
          <div style="width:100%; background:var(--pixel-amber); height:${pct}%; transition:height 0.6s ease; box-shadow:0 0 6px rgba(255,176,0,0.4);"></div>
        </div>
        <span style="font-size:6px; color:#888;">${m.label}</span>
      </div>
    `;
  }).join('');

  // ── Anime vs Manga split ring (pure CSS) ──────────────────────
  const animeRatio = total > 0 ? Math.round((animeCount / total) * 100) : 0;
  const mangaRatio = 100 - animeRatio;

  // Time display
  const timeDisplay = totalHours >= 24
    ? `${Math.floor(totalHours / 24)}d ${totalHours % 24}h`
    : `${totalHours}h`;

  root.innerHTML = `
    <div class="mb-4">
      <h2 style="color:var(--pixel-cyan); margin-bottom:4px;">📊 Statistics</h2>
      <p style="font-size:8px; color:#555;">Your personal tracking profile — ${total} titles</p>
    </div>

    <!-- ── Summary Cards ── -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:22px;">
      ${[
        { label: '🎬 ANIME',       value: animeCount,        color: 'var(--pixel-cyan)' },
        { label: '📖 MANGA',       value: mangaCount,        color: '#ff88ff' },
        { label: '✅ COMPLETED',   value: statusMap.completed, color: 'var(--pixel-green)' },
        { label: '⭐ MEAN SCORE',  value: meanScore ? `${meanScore}` : 'N/A', color: 'var(--pixel-amber)' },
        { label: '⏱ TIME',        value: timeDisplay,       color: '#00d4ff' },
        { label: '🎯 COMPLETION',  value: `${completionRate}%`, color: meanScore >= 7 ? 'var(--pixel-green)' : 'var(--pixel-amber)' },
      ].map(c => `
        <div class="nes-container is-dark" style="text-align:center; padding:12px !important;">
          <p style="font-size:7px; color:${c.color}; margin-bottom:6px;">${c.label}</p>
          <p style="font-size:22px; margin:0; color:${c.color}; text-shadow:0 0 10px ${c.color}99;">${c.value}</p>
        </div>
      `).join('')}
    </div>

    <!-- ── Score Distribution ── -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Score Distribution</p>
      <p style="font-size:7px; color:#555; margin-bottom:12px;">${ratedCount} rated titles</p>
      <div style="display:flex; gap:4px; align-items:flex-end; height:110px; padding:0 4px;">
        ${ratingChartHtml}
      </div>
      <div style="display:flex; justify-content:space-between; padding:0 4px; margin-top:6px;">
        <span style="font-size:7px; color:#ff2244;">← Worst</span>
        <span style="font-size:7px; color:#00ff41;">Best →</span>
      </div>
    </div>

    <!-- ── Status + Anime vs Manga side by side ── -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
      <div class="nes-container with-title is-dark">
        <p class="title">Status Breakdown</p>
        <div style="margin-top:8px;">${statusBarsHtml}</div>
      </div>
      <div class="nes-container with-title is-dark">
        <p class="title">Media Split</p>
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:80%; gap:14px; padding-top:10px;">
          <!-- Pixel "pie" as two stacked bars -->
          <div style="width:100%; height:24px; display:flex; border:2px solid #333; overflow:hidden;">
            <div style="width:${animeRatio}%; background:var(--pixel-cyan); display:flex; align-items:center; justify-content:center;">
              ${animeRatio > 15 ? `<span style="font-size:7px; color:#000;">🎬 ${animeRatio}%</span>` : ''}
            </div>
            <div style="width:${mangaRatio}%; background:#ff88ff; display:flex; align-items:center; justify-content:center;">
              ${mangaRatio > 15 ? `<span style="font-size:7px; color:#000;">📖 ${mangaRatio}%</span>` : ''}
            </div>
          </div>
          <div style="display:flex; gap:16px; font-size:8px;">
            <span style="color:var(--pixel-cyan);">■ Anime (${animeCount})</span>
            <span style="color:#ff88ff;">■ Manga (${mangaCount})</span>
          </div>
          <!-- Favorites count -->
          <div style="text-align:center; margin-top:8px; border-top:1px dashed #333; padding-top:10px; width:100%;">
            <p style="font-size:7px; color:#555; margin-bottom:4px;">FAVORITES</p>
            <p style="font-size:20px; color:var(--pixel-amber);">⭐ ${getDetailedStats()?.total ?? 0}</p>
            <p style="font-size:7px; color:#888;">(tap ⭐ in Library to add)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Genre Chart ── -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Top Genres</p>
      <div style="margin-top:10px;">${topGenres.length > 0 ? genreChartHtml : '<p style="font-size:9px;color:#555;">No genre data yet.</p>'}</div>
    </div>

    <!-- ── Monthly Activity ── -->
    <div class="nes-container with-title is-dark mb-4">
      <p class="title">Monthly Activity (Last 6 Months)</p>
      <div style="display:flex; gap:6px; align-items:flex-end; padding:10px 4px 0; height:90px;">
        ${monthChartHtml}
      </div>
    </div>
  `;

}
