/**
 * library.js - localStorage persistence layer for the user's anime/manga library.
 *
 * Key naming convention:
 *  - `user_status`   : the user's tracking status (watching/completed/etc.) — set by us
 *  - `status`        : the Jikan API field (e.g. "Finished Airing") — read-only, from API
 */
const DB_KEY = 'anime_tracker_library_v2';

export function getLibrary() {
  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLibrary(library) {
  localStorage.setItem(DB_KEY, JSON.stringify(library));
}

export function addToLibrary(item, userStatus = 'plan_to_watch') {
  const library = getLibrary();
  const existingIndex = library.findIndex(
    i => i.mal_id === item.mal_id && i.media_type === item.media_type
  );

  const isManga    = (item.media_type || 'anime') === 'manga';
  const epCount    = item.episodes || null;
  const chapCount  = item.chapters || null;
  const volCount   = item.volumes  || null;

  const isCompleted = userStatus === 'completed';
  const episodesWatched   = (isCompleted && epCount)   ? epCount   : 0;
  const watchedEpList     = (isCompleted && epCount)   ? Array.from({ length: epCount },   (_, i) => i + 1) : [];
  const chaptersRead      = (isCompleted && chapCount) ? chapCount : 0;
  const volumesRead       = (isCompleted && volCount)  ? volCount  : 0;

  const libraryEntry = {
    mal_id:        item.mal_id,
    title:         item.title,
    title_english: item.title_english || null,
    image_url:     item.images?.webp?.image_url || item.image_url || '',
    type:          item.type,
    media_type:    item.media_type || 'anime',
    episodes:      epCount,
    chapters:      chapCount,
    volumes:       volCount,
    authors:       isManga ? (item.authors || []).map(a => a.name || a) : [],
    score:         item.score || null,
    genres:        (item.genres || []).map(g => g.name ?? g),
    user_status:            userStatus,
    user_rating:            0,
    is_favorite:            false,
    episodes_watched:       isManga ? chaptersRead : episodesWatched,
    watched_episodes_list:  watchedEpList,
    chapters_read:          chaptersRead,
    volumes_read:           volumesRead,
    watched_chapters_list:  (isCompleted && chapCount) ? Array.from({ length: chapCount }, (_, i) => i + 1) : [],
    notes:         '',
    date_added:    new Date().toISOString(),
    date_updated:  new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    library[existingIndex] = { ...library[existingIndex], ...libraryEntry, date_added: library[existingIndex].date_added };
  } else {
    library.push(libraryEntry);

    // Backup reminder every 10 additions
    const count = library.length;
    if (count % 10 === 0) {
      setTimeout(() => {
        import('../components/toast.js').then(({ showToast }) => {
          showToast(`💾 ${count} titles in library! Consider exporting a backup.`, 'warning');
        });
      }, 1200);
    }
  }

  saveLibrary(library);
  return libraryEntry;
}

export function removeFromLibrary(mal_id, media_type = 'anime') {
  let library = getLibrary();
  library = library.filter(i => !(i.mal_id === mal_id && i.media_type === media_type));
  saveLibrary(library);
}

export function updateEntry(mal_id, media_type, updates) {
  const library = getLibrary();
  const index = library.findIndex(i => i.mal_id === mal_id && i.media_type === media_type);
  if (index >= 0) {
    library[index] = { ...library[index], ...updates, date_updated: new Date().toISOString() };
    saveLibrary(library);
    return library[index];
  }
  return null;
}

export function isInLibrary(mal_id, media_type = 'anime') {
  return getLibrary().some(i => i.mal_id === mal_id && i.media_type === media_type);
}

export function getFavorites() {
  return getLibrary()
    .filter(i => i.is_favorite)
    .sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0))
    .slice(0, 10);
}

export function getPlanToWatch() {
  return getLibrary().filter(i => i.user_status === 'plan_to_watch' || i.user_status === 'plan_to_read');
}

/** Basic stats for dashboard */
export function getStats() {
  const library = getLibrary();
  const animeCount = library.filter(i => i.media_type === 'anime').length;
  const mangaCount = library.filter(i => i.media_type === 'manga').length;
  const totalEps   = library.reduce((sum, i) => sum + (i.episodes_watched || 0), 0);
  const completed  = library.filter(i => i.user_status === 'completed').length;
  return { animeCount, mangaCount, totalEps, completed };
}

/** Detailed stats for the statistics page */
export function getDetailedStats() {
  const library = getLibrary();
  if (library.length === 0) return null;

  // --- Rating distribution (1-10 buckets) ---
  const ratingBuckets = Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: 0 }));
  library.forEach(i => {
    const r = Math.round(i.user_rating || 0);
    if (r >= 1 && r <= 10) ratingBuckets[r - 1].count++;
  });

  // --- Status breakdown ---
  const statusMap = { watching: 0, completed: 0, plan_to_watch: 0, on_hold: 0, dropped: 0 };
  library.forEach(i => { if (statusMap[i.user_status] !== undefined) statusMap[i.user_status]++; });

  // --- Genre breakdown ---
  const genreMap = {};
  library.forEach(item => {
    (item.genres || []).forEach(g => { genreMap[g] = (genreMap[g] || 0) + 1; });
  });
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // --- Mean score (only rated items) ---
  const ratedItems = library.filter(i => i.user_rating > 0);
  const meanScore = ratedItems.length > 0
    ? (ratedItems.reduce((s, i) => s + i.user_rating, 0) / ratedItems.length).toFixed(2)
    : null;

  // --- Time invested (anime: eps × 24 min, manga: chapters × 8 min) ---
  const animeMinutes = library
    .filter(i => i.media_type === 'anime')
    .reduce((s, i) => s + (i.episodes_watched || 0) * 24, 0);
  const mangaMinutes = library
    .filter(i => i.media_type === 'manga')
    .reduce((s, i) => s + (i.chapters_read || 0) * 8, 0);
  const totalMinutes = animeMinutes + mangaMinutes;
  const totalHours   = Math.floor(totalMinutes / 60);

  // --- Completion rate ---
  const completionRate = library.length > 0
    ? Math.round((library.filter(i => i.user_status === 'completed').length / library.length) * 100)
    : 0;

  // --- Monthly additions (last 6 months) ---
  const months = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 });
  }
  library.forEach(item => {
    const d = new Date(item.date_added);
    const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (slot) slot.count++;
  });

  // --- Anime vs Manga split ---
  const animeCount = library.filter(i => i.media_type === 'anime').length;
  const mangaCount = library.filter(i => i.media_type === 'manga').length;

  return {
    total: library.length,
    animeCount,
    mangaCount,
    ratingBuckets,
    statusMap,
    topGenres,
    meanScore,
    ratedCount: ratedItems.length,
    totalHours,
    animeMinutes,
    mangaMinutes,
    completionRate,
    months,
  };
}

export function exportLibrary() {
  const data = JSON.stringify(getLibrary(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `animind-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import - mode: 'replace' | 'merge' */
export function importLibrary(jsonString, mode = 'replace') {
  const incoming = JSON.parse(jsonString);
  if (!Array.isArray(incoming)) throw new Error('Invalid library format');

  if (mode === 'replace') {
    saveLibrary(incoming);
    return incoming.length;
  }

  // Merge: keep existing entries, add new ones, don't overwrite
  const existing = getLibrary();
  let added = 0;
  incoming.forEach(item => {
    const exists = existing.some(e => e.mal_id === item.mal_id && e.media_type === item.media_type);
    if (!exists) { existing.push(item); added++; }
  });
  saveLibrary(existing);
  return added;
}

export function clearLibrary() {
  saveLibrary([]);
}
