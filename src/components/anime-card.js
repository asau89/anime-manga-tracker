/**
 * Creates an anime/manga card element.
 * @param {object} item - Data object (from Jikan API or library).
 * @param {function|null} onSelect - Called when card body is clicked.
 * @param {function|null} onAdd - Called when the Add button is clicked (browse mode only).
 * @param {boolean} isLibraryItem - If true, show library-specific progress & status.
 */
export function createAnimeCard(item, onSelect = null, onAdd = null, isLibraryItem = false) {
  const card = document.createElement('div');
  card.className = 'anime-card';

  const titleText = item.title_english || item.title || 'Unknown Title';
  const image     = item.images?.webp?.image_url || item.image_url
    || 'https://placehold.co/200x280/1a1a3e/00d4ff?text=NO+IMAGE&font=monospace';
  
  const displayScore = (isLibraryItem && item.user_rating > 0) ? item.user_rating : item.score;
  const scoreStr = displayScore ?? '?';
  
  const renderStars = (rating) => {
    const r = parseFloat(rating);
    if (isNaN(r)) return `<span>⭐ ?</span>`;
    const percentage = Math.min(100, Math.max(0, (r / 10) * 100));
    return `
      <div style="display:flex; align-items:center;">
        <div style="display:inline-block; position:relative; color:#333; font-size:11px; line-height:1; letter-spacing:1px; text-shadow: 1px 1px 0px #000;">
          ★★★★★
          <div style="position:absolute; top:0; left:0; width:${percentage}%; overflow:hidden; color:#ffb400; white-space:nowrap; text-shadow: 1px 1px 0px #8a6d00;">
            ★★★★★
          </div>
        </div>
        <span style="margin-left:6px; font-weight:bold; color:var(--pixel-amber);">${r.toFixed(1)}</span>
      </div>
    `;
  };

  const mediaType = item.type || (item.media_type === 'manga' ? 'Manga' : 'Anime');

  // Status badge (library mode only)
  const userStatus   = item.user_status;
  const isManga      = item.media_type === 'manga';
  const statusColors = {
    watching:      '#00d4ff',
    completed:     '#00ff41',
    plan_to_watch: '#ffb000',
    on_hold:       '#888888',
    dropped:       '#ff2244',
  };
  const badgeColor  = statusColors[userStatus] || '#fff';
  
  let badgeText = '';
  if (userStatus) {
    if (isManga && userStatus === 'watching') badgeText = 'READING';
    else if (isManga && userStatus === 'plan_to_watch') badgeText = 'PLAN TO READ';
    else badgeText = userStatus.replace(/_/g, ' ').toUpperCase();
  }

  const statusBadge = isLibraryItem && userStatus
    ? `<div class="tracker-badge" style="border-color:${badgeColor}; color:${badgeColor};">${badgeText}</div>`
    : '';

  // Progress (library mode only)
  const totalCount   = isManga ? (item.chapters  || '?') : (item.episodes  || '?');
  const doneCount    = isManga ? (item.chapters_read || 0) : (item.episodes_watched || 0);
  const progressLabel = isManga ? 'Chapter' : 'Ep';
  const progressPct  = (totalCount !== '?' && totalCount > 0)
    ? Math.min(100, Math.round((doneCount / totalCount) * 100))
    : null;

  const progressHtml = isLibraryItem ? `
    <div style="margin-top:6px;">
      <div style="font-size:8px; color:#aaa; margin-bottom:3px;">${progressLabel}: ${doneCount} / ${totalCount}</div>
      ${progressPct !== null ? `
        <div style="height:4px; background:#222; border:1px solid #444;">
          <div style="height:100%; width:${progressPct}%; background:${badgeColor}; transition:width 0.3s;"></div>
        </div>` : ''}
    </div>` : '';

  card.innerHTML = `
    <img src="${image}" class="anime-card-image" alt="${titleText.replace(/"/g, '')}" loading="lazy" />
    <div class="anime-card-content">
      ${statusBadge}
      <h3 class="anime-title" title="${titleText.replace(/"/g, '')}">${titleText}</h3>
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:8px; margin-top:auto;">
        ${renderStars(scoreStr)}
        <span style="color:#aaa;">${mediaType}</span>
      </div>
      ${progressHtml}
    </div>
  `;

  // Add button — sits INSIDE the card, at the bottom, in browse mode
  if (!isLibraryItem && onAdd) {
    const addBtn = document.createElement('button');
    addBtn.className = 'nes-btn is-success card-add-btn-bottom';
    addBtn.textContent = '+ Add to Library';
    addBtn.onclick = (e) => {
      e.stopPropagation();
      onAdd(item);
    };
    // Append inside the content div so it flows at the bottom
    card.querySelector('.anime-card-content').appendChild(addBtn);
  }

  if (onSelect) {
    card.addEventListener('click', () => onSelect(item));
  }

  return card;
}
