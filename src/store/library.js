/**
 * library.js - localStorage persistence layer for the user's anime/manga library.
 * 
 * Key naming convention:
 *  - `user_status`   : the user's tracking status (watching/completed/etc.) — set by us
 *  - `status`        : the Jikan API field (e.g. "Finished Airing") — read-only, from API
 */
const DB_KEY = 'anime_tracker_library_v2';

/**
 * Returns the full library array.
 * @returns {Array}
 */
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

/**
 * Adds or updates an item in the library.
 * @param {object} item - Jikan API item object
 * @param {string} userStatus - One of: watching, completed, plan_to_watch, on_hold, dropped
 */
export function addToLibrary(item, userStatus = 'plan_to_watch') {
  const library = getLibrary();
  const existingIndex = library.findIndex(
    i => i.mal_id === item.mal_id && i.media_type === item.media_type
  );

  const isManga    = (item.media_type || 'anime') === 'manga';
  const epCount    = item.episodes || null;
  const chapCount  = item.chapters || null;
  const volCount   = item.volumes  || null;

  // Auto-fill progress when adding as Completed
  const isCompleted = userStatus === 'completed';
  const episodesWatched    = (isCompleted && epCount)    ? epCount   : 0;
  const watchedEpList      = (isCompleted && epCount)    ? Array.from({ length: epCount },   (_, i) => i + 1) : [];
  const chaptersRead       = (isCompleted && chapCount)  ? chapCount : 0;
  const volumesRead        = (isCompleted && volCount)   ? volCount  : 0;

  const libraryEntry = {
    mal_id:        item.mal_id,
    title:         item.title,
    title_english: item.title_english || null,
    image_url:     item.images?.webp?.image_url || item.image_url || '',
    type:          item.type,
    media_type:    item.media_type || 'anime',
    // Anime fields
    episodes:      epCount,
    // Manga fields
    chapters:      chapCount,
    volumes:       volCount,
    authors:       isManga ? (item.authors || []).map(a => a.name || a) : [],
    // Common
    score:         item.score || null,
    genres:        (item.genres || []).map(g => g.name ?? g),
    // User-managed fields
    user_status:            userStatus,
    user_rating:            0,
    // Anime progress
    episodes_watched:       isManga ? chaptersRead : episodesWatched,
    watched_episodes_list:  watchedEpList,
    // Manga progress
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
  }

  saveLibrary(library);
  return libraryEntry;
}

/**
 * Removes an item from the library.
 */
export function removeFromLibrary(mal_id, media_type = 'anime') {
  let library = getLibrary();
  library = library.filter(i => !(i.mal_id === mal_id && i.media_type === media_type));
  saveLibrary(library);
}

/**
 * Updates specific fields of a library entry.
 */
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

/**
 * Checks if an item is already in the library.
 */
export function isInLibrary(mal_id, media_type = 'anime') {
  return getLibrary().some(i => i.mal_id === mal_id && i.media_type === media_type);
}

/**
 * Returns library statistics.
 */
export function getStats() {
  const library = getLibrary();
  const animeCount = library.filter(i => i.media_type === 'anime').length;
  const mangaCount = library.filter(i => i.media_type === 'manga').length;
  const totalEps = library.reduce((sum, i) => sum + (i.episodes_watched || 0), 0);
  const completed = library.filter(i => i.user_status === 'completed').length;
  return { animeCount, mangaCount, totalEps, completed };
}

/**
 * Exports the library as a downloadable JSON file.
 */
export function exportLibrary() {
  const data = JSON.stringify(getLibrary(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anime-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a library from a JSON file (replaces current data).
 */
export function importLibrary(jsonString) {
  const data = JSON.parse(jsonString);
  if (!Array.isArray(data)) throw new Error('Invalid library format');
  saveLibrary(data);
}
