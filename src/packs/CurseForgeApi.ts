import logger from '../utility/Logger';
import { config } from '../Config';
import { CfFile, CfMod, LatestFileInfo } from '../types/CurseForge';

const CF_BASE = 'https://api.curseforge.com';
const GAME_ID_MINECRAFT = 432;
const CLASS_ID_MODPACK = 4471;

function getHeaders(): HeadersInit {
  if (!config.CURSEFORGE_API_KEY) {
    throw new Error('CURSEFORGE_API_KEY is required but missing.');
  }
  return {
    'x-api-key': config.CURSEFORGE_API_KEY,
    'Accept': 'application/json',
  };
}

async function cfFetch<T>(pathAndQuery: string): Promise<T> {
  const url = `${CF_BASE}${pathAndQuery}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CurseForge API ${res.status} ${res.statusText} on ${url}: ${body}`);
  }
  const json = await res.json();
  return json as T;
}

/** Normalize and matching helpers */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[._\-()\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s(to the sky|skyblock)$/g, ''); /** ignore common suffixes that might be missing in search */
}

function isSlugLike(s: string): boolean {
  return /^[a-z0-9\-]+$/.test(s);
}

function tokenize(s: string): string[] {
  const stop = new Set(['the', 'and', 'of', 'minecraft', 'modpack', 'pack']);
  return normalizeName(s)
    .split(' ')
    .filter(t => t.length > 0 && !stop.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

type RankedCandidate = {
  mod: CfMod;
  score: number;
  matchType: 'exactName' | 'exactSlug' | 'startsWith' | 'contains' | 'tokenOverlap' | 'levenshtein' | 'unknown';
};

async function searchRanked(name: string): Promise<RankedCandidate[]> {
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

  const items = (resp.data || []).filter((m: any) => typeof m?.name === 'string');
  const qNorm = normalizeName(name);
  const qTokens = new Set(tokenize(name));
  const slugLike = isSlugLike(name);

  const ranked: RankedCandidate[] = items.map((m: any) => {
    const mod: CfMod = {
      id: m.id,
      name: m.name,
      slug: m.slug ?? '',
      links: m.links,
      dateModified: m.dateModified,
      downloadCount: m.downloadCount,
    };

    const nameNorm = normalizeName(mod.name);
    let score = 0;
    let matchType: RankedCandidate['matchType'] = 'unknown';

    if (nameNorm === qNorm) {
      score = 100;
      matchType = 'exactName';
    } else if (slugLike && mod.slug?.toLowerCase() === name.toLowerCase()) {
      score = 100;
      matchType = 'exactSlug';
    } else if (nameNorm.startsWith(qNorm)) {
      score = 80;
      matchType = 'startsWith';
    } else if (nameNorm.includes(qNorm)) {
      score = 65;
      matchType = 'contains';
    } else {
      const t = new Set(tokenize(mod.name));
      const jac = jaccard(qTokens, t);
      score = Math.floor(60 + 40 * jac); /** 60..100 depending on overlap */
      matchType = 'tokenOverlap';

      const dist = levenshtein(nameNorm, qNorm);
      const maxLen = Math.max(nameNorm.length, qNorm.length) || 1;
      const penalty = Math.min(20, Math.round((dist / maxLen) * 20));
      score -= penalty;

      if (dist <= 2 && jac >= 0.6) matchType = 'levenshtein';
    }

    return { mod, score, matchType };
  });

  return ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.mod.dateModified ? Date.parse(a.mod.dateModified) : 0;
    const db = b.mod.dateModified ? Date.parse(b.mod.dateModified) : 0;
    return db - da || (b.mod.downloadCount ?? 0) - (a.mod.downloadCount ?? 0);
  });
}


export async function getLatestFileForMod(modId: number): Promise<CfFile | null> {
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
  return files[0];
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
    if (exactSlugMatch) return exactSlugMatch;
  }

  /** 2. In strict mode (PackName/URL provided), only accept high-confidence matches. */
  if (strict) {
    const strong = ranked.filter(r => 
      r.matchType === 'exactName' || 
      r.matchType === 'exactSlug' || 
      (r.score >= 85 && r.matchType === 'levenshtein')
    );
    
    if (strong.length > 0) return strong[0];

    const top = ranked.slice(0, 3).map(formatCandidate).join('; ');
    logger.warn(`[CurseForgeAPI] No strong match for "${effectiveQuery}". Top candidates: ${top}`);
    return null;
  }

  /** 3. Fallback for non-strict (FriendlyName search): just return the top candidate. */
  return ranked[0];
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
      return parts[modpacksIndex + 1];
    }

    /** Projects fallback: /projects/slug or /projects/slug/files */
    const projectsIndex = parts.indexOf('projects');
    if (projectsIndex !== -1 && parts.length > projectsIndex + 1) {
      return parts[projectsIndex + 1];
    }

    /** Generic fallback: last part if it doesn't match known subpages */
    const lastPart = parts[parts.length - 1];
    if (lastPart && !['files', 'screenshots', 'relations', 'install', 'download'].includes(lastPart.toLowerCase())) {
      return lastPart;
    }
  } catch {
    /** maybe it's not a full URL but just contains curseforge.com */
    const match = s.match(/curseforge\.com\/(?:minecraft\/modpacks|projects)\/([a-z0-9\-]+)/i);
    if (match) return match[1];
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
