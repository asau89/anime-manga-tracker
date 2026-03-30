/**
 * MangaUpdates API v1 wrapper
 * Base: https://api.mangaupdates.com/v1
 * Public endpoints require no auth key.
 * Search is POST-only. Rate limit: be polite, ~3 req/s.
 */
const BASE_URL = '/api/mangaupdates';

const delay = (ms) => new Promise(r => setTimeout(r, ms));
let lastRequestTime = 0;

async function fetchMU(endpoint, options = {}) {
  const now = Date.now();
  const since = now - lastRequestTime;
  if (since < 350) await delay(350 - since);
  lastRequestTime = Date.now();

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) throw new Error(`MangaUpdates API Error: ${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * Normalizes a MangaUpdates series record to our app's unified format.
 * Uses mal_id field to store the series_id so the rest of the app
 * doesn't need to care which source the manga came from.
 */
export function normalizeMURecord(record) {
  return {
    mal_id:        record.series_id,
    source:        'mangaupdates',
    title:         record.title || 'Unknown',
    title_english: record.title || 'Unknown',
    // Image
    image_url:     record.image?.url?.original || record.image?.url?.thumb || '',
    images:        { webp: { image_url: record.image?.url?.original || record.image?.url?.thumb || '' } },
    // Media info
    type:          record.type || 'Manga',
    media_type:    'manga',
    chapters:      record.latest_chapter || null,
    volumes:       record.latest_volume  || null,
    status:        record.status || 'Unknown',
    year:          record.year   || null,
    // Score — MangaUpdates uses a bayesian rating 1–10
    score:         record.bayesian_rating
      ? parseFloat(Number(record.bayesian_rating).toFixed(2))
      : null,
    // Description
    synopsis:      record.description
      ? record.description.replace(/<[^>]+>/g, '') // strip any HTML
      : 'No synopsis available.',
    // Genres: [{ genre: "string" }] → [{ name: "string" }]
    genres:        (record.genres || []).map(g => ({ name: g.genre })),
    // Authors: [{ name, type }]
    authors:       (record.authors || []).map(a => ({ name: a.name, type: a.type })),
    // Categories
    categories:    (record.categories || []).map(c => c.category),
  };
}

/**
 * Search manga by title.
 */
export async function searchMangaMU(query, page = 1) {
  const data = await fetchMU('/series/search', {
    method: 'POST',
    body: JSON.stringify({ search: query, page, per_page: 25 }),
  });
  return { data: (data.results || []).map(r => normalizeMURecord(r.record)) };
}

/**
 * Get top-rated manga (sorted by rating descending).
 */
export async function getTopMangaMU(page = 1) {
  const data = await fetchMU('/series/search', {
    method: 'POST',
    body: JSON.stringify({ orderby: 'rating', page, per_page: 25 }),
  });
  return { data: (data.results || []).map(r => normalizeMURecord(r.record)) };
}

/**
 * Get top manhwa specifically.
 */
export async function getTopManhwaMU(page = 1) {
  const data = await fetchMU('/series/search', {
    method: 'POST',
    body: JSON.stringify({ orderby: 'rating', type: ['Korean', 'Manhwa'], page, per_page: 25 }),
  });
  return { data: (data.results || []).map(r => normalizeMURecord(r.record)) };
}

/**
 * Get full series details by MangaUpdates series_id.
 */
export async function getMangaByIdMU(id) {
  const record = await fetchMU(`/series/${id}`);
  return { data: normalizeMURecord(record) };
}

/**
 * Get chapters/releases for a series from MangaUpdates.
 * MangaUpdates tracks scanlation releases — each release has a chapter number.
 * We deduplicate by chapter number to get a unique list of available chapters.
 * Returns: sorted array of unique chapter numbers.
 */
export async function getMangaChaptersMU(seriesId, totalChapters = null) {
  // If we know the total, just generate the list (fast path)
  // MangaUpdates releases can lag behind official chapters or have gaps,
  // so using the latest_chapter from series data as the total is more reliable.
  if (totalChapters && totalChapters > 0) {
    return Array.from({ length: totalChapters }, (_, i) => ({
      number: i + 1,
      title:  `Chapter ${i + 1}`,
    }));
  }

  // Fallback: fetch releases to find the highest chapter number
  try {
    const data = await fetchMU('/releases/search', {
      method: 'POST',
      body: JSON.stringify({ search: '', series_id: seriesId, per_page: 100, orderby: 'chapter_desc' }),
    });

    const releases = data.results || [];
    const chapNums = new Set();
    releases.forEach(r => {
      if (r.record?.chapter) {
        const num = parseFloat(r.record.chapter);
        if (!isNaN(num)) chapNums.add(Math.floor(num));
      }
    });

    const sorted = [...chapNums].sort((a, b) => a - b);
    if (sorted.length === 0) return [];

    // Generate a continuous list up to the max found chapter
    const maxChap = sorted[sorted.length - 1];
    return Array.from({ length: maxChap }, (_, i) => ({
      number: i + 1,
      title:  `Chapter ${i + 1}`,
    }));
  } catch {
    return [];
  }
}
