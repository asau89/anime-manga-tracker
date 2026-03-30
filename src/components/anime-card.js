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
  const score     = item.score ?? '?';
  const mediaType = item.type || (item.media_type === 'manga' ? 'Manga' : 'Anime');

  // Status badge (library mode only)
  const userStatus   = item.user_status;
  const statusColors = {
    watching:      '#00d4ff',
    completed:     '#00ff41',
    plan_to_watch: '#ffb000',
    on_hold:       '#888888',
    dropped:       '#ff2244',
  };
  const badgeColor  = statusColors[userStatus] || '#fff';
  const statusBadge = isLibraryItem && userStatus
    ? `<div class="tracker-badge" style="border-color:${badgeColor}; color:${badgeColor};">${userStatus.replace(/_/g, ' ').toUpperCase()}</div>`
    : '';

  // Progress (library mode only)
  const isManga      = item.media_type === 'manga';
  const totalCount   = isManga ? (item.chapters  || '?') : (item.episodes  || '?');
  const doneCount    = isManga ? (item.chapters_read || 0) : (item.episodes_watched || 0);
  const progressLabel = isManga ? 'Ch' : 'Ep';
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
        <span>⭐ ${score}</span>
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
