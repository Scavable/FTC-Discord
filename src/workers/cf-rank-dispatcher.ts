import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { CfMod } from '../types/CurseForge.js';
import logger from '../utility/Logger.js';

type MatchType = 'exactName' | 'exactSlug' | 'startsWith' | 'contains' | 'tokenOverlap' | 'levenshtein' | 'unknown';
export type RankedCandidate = { mod: CfMod; score: number; matchType: MatchType };

function normalizeName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[._\-()\[\]:]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s(to the sky|skyblock)$/g, '');
}

function isSlugLike(s: string): boolean {
  return /^[a-z0-9\-]+$/.test(String(s || ''));
}

function tokenize(s: string): string[] {
  const stop = new Set(['the', 'and', 'of', 'minecraft', 'modpack', 'pack']);
  return normalizeName(s)
    .split(' ')
    .filter((t) => t.length > 0 && !stop.has(t));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function levenshtein(a: string, b: string): number {
  a = String(a || '');
  b = String(b || '');
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function rankCandidatesLocally(items: any[], query: string): RankedCandidate[] {
  const slugLike = isSlugLike(query);
  const qNorm = normalizeName(query);
  const qTokens = new Set(tokenize(query));

  const ranked: RankedCandidate[] = (Array.isArray(items) ? items : [])
    .filter((m) => m && typeof m.name === 'string')
    .map((m) => {
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
      let matchType: MatchType = 'unknown';

      if (nameNorm === qNorm) {
        score = 100;
        matchType = 'exactName';
      } else if (slugLike && (mod.slug || '').toLowerCase() === String(query).toLowerCase()) {
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
        score = Math.floor(60 + 40 * jac);
        matchType = 'tokenOverlap';

        const dist = levenshtein(nameNorm, qNorm);
        const maxLen = Math.max(nameNorm.length, qNorm.length) || 1;
        const penalty = Math.min(20, Math.round((dist / maxLen) * 20));
        score -= penalty;

        if (dist <= 2 && jac >= 0.6) matchType = 'levenshtein';
      }

      return { mod, score, matchType };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = a.mod.dateModified ? Date.parse(a.mod.dateModified) : 0;
      const db = b.mod.dateModified ? Date.parse(b.mod.dateModified) : 0;
      return db - da || (b.mod.downloadCount ?? 0) - (a.mod.downloadCount ?? 0);
    });

  return ranked;
}

function getWorkerUrl(): URL | null {
  const candidates = [
    new URL('./workers/cf-rank-worker.js', import.meta.url),
    new URL('./cf-rank-worker.js', import.meta.url),
    new URL('../workers/cf-rank-worker.js', import.meta.url),
    new URL('../../src/workers/cf-rank-worker.js', import.meta.url),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(fileURLToPath(candidate))) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

let singleton: Worker | null = null;
let pending = new Map<
  number,
  {
    resolve: (v: RankedCandidate[]) => void;
    items: any[];
    query: string;
    timer: NodeJS.Timeout;
  }
>();
let nextId = 1;

function ensureWorker(): Worker | null {
  if (singleton) return singleton;

  const workerUrl = getWorkerUrl();
  if (!workerUrl) {
    logger.debug('[RankWorker] Worker script not found on disk; ranking will execute inline.');
    return null;
  }

  try {
    const worker = new Worker(workerUrl);
    singleton = worker;

    worker.on('message', (msg: any) => {
      const id = msg?.id as number | undefined;
      if (!id) return;
      const entry = pending.get(id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(id);
      if (msg && msg.ok) {
        entry.resolve(msg.ranked as RankedCandidate[]);
      } else {
        logger.warn(`[RankWorker] Worker reported error: ${msg?.error}; falling back to inline ranking.`);
        entry.resolve(rankCandidatesLocally(entry.items, entry.query));
      }
    });

    worker.on('error', (err: any) => {
      logger.warn(`[RankWorker] Worker error: ${err?.message ?? err}; resolving pending requests inline.`);
      for (const [id, p] of pending) {
        clearTimeout(p.timer);
        p.resolve(rankCandidatesLocally(p.items, p.query));
        pending.delete(id);
      }
      singleton = null;
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`[RankWorker] Worker exited with code ${code}; resolving pending requests inline.`);
        for (const [id, p] of pending) {
          clearTimeout(p.timer);
          p.resolve(rankCandidatesLocally(p.items, p.query));
          pending.delete(id);
        }
      }
      singleton = null;
    });

    return singleton;
  } catch (err: any) {
    logger.warn(`[RankWorker] Failed to create Worker: ${err?.message ?? err}; falling back to inline ranking.`);
    singleton = null;
    return null;
  }
}

export async function rankCandidatesInWorker(
  items: any[],
  query: string,
  opts?: { timeoutMs?: number }
): Promise<RankedCandidate[]> {
  const timeoutMs = opts?.timeoutMs ?? 5_000;
  const worker = ensureWorker();

  if (!worker) {
    return rankCandidatesLocally(items, query);
  }

  const id = nextId++;
  return await new Promise<RankedCandidate[]>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      logger.warn(`[RankWorker] Worker request #${id} timed out; falling back to inline ranking.`);
      resolve(rankCandidatesLocally(items, query));
    }, timeoutMs);

    pending.set(id, { resolve, items, query, timer });
    try {
      worker.postMessage({ type: 'rank', id, items, query });
    } catch (err: any) {
      clearTimeout(timer);
      pending.delete(id);
      logger.warn(`[RankWorker] Failed to post message to worker: ${err?.message ?? err}; falling back inline.`);
      resolve(rankCandidatesLocally(items, query));
    }
  });
}
