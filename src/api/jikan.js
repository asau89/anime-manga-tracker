const BASE_URL = 'https://api.jikan.moe/v4';

// Simple delay function for rate limiting (Jikan limit: 3 requests/second)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let lastRequestTime = 0;

async function fetchJikan(endpoint) {
  const now = Date.now();
  const timeSinceLastReq = now - lastRequestTime;
  if (timeSinceLastReq < 334) { // Roughly 3 requests per second
    await delay(334 - timeSinceLastReq);
  }
  lastRequestTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`Jikan API Error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch from Jikan:', error);
    throw error;
  }
}

export async function searchAnime(query, page = 1) {
  return await fetchJikan(`/anime?q=${encodeURIComponent(query)}&page=${page}`);
}

export async function searchManga(query, page = 1) {
  return await fetchJikan(`/manga?q=${encodeURIComponent(query)}&page=${page}`);
}

export async function getAnimeById(id) {
  return await fetchJikan(`/anime/${id}`);
}

export async function getAnimeEpisodes(id) {
  return await fetchJikan(`/anime/${id}/episodes`);
}

export async function getTopAnime(page = 1) {
  return await fetchJikan(`/top/anime?page=${page}`);
}

export async function getTopManga(page = 1, type = null) {
  const typeParam = type ? `&type=${type}` : '';
  return await fetchJikan(`/top/manga?page=${page}${typeParam}`);
}

export async function getMangaById(id) {
  return await fetchJikan(`/manga/${id}`);
}

export async function getSeasonNow() {
  return await fetchJikan(`/seasons/now`);
}
