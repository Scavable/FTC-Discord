import logger from '../utility/Logger.js';
import { config } from '../Config.js';
import type { CfFile, CfMod, LatestFileInfo } from '../types/CurseForge.js';
import { rankCandidatesInWorker } from '../workers/cf-rank-dispatcher.js';
import { KEEP_ALIVE_INITIALIZED } from '../utility/http.js';
import { cfHttpLimit } from '../utility/limiters.js';

const CF_BASE = 'https://api.curseforge.com';
const GAME_ID_MINECRAFT = 432;
const CLASS_ID_MODPACK = 4471;

function getHeaders(): Record<string, string> {
  if (!config.CURSEFORGE_API_KEY) {
    throw new Error('CURSEFORGE_API_KEY is required but missing.');
  }
  return {
    'x-api-key': config.CURSEFORGE_API_KEY,
    'Accept': 'application/json',
  };
}

async function cfFetch<T>(pathAndQuery: string): Promise<T> {
  // Touch symbol so bundlers keep the module
  if (!KEEP_ALIVE_INITIALIZED) { /* no-op */ }
  const url = `${CF_BASE}${pathAndQuery}`;
  const res = await cfHttpLimit(() => fetch(url, { headers: getHeaders() }));
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CurseForge API ${res.status} ${res.statusText} on ${url}: ${body}`);
  }
  const json = await res.json();
  return json as T;
}

function isSlugLike(s: string): boolean {
  return /^[a-z0-9\-]+$/.test(s);
}

// Removed local ranking helpers; ranking is handled by the worker

type RankedCandidate = {
  mod: CfMod;
  score: number;
  matchType: 'exactName' | 'exactSlug' | 'startsWith' | 'contains' | 'tokenOverlap' | 'levenshtein' | 'unknown';
};

// Lightweight TTL LRU cache
type CacheEntry<V> = { v: V; expires: number };
function makeCache<K, V>(max: number, ttlMs: number) {
  const map = new Map<K, CacheEntry<V>>();
  return {
    get(key: K): V | undefined {
      const e = map.get(key);
      if (!e) return undefined;
      if (Date.now() > e.expires) {
        map.delete(key);
        return undefined;
      }
      // LRU bump
      map.delete(key);
      map.set(key, e);
      return e.v;
    },
    set(key: K, v: V) {
      if (map.size >= max) {
        // evict least recently used
        const firstKey = map.keys().next().value as K | undefined;
        if (firstKey !== undefined) map.delete(firstKey);
      }
      map.set(key, { v, expires: Date.now() + ttlMs });
    },
    clear() { map.clear(); },
  };
}

const searchCache = makeCache<string, RankedCandidate[]>(100, 10 * 60 * 1000); // 10 min
const latestFileCache = makeCache<number, CfFile | null>(200, 2 * 60 * 1000); // 2 min

async function searchRanked(name: string): Promise<RankedCandidate[]> {
  const cached = searchCache.get(name);
  if (cached) return cached;
  /** 1. If it's a numeric ID, fetch it directly. */
  if (/^\d+$/.test(name)) {
    try {
      const { data: m } = await cfFetch<{ data: any }>(`/v1/mods/${name}`);
      if (m?.name) {
        return [{
          mod: {
            id: m.id,
            name: m.name,
            slug: m.slug ?? '',
            links: m.links,
            dateModified: m.dateModified,
            downloadCount: m.downloadCount,
          },
          score: 100,
          matchType: 'exactSlug',
        }];
      }
    } catch { /** fallback to search */ }
  }

  const q = new URLSearchParams({
    gameId: String(GAME_ID_MINECRAFT),
    classId: String(CLASS_ID_MODPACK),
    sortField: '2', /** popularity */
    sortOrder: 'desc',
    pageSize: '50',
  });

  /** 2. Perform initial search (slug or name) */
  if (isSlugLike(name)) {
    q.set('slug', name);
  } else {
    q.set('searchFilter', name);
  }

  type Resp = { data: any[] };
  logger.debug(`[CurseForgeAPI] Searching modpacks for "${name}" (${isSlugLike(name) ? 'slug' : 'filter'})`);
  let resp = await cfFetch<Resp>(`/v1/mods/search?${q.toString()}`);

  /** 3. Fallback: if slug search failed, try generic filter */
  if (isSlugLike(name) && (!resp.data || resp.data.length === 0)) {
    q.delete('slug');
    q.set('searchFilter', name);
    resp = await cfFetch<Resp>(`/v1/mods/search?${q.toString()}`);
  }

  /** 4. Fallback: if still nothing, try cleaning "noisy" names (e.g., "ATM10: To the Sky - v1.0") */
  if ((!resp.data || resp.data.length === 0) && (name.includes('-') || name.includes(':'))) {
    const cleaner = name.split(/[:\-]/)[0].trim();
    if (cleaner.length > 3 && cleaner !== name) {
      q.delete('slug');
      q.set('searchFilter', cleaner);
      resp = await cfFetch<Resp>(`/v1/mods/search?${q.toString()}`);
    }
  }

  const items = (resp.data || [])
    .filter((m: any) => typeof m?.name === 'string')
    .map((m: any) => ({
      id: m.id,
      name: m.name,
      slug: m.slug ?? '',
      links: m.links,
      dateModified: m.dateModified,
      downloadCount: m.downloadCount,
    }));

  // Offload ranking computation to a worker thread for better responsiveness
  logger.deepDebug(`[CurseForgeAPI] Found ${items.length} raw candidates for "${name}": ${items.slice(0, 10).map((m:any) => `${m.name}#${m.id}`).join(', ')}`);
  const ranked = await rankCandidatesInWorker(items, name);
  logger.deepDebug(`[CurseForgeAPI] Ranked candidates for "${name}": ${ranked.slice(0, 5).map(formatCandidate).join('; ')}`);
  searchCache.set(name, ranked);
  return ranked;
}


export async function getLatestFileForMod(modId: number): Promise<CfFile | null> {
  const cached = latestFileCache.get(modId);
  if (cached !== undefined) return cached;
  /**
   * https://docs.curseforge.com/#get-mod-files
   * We'll request a reasonable page size and pick most recent by fileDate
   */
  type Resp = { data: CfFile[] };
  const q = new URLSearchParams({ pageSize: '50' });
  const resp = await cfFetch<Resp>(`/v1/mods/${modId}/files?${q.toString()}`);
  const files = resp.data || [];
  if (files.length === 0) return null;
  files.sort((a, b) => new Date(b.fileDate).getTime() - new Date(a.fileDate).getTime());
  const latest = files[0];
  if (!latest) {
    latestFileCache.set(modId, null);
    return null;
  }
  latestFileCache.set(modId, latest);
  return latest;
}

function formatCandidate(c: RankedCandidate): string {
  return `${c.mod.name} (${c.mod.slug || 'no-slug'}#${c.mod.id}) score=${c.score} type=${c.matchType}`;
}

async function selectBestMod(query: string, strict: boolean): Promise<RankedCandidate | null> {
  const urlSlug = extractSlugFromUrl(query);
  const effectiveQuery = urlSlug || query;

  const ranked = await searchRanked(effectiveQuery);
  if (ranked.length === 0) return null;

  /** 1. If we have a slug from a URL, prioritize the exact slug match. */
  if (urlSlug) {
    const exactSlugMatch = ranked.find(r => r.mod.slug.toLowerCase() === urlSlug.toLowerCase());
    if (exactSlugMatch) {
      logger.info(`[CurseForgeAPI] Pack match: "${effectiveQuery}" -> ${exactSlugMatch.mod.name} (#${exactSlugMatch.mod.id}) [${exactSlugMatch.matchType}, score=${Math.round(exactSlugMatch.score)}]`);
      return exactSlugMatch;
    }
  }

  /** 2. In strict mode (PackName/URL provided), only accept high-confidence matches. */
  if (strict) {
    const strong = ranked.filter(r => 
      r.matchType === 'exactName' || 
      r.matchType === 'exactSlug' || 
      (r.score >= 85 && r.matchType === 'levenshtein')
    );
    
    if (strong.length > 0) {
      const best = strong[0]!;
      logger.info(`[CurseForgeAPI] Pack match: "${effectiveQuery}" -> ${best.mod.name} (#${best.mod.id}) [${best.matchType}, score=${Math.round(best.score)}]`);
      logger.debug(`[CurseForgeAPI] Strict strong candidates for "${effectiveQuery}": ${strong.slice(0, 5).map(formatCandidate).join('; ')}`);
      return best;
    }

    const top = ranked.slice(0, 3).map(formatCandidate).join('; ');
    logger.warn(`[CurseForgeAPI] No strong match for "${effectiveQuery}". Top candidates: ${top}`);
    return null;
  }

  /** 3. Fallback for non-strict (FriendlyName search): just return the top candidate. */
  const best = ranked[0]!;
  logger.info(`[CurseForgeAPI] Pack match (non-strict): "${effectiveQuery}" -> ${best.mod.name} (#${best.mod.id}) [${best.matchType}, score=${Math.round(best.score)}]`);
  logger.debug(`[CurseForgeAPI] Top candidates for "${effectiveQuery}": ${ranked.slice(0, 5).map(formatCandidate).join('; ')}`);
  return best;
}

export function extractSlugFromUrl(s: string): string | null {
  if (!s.includes('curseforge.com/')) return null;
  try {
    const url = new URL(s);
    const path = url.pathname.replace(/\/$/, ''); /** remove trailing slash */
    const parts = path.split('/');

    /**
     * Standard modpack URL: /minecraft/modpacks/slug
     * Files page: /minecraft/modpacks/slug/files
     * Specific file: /minecraft/modpacks/slug/files/12345
     * We want the part after 'modpacks'
     */
    const modpacksIndex = parts.indexOf('modpacks');
    if (modpacksIndex !== -1 && parts.length > modpacksIndex + 1) {
      return parts[modpacksIndex + 1] ?? null;
    }

    /** Projects fallback: /projects/slug or /projects/slug/files */
    const projectsIndex = parts.indexOf('projects');
    if (projectsIndex !== -1 && parts.length > projectsIndex + 1) {
      return parts[projectsIndex + 1] ?? null;
    }

    /** Generic fallback: last part if it doesn't match known subpages */
    const lastPart = parts[parts.length - 1];
    if (lastPart && !['files', 'screenshots', 'relations', 'install', 'download'].includes(lastPart.toLowerCase())) {
      return lastPart ?? null;
    }
  } catch {
    /** maybe it's not a full URL but just contains curseforge.com */
    const match = s.match(/curseforge\.com\/(?:minecraft\/modpacks|projects)\/([a-z0-9\-]+)/i);
    if (match) return match[1] ?? null;
  }
  return null;
}

export async function getLatestByPackNameAPI(packName: string, opts?: { strict?: boolean }): Promise<LatestFileInfo | null> {
  const strict = !!opts?.strict;
  try {
    const selected = await selectBestMod(packName, strict);
    if (!selected) return null;

    const { mod } = selected;
    const latestFile = await getLatestFileForMod(mod.id);
    if (!latestFile) return null;

    const modPage = mod.slug
      ? `https://www.curseforge.com/minecraft/modpacks/${mod.slug}`
      : (mod.links?.websiteUrl || `https://www.curseforge.com/projects/${mod.id}`);
    const latestFileUrl = `${modPage}/files/${latestFile.id}`;

    return { mod, latestFile, latestFileUrl, matchScore: selected.score, matchType: selected.matchType };
  } catch (err: any) {
    logger.warn(`[CurseForgeAPI] Failed to get latest for "${packName}": ${err?.message ?? err}`);
    return null;
  }
}
