/**
 * AniList GraphQL API wrapper
 * Endpoint: https://graphql.anilist.co
 * Public — no auth required. Rate limit: ~90 req/min.
 */
const ANILIST_URL = 'https://graphql.anilist.co';

async function queryAniList(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API Error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'AniList query failed');
  return json.data;
}

// ── Shared fragment for all manga fields we need ────────────────
const MANGA_FIELDS = `
  id
  title { romaji english native }
  coverImage { large medium }
  description(asHtml: false)
  chapters
  volumes
  status
  genres
  averageScore
  startDate { year }
  staff(sort: RELEVANCE, perPage: 3) {
    edges {
      role
      node { name { full } }
    }
  }
`;

/**
 * Normalize an AniList media object into our app's unified format.
 */
function normalizeAniListManga(media) {
  const authors = (media.staff?.edges || [])
    .filter(e => e.role?.toLowerCase().includes('story') || e.role?.toLowerCase().includes('art'))
    .map(e => ({ name: e.node.name.full, type: e.role }));

  // Strip HTML tags from description
  const synopsis = media.description
    ? media.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim()
    : 'No synopsis available.';

  return {
    mal_id:        media.id,
    source:        'anilist',
    title:         media.title?.romaji || media.title?.english || 'Unknown',
    title_english: media.title?.english || media.title?.romaji || 'Unknown',
    image_url:     media.coverImage?.large || media.coverImage?.medium || '',
    images:        { webp: { image_url: media.coverImage?.large || media.coverImage?.medium || '' } },
    type:          'Manga',
    media_type:    'manga',
    chapters:      media.chapters || null,
    volumes:       media.volumes || null,
    status:        media.status ? media.status.replace(/_/g, ' ') : 'Unknown',
    year:          media.startDate?.year || null,
    score:         media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
    synopsis,
    genres:        (media.genres || []).map(g => ({ name: g })),
    authors,
  };
}

/**
 * Search manga by title.
 */
export async function searchMangaAL(query, page = 1) {
  const data = await queryAniList(`
    query ($search: String, $page: Int) {
      Page(page: $page, perPage: 25) {
        media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
          ${MANGA_FIELDS}
        }
      }
    }
  `, { search: query, page });
  return { data: (data.Page.media || []).map(normalizeAniListManga) };
}

/**
 * Get top manga sorted by score.
 */
export async function getTopMangaAL(page = 1) {
  const data = await queryAniList(`
    query ($page: Int) {
      Page(page: $page, perPage: 25) {
        media(type: MANGA, sort: SCORE_DESC, format_in: [MANGA]) {
          ${MANGA_FIELDS}
        }
      }
    }
  `, { page });
  return { data: (data.Page.media || []).map(normalizeAniListManga) };
}

/**
 * Get top manhwa (Korean comics).
 */
export async function getTopManhwaAL(page = 1) {
  const data = await queryAniList(`
    query ($page: Int) {
      Page(page: $page, perPage: 25) {
        media(type: MANGA, sort: SCORE_DESC, countryOfOrigin: "KR") {
          ${MANGA_FIELDS}
        }
      }
    }
  `, { page });
  return { data: (data.Page.media || []).map(normalizeAniListManga) };
}

/**
 * Get full manga details by AniList ID.
 */
export async function getMangaByIdAL(id) {
  const data = await queryAniList(`
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        ${MANGA_FIELDS}
      }
    }
  `, { id });
  return { data: normalizeAniListManga(data.Media) };
}
