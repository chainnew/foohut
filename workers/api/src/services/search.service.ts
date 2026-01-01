/**
 * Search Service
 * Handles semantic search using Vectorize and result enrichment
 */

import { Env, VectorizeMatchWithMetadata } from '../types';
import { generateEmbedding } from './embedding.service';

/**
 * Search result with relevance score
 */
export interface SearchResult {
  id: string;
  score: number;
  pageId: string;
  title: string;
  content: string;
  spaceId?: string;
  collectionId?: string;
  path?: string;
  chunkIndex?: number;
  totalChunks?: number;
}

/**
 * Enriched search result with full page data
 */
export interface EnrichedResult extends SearchResult {
  page?: {
    id: string;
    title: string;
    description?: string;
    path: string;
    slug: string;
    icon?: string;
    isPublished: boolean;
    updatedAt: number;
  };
  space?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
  };
}

/**
 * Perform semantic search using Vectorize
 *
 * @param env - Environment bindings
 * @param query - Search query text
 * @param options - Search options
 * @returns Array of search results with scores
 */
export async function semanticSearch(
  env: Env,
  query: string,
  options: {
    spaceId?: string;
    collectionId?: string;
    limit?: number;
    minScore?: number;
  } = {}
): Promise<SearchResult[]> {
  const { spaceId, collectionId, limit = 10, minScore = 0.5 } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(env.AI, query);

  // Build filter based on options
  const filter: Record<string, string> = {};
  if (spaceId) {
    filter.spaceId = spaceId;
  }
  if (collectionId) {
    filter.collectionId = collectionId;
  }

  // Query Vectorize
  const results = await env.VECTORIZE.query(queryEmbedding, {
    topK: limit * 2, // Fetch more to allow for filtering and deduplication
    returnMetadata: 'all',
    filter: Object.keys(filter).length > 0 ? filter : undefined
  });

  if (!results.matches || results.matches.length === 0) {
    return [];
  }

  // Process and deduplicate results by pageId
  const seenPages = new Set<string>();
  const searchResults: SearchResult[] = [];

  for (const match of results.matches as VectorizeMatchWithMetadata[]) {
    // Skip low-score results
    if (match.score < minScore) {
      continue;
    }

    const pageId = match.metadata?.pageId || '';

    // Skip if we've already seen this page (keep highest scoring chunk)
    if (seenPages.has(pageId)) {
      continue;
    }
    seenPages.add(pageId);

    searchResults.push({
      id: match.id,
      score: match.score,
      pageId,
      title: match.metadata?.title || 'Untitled',
      content: match.metadata?.content || '',
      spaceId: match.metadata?.spaceId,
      collectionId: match.metadata?.collectionId,
      path: match.metadata?.path,
      chunkIndex: match.metadata?.chunkIndex ? parseInt(match.metadata.chunkIndex, 10) : undefined,
      totalChunks: match.metadata?.totalChunks ? parseInt(match.metadata.totalChunks, 10) : undefined
    });

    // Stop once we have enough unique pages
    if (searchResults.length >= limit) {
      break;
    }
  }

  return searchResults;
}

/**
 * Search for similar chunks without deduplication
 * Useful for getting all relevant context for RAG
 *
 * @param env - Environment bindings
 * @param query - Search query text
 * @param options - Search options
 * @returns Array of matching chunks with scores
 */
export async function searchChunks(
  env: Env,
  query: string,
  options: {
    spaceId?: string;
    collectionId?: string;
    limit?: number;
    minScore?: number;
  } = {}
): Promise<SearchResult[]> {
  const { spaceId, collectionId, limit = 10, minScore = 0.3 } = options;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(env.AI, query);

  // Build filter
  const filter: Record<string, string> = {};
  if (spaceId) {
    filter.spaceId = spaceId;
  }
  if (collectionId) {
    filter.collectionId = collectionId;
  }

  // Query Vectorize
  const results = await env.VECTORIZE.query(queryEmbedding, {
    topK: limit,
    returnMetadata: 'all',
    filter: Object.keys(filter).length > 0 ? filter : undefined
  });

  if (!results.matches || results.matches.length === 0) {
    return [];
  }

  return (results.matches as VectorizeMatchWithMetadata[])
    .filter(match => match.score >= minScore)
    .map(match => ({
      id: match.id,
      score: match.score,
      pageId: match.metadata?.pageId || '',
      title: match.metadata?.title || 'Untitled',
      content: match.metadata?.content || '',
      spaceId: match.metadata?.spaceId,
      collectionId: match.metadata?.collectionId,
      path: match.metadata?.path,
      chunkIndex: match.metadata?.chunkIndex ? parseInt(match.metadata.chunkIndex, 10) : undefined,
      totalChunks: match.metadata?.totalChunks ? parseInt(match.metadata.totalChunks, 10) : undefined
    }));
}

/**
 * Enrich search results with full page and space data from database
 *
 * @param env - Environment bindings
 * @param results - Array of search results to enrich
 * @returns Enriched results with page and space data
 */
export async function enrichResults(
  env: Env,
  results: SearchResult[]
): Promise<EnrichedResult[]> {
  if (results.length === 0) {
    return [];
  }

  // Get unique page IDs
  const pageIds = [...new Set(results.map(r => r.pageId).filter(Boolean))];

  if (pageIds.length === 0) {
    return results as EnrichedResult[];
  }

  // Query pages from D1
  const placeholders = pageIds.map(() => '?').join(', ');
  const pagesQuery = `
    SELECT
      p.id, p.title, p.description, p.path, p.slug, p.icon,
      p.is_published as isPublished, p.updated_at as updatedAt,
      s.id as spaceId, s.name as spaceName, s.slug as spaceSlug, s.icon as spaceIcon
    FROM pages p
    LEFT JOIN spaces s ON p.space_id = s.id
    WHERE p.id IN (${placeholders})
  `;

  const { results: pageRows } = await env.DB.prepare(pagesQuery)
    .bind(...pageIds)
    .all<{
      id: string;
      title: string;
      description: string | null;
      path: string;
      slug: string;
      icon: string | null;
      isPublished: number;
      updatedAt: number;
      spaceId: string | null;
      spaceName: string | null;
      spaceSlug: string | null;
      spaceIcon: string | null;
    }>();

  // Create a map for quick lookup
  const pageMap = new Map(pageRows.map(row => [row.id, row]));

  // Enrich results
  return results.map(result => {
    const pageData = pageMap.get(result.pageId);

    const enriched: EnrichedResult = { ...result };

    if (pageData) {
      enriched.page = {
        id: pageData.id,
        title: pageData.title,
        description: pageData.description || undefined,
        path: pageData.path,
        slug: pageData.slug,
        icon: pageData.icon || undefined,
        isPublished: Boolean(pageData.isPublished),
        updatedAt: pageData.updatedAt
      };

      if (pageData.spaceId) {
        enriched.space = {
          id: pageData.spaceId,
          name: pageData.spaceName || '',
          slug: pageData.spaceSlug || '',
          icon: pageData.spaceIcon || undefined
        };
      }
    }

    return enriched;
  });
}

/**
 * Full-text search fallback using D1
 * Used when Vectorize is unavailable or for exact matches
 *
 * @param env - Environment bindings
 * @param query - Search query
 * @param options - Search options
 * @returns Array of matching pages
 */
export async function fullTextSearch(
  env: Env,
  query: string,
  options: {
    spaceId?: string;
    limit?: number;
  } = {}
): Promise<EnrichedResult[]> {
  const { spaceId, limit = 10 } = options;

  // Use LIKE for basic full-text search (D1 doesn't have native FTS)
  const searchPattern = `%${query.toLowerCase()}%`;

  let sql = `
    SELECT
      p.id, p.title, p.description, p.path, p.slug, p.icon,
      p.is_published as isPublished, p.updated_at as updatedAt,
      s.id as spaceId, s.name as spaceName, s.slug as spaceSlug, s.icon as spaceIcon
    FROM pages p
    LEFT JOIN spaces s ON p.space_id = s.id
    WHERE (LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ?)
      AND p.deleted_at IS NULL
  `;

  const params: (string | number)[] = [searchPattern, searchPattern];

  if (spaceId) {
    sql += ' AND p.space_id = ?';
    params.push(spaceId);
  }

  sql += ' ORDER BY p.updated_at DESC LIMIT ?';
  params.push(limit);

  const { results: rows } = await env.DB.prepare(sql)
    .bind(...params)
    .all<{
      id: string;
      title: string;
      description: string | null;
      path: string;
      slug: string;
      icon: string | null;
      isPublished: number;
      updatedAt: number;
      spaceId: string | null;
      spaceName: string | null;
      spaceSlug: string | null;
      spaceIcon: string | null;
    }>();

  return rows.map(row => ({
    id: row.id,
    score: 1.0, // No relevance scoring for full-text search
    pageId: row.id,
    title: row.title,
    content: row.description || '',
    spaceId: row.spaceId || undefined,
    path: row.path,
    page: {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      path: row.path,
      slug: row.slug,
      icon: row.icon || undefined,
      isPublished: Boolean(row.isPublished),
      updatedAt: row.updatedAt
    },
    space: row.spaceId ? {
      id: row.spaceId,
      name: row.spaceName || '',
      slug: row.spaceSlug || '',
      icon: row.spaceIcon || undefined
    } : undefined
  }));
}

/**
 * Hybrid search combining semantic and full-text results
 *
 * @param env - Environment bindings
 * @param query - Search query
 * @param options - Search options
 * @returns Combined and deduplicated results
 */
export async function hybridSearch(
  env: Env,
  query: string,
  options: {
    spaceId?: string;
    limit?: number;
  } = {}
): Promise<EnrichedResult[]> {
  const { spaceId, limit = 10 } = options;

  // Run both searches in parallel
  const [semanticResults, fullTextResults] = await Promise.all([
    semanticSearch(env, query, { spaceId, limit }).then(results => enrichResults(env, results)),
    fullTextSearch(env, query, { spaceId, limit })
  ]);

  // Combine and deduplicate by pageId
  const seenPages = new Set<string>();
  const combined: EnrichedResult[] = [];

  // Semantic results first (higher quality)
  for (const result of semanticResults) {
    if (!seenPages.has(result.pageId)) {
      seenPages.add(result.pageId);
      combined.push(result);
    }
  }

  // Then full-text results
  for (const result of fullTextResults) {
    if (!seenPages.has(result.pageId)) {
      seenPages.add(result.pageId);
      // Lower the score for full-text results
      combined.push({ ...result, score: result.score * 0.8 });
    }
  }

  // Sort by score and limit
  return combined
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
