import logger from './Logger';
import { config } from '../Config';

export type CfMod = {
  id: number;
  name: string;
  slug: string;
  links?: { websiteUrl?: string };
  dateModified?: string;
  downloadCount?: number;
};

export type CfFile = {
  id: number;
  displayName: string;
  fileName: string;
  fileDate: string; // ISO
};

export type LatestFileInfo = {
  mod: CfMod;
  latestFile: CfFile;
  latestFileUrl: string; // Project files URL
  matchScore?: number;
  matchType?: string;
};

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

// Normalize and matching helpers
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[._\-()\[\]:]/g, ' ')
    .replace(/\s+/g, ' ');
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
  const q = new URLSearchParams({
    gameId: String(GAME_ID_MINECRAFT),
    classId: String(CLASS_ID_MODPACK),
    searchFilter: name,
    sortField: '2', // popularity
    sortOrder: 'desc',
    pageSize: '50',
  });
  type Resp = { data: any[] };
  const resp = await cfFetch<Resp>(`/v1/mods/search?${q.toString()}`);
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

    if (nameNorm === qNorm) { score = 100; matchType = 'exactName'; }
    else if (slugLike && mod.slug && mod.slug.toLowerCase() === name.toLowerCase()) { score = 100; matchType = 'exactSlug'; }
    else if (nameNorm.startsWith(qNorm)) { score = 80; matchType = 'startsWith'; }
    else if (nameNorm.includes(qNorm)) { score = 65; matchType = 'contains'; }
    else {
      const t = new Set(tokenize(mod.name));
      const jac = jaccard(qTokens, t);
      score = Math.floor(60 + 40 * jac); // 60..100 depending on overlap
      matchType = 'tokenOverlap';
      // tweak with distance
      const dist = levenshtein(nameNorm, qNorm);
      const maxLen = Math.max(nameNorm.length, qNorm.length) || 1;
      const penalty = Math.min(20, Math.round((dist / maxLen) * 20));
      score -= penalty;
      if (dist <= 2 && jac >= 0.6) matchType = 'levenshtein';
    }

    return { mod, score, matchType };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.mod.dateModified ? Date.parse(a.mod.dateModified) : 0;
    const db = b.mod.dateModified ? Date.parse(b.mod.dateModified) : 0;
    if (db !== da) return db - da;
    const dca = a.mod.downloadCount ?? 0;
    const dcb = b.mod.downloadCount ?? 0;
    return dcb - dca;
  });

  return ranked;
}


export async function getLatestFileForMod(modId: number): Promise<CfFile | null> {
  // https://docs.curseforge.com/#get-mod-files
  // We'll request a reasonable page size and pick most recent by fileDate
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
  const ranked = await searchRanked(query);
  if (ranked.length === 0) return null;

  // If strict (PackName provided), accept only strong matches
  if (strict) {
    const strong = ranked.filter(r => r.matchType === 'exactName' || r.matchType === 'exactSlug');
    if (strong.length > 0) return strong[0];
    // No strong match — log top candidates and return null to avoid mismatch
    const top = ranked.slice(0, 3).map(formatCandidate).join('; ');
    logger.warn(`[CurseForgeAPI] No strong match for "${query}". Top candidates: ${top}`);
    return null;
  }

  // Non-strict: return best-ranked candidate
  return ranked[0];
}

export async function getLatestByPackNameAPI(packName: string, opts?: { strict?: boolean }): Promise<LatestFileInfo | null> {
  const strict = !!opts?.strict;
  try {
    const selected = await selectBestMod(packName, strict);
    if (!selected) return null;
    const mod = selected.mod;
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
