import { createRequire } from 'node:module';
import { parentPort } from 'worker_threads';

createRequire(import.meta.url);
function normalizeName(s) {
  return String(s || "").toLowerCase().trim().replace(/[._\-()\[\]:]/g, " ").replace(/\s+/g, " ").replace(/\s(to the sky|skyblock)$/g, "");
}
function isSlugLike(s) {
  return /^[a-z0-9\-]+$/.test(String(s || ""));
}
function tokenize(s) {
  const stop = /* @__PURE__ */ new Set(["the", "and", "of", "minecraft", "modpack", "pack"]);
  return normalizeName(s).split(" ").filter((t) => t.length > 0 && !stop.has(t));
}
function jaccard(a, b) {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const union = (/* @__PURE__ */ new Set([...a, ...b])).size;
  return union === 0 ? 0 : inter / union;
}
function levenshtein(a, b) {
  a = String(a || "");
  b = String(b || "");
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
function rank(items, query) {
  const slugLike = isSlugLike(query);
  const qNorm = normalizeName(query);
  const qTokens = new Set(tokenize(query));
  const ranked = items.filter((m) => m && typeof m.name === "string").map((m) => {
    const mod = {
      id: m.id,
      name: m.name,
      slug: m.slug ?? "",
      links: m.links,
      dateModified: m.dateModified,
      downloadCount: m.downloadCount
    };
    const nameNorm = normalizeName(mod.name);
    let score = 0;
    let matchType = "unknown";
    if (nameNorm === qNorm) {
      score = 100;
      matchType = "exactName";
    } else if (slugLike && (mod.slug || "").toLowerCase() === String(query).toLowerCase()) {
      score = 100;
      matchType = "exactSlug";
    } else if (nameNorm.startsWith(qNorm)) {
      score = 80;
      matchType = "startsWith";
    } else if (nameNorm.includes(qNorm)) {
      score = 65;
      matchType = "contains";
    } else {
      const t = new Set(tokenize(mod.name));
      const jac = jaccard(qTokens, t);
      score = Math.floor(60 + 40 * jac);
      matchType = "tokenOverlap";
      const dist = levenshtein(nameNorm, qNorm);
      const maxLen = Math.max(nameNorm.length, qNorm.length) || 1;
      const penalty = Math.min(20, Math.round(dist / maxLen * 20));
      score -= penalty;
      if (dist <= 2 && jac >= 0.6) matchType = "levenshtein";
    }
    return { mod, score, matchType };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const da = a.mod.dateModified ? Date.parse(a.mod.dateModified) : 0;
    const db = b.mod.dateModified ? Date.parse(b.mod.dateModified) : 0;
    return db - da || (b.mod.downloadCount ?? 0) - (a.mod.downloadCount ?? 0);
  });
  return ranked;
}
if (parentPort) {
  parentPort.on("message", (msg) => {
    try {
      if (!msg || msg.type !== "rank") return;
      const { id, items, query } = msg;
      const ranked = rank(Array.isArray(items) ? items : [], String(query ?? ""));
      parentPort.postMessage({ ok: true, id, ranked });
    } catch (err) {
      parentPort.postMessage({ ok: false, id: msg?.id, error: err?.message || String(err) });
    }
  });
}
//# sourceMappingURL=cf-rank-worker.js.map
//# sourceMappingURL=cf-rank-worker.js.map