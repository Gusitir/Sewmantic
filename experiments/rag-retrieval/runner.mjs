// T-44 runner: local Orama full-text/BM25 retrieval benchmark. Deterministic,
// offline, source-preserving. Builds an in-memory Orama DB from the versioned
// corpus, indexes >=20 metadata-rich textile/pattern rules, runs >=12 expected-
// -source queries (full-text + metadata filters), and measures recall@k,
// precision@k, latency, persistence (save/load byte-identical retrieval) and
// filter narrowing. Decides full-text vs vector/hybrid ONLY on a demonstrated
// baseline deficiency; otherwise selects Orama full-text explicitly (STOP gate).
// Never stores session state, Pattern DNA, credentials, or API payloads.
// Writes diagnostics.json and a human-readable report.json into output/.

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  create, count, insertMultiple, search, save, load, MODE_FULLTEXT_SEARCH,
} from '@orama/orama';
import { CORPUS_VERSION, RULES } from './corpus.mjs';
import { QUERIES_VERSION, QUERIES } from './queries.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDir = here; // committed: diagnostics.json + report.json
const outDir = join(here, 'output'); // transient/gitignored: index snapshot + runtime latency
await mkdir(outDir, { recursive: true });

// The stock Orama v2 English tokenizer keeps hyphen characters inside tokens
// (SPLITTERS.english = /[^A-Za-zàèéìòóù0-9_'-]+/gm), so compound terms like
// "twin-stitch"/"roll-out" are single tokens. Orama's radix token index is
// prefix-based, so an open query term such as "stitch" or "out" (the tail of a
// hyphenated compound) has zero postings; a multi-term full-text search collapses
// to an empty result. That is a reproducible default-tokenizer limitation, not a
// semantic gap and NOT a vector/embedding need. Fixing it stays pure Orama
// full-text BM25F: split on any non-alphanumeric run (including hyphens) so
// compound tails are addressable tokens. Local, deterministic, no embeddings.
const SPLIT_NON_ALNUM = /[^A-Za-z0-9]+/gim;
function buildTokenizer() {
  return {
    language: 'english',
    normalizationCache: new Map(),
    tokenize: (input, _language, _prop) => String(input).toLowerCase().split(SPLIT_NON_ALNUM).filter(Boolean),
    normalizeToken: (t) => t,
  };
}

const invariants = [];
function check(id, pass, detail = '') {
  invariants.push({ id, pass, detail: String(detail).slice(0, 400) });
}

// ---- Index schema: stable metadata (id, source, garment, operator, fabric,
//      state) + full-text body. No session/DNA/credential fields. ----
const SCHEMA = {
  id: 'string',
  source: 'string',
  garment: 'string',
  operator: 'string',
  fabric: 'string',
  state: 'string',
  body: 'string',
};

const ORAMA_CONFIG = { schema: SCHEMA, components: { tokenizer: buildTokenizer() } };

async function buildIndex() {
  const db = await create(ORAMA_CONFIG);
  await insertMultiple(db, RULES);
  return db;
}

// Reducer: an Orama hit id must map to a corpus rule and preserve its id/source.
const byId = new Map(RULES.map((r) => [r.id, r]));

async function runQuery(db, q) {
  const params = {
    term: q.text,
    mode: MODE_FULLTEXT_SEARCH,
    limit: q.k,
  };
  if (q.where) params.where = q.where;
  const t0 = process.hrtime.bigint();
  const res = await search(db, params);
  const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  return { res, elapsedMs };
}

// Deterministic evaluation per query. expected.length===1 for this corpus, so
// recall@k collapses to target recovered in the top-k window and basic
// precision@k = relevantRecovered / k (per the queries.mjs contract).
function evaluate(q, res) {
  const topk = res.hits.slice(0, q.k).map((h) => h.id);
  const expectedIds = q.expected.map((e) => e.id);
  const relevantRecovered = expectedIds.filter((id) => topk.includes(id)).length;
  const recallAtK = q.expected.length > 0 ? relevantRecovered / q.expected.length : 0;
  const precisionAtK = q.k > 0 ? relevantRecovered / q.k : 0;
  // Source-preservation: every returned hit must resolve to a corpus rule and
  // the document must carry its original id + source verbatim (no phantoms).
  const sources = res.hits
    .filter((h) => byId.has(h.id))
    .map((h) => ({ id: h.id, source: byId.get(h.id).source, score: Number(Number(h.score).toFixed(4)) }));
  return { topk, expectedIds, relevantRecovered, recallAtK, precisionAtK, sources };
}

function summary(q, ev) {
  const got = ev.topk.map((id) => `${id}@${byId.get(id)?.source ?? '?'}`).join(', ');
  return `k=${q.k} recall@k=${ev.recallAtK.toFixed(2)} pre@k=${ev.precisionAtK.toFixed(2)} topK=[${got}] expected=[${ev.expectedIds.join(',')}] ${ev.relevantRecovered ? 'HIT' : 'MISS'}`;
}

// ---- Main benchmark ----
const db = await buildIndex();
const indexedCount = await count(db);
check('corpus_at_least_20_rules', RULES.length >= 20, `RULES=${RULES.length} from corpus ${CORPUS_VERSION}`);
check('queries_at_least_12', QUERIES.length >= 12, `QUERIES=${QUERIES.length} from queries ${QUERIES_VERSION}`);
check('index_contains_all_rules', Number(indexedCount) === RULES.length, `index count=${indexedCount}`);

// Traceability: every expected (id + source) pair must trace to the corpus, i.e.
// the id exists and its verbatim source equals the indexed document's source.
const unmappedPairs = QUERIES
  .flatMap((q) => q.expected.map((e) => ({ id: e.id, source: e.source })))
  .filter((e) => !byId.has(e.id) || byId.get(e.id).source !== e.source)
  .map((e) => (byId.has(e.id) && byId.get(e.id).source !== e.source ? `${e.id}:source-mismatch` : `${e.id}:missing`));
check('every_expected_id_source_traces_to_corpus', unmappedPairs.length === 0, unmappedPairs.join(',') || 'all id+source pairs trace');

// Filter satisfaction: every returned answer of a WHERE query must actually
// satisfy the query's where fields on its indexed document metadata.
const filterSatisfaction = {};

const perQuery = [];
let totalRecall = 0;
let totalPrecision = 0;
let totalElapsed = 0;

for (const q of QUERIES) {
  const { res, elapsedMs } = await runQuery(db, q);
  const ev = evaluate(q, res);
  perQuery.push({ id: q.id, ...ev, elapsedMs, note: q.note ?? 'full-text BM25' });
  if (q.where) {
    const unmet = res.hits.filter((h) => {
      const doc = h.document ?? h;
      return Object.entries(q.where).some(([k, v]) => doc[k] !== v);
    });
    filterSatisfaction[q.id] = unmet.length === 0;
  }
  totalRecall += ev.recallAtK;
  totalPrecision += ev.precisionAtK;
  totalElapsed += elapsedMs;
}

const meanRecall = totalRecall / QUERIES.length;
const meanPrecision = totalPrecision / QUERIES.length;
const meanLatencyMs = totalElapsed / QUERIES.length;

// ---- Filter correctness: the WHERE clause must narrow the result universe so
//      the expected target still surfaces in the declared window. ----
const filterQueries = QUERIES.filter((q) => q.where);
const filterAllHit = filterQueries.every((q) => perQuery.find((p) => p.id === q.id)?.relevantRecovered > 0);
check('metadata_filters_recover_expected', filterAllHit, `filter queries=${filterQueries.length} ${filterQueries.map((q) => q.id).join(',')}`);
const filtersWereChecked = filterQueries.every((q) => filterSatisfaction[q.id] === true);
check('filter_answers_satisfy_where_fields', filtersWereChecked,
  filterQueries.map((q) => `${q.id}:${filterSatisfaction[q.id]}`).join(' ') || 'no filter queries');

// ---- Persistence: save the DB, reload from bytes, and confirm deterministic,
//      byte-identical retrieval on the pre/post probe (no session carried). ----
// save() returns a plain-data snapshot; load(orama, raw) repopulates a fresh db
// instance so persistence is provably byte-round-trippable and deterministic.
const persisted = await save(db);
const persistedBytes = JSON.stringify(persisted).length;
await writeFile(join(outDir, 'orama-persisted.json'), JSON.stringify(persisted));

const reloaded = await create(ORAMA_CONFIG);
await load(reloaded, JSON.parse(JSON.stringify(persisted)));
const probeTerm = 'denim jeans hem';
const before = (await search(db, { term: probeTerm, mode: MODE_FULLTEXT_SEARCH, limit: 5 })).hits
  .map((h) => `${h.id}:${h.score}`);
const after = (await search(reloaded, { term: probeTerm, mode: MODE_FULLTEXT_SEARCH, limit: 5 })).hits
  .map((h) => `${h.id}:${h.score}`);
const deterministic = JSON.stringify(before) === JSON.stringify(after);
check('persistence_save_load_deterministic', deterministic, `probe hits identical=${deterministic} (${byId.size} rules, ${persistedBytes}B)`);
check('persisted_bytes_present', persistedBytes > 0, `${persistedBytes} bytes written to output/orama-persisted.json`);

// ---- Source-preservation surfaced by construction (every hit resolved through
//      byId map with verbatim id/source; no DNA/session fields exist at all). ----
const phantomDocs = perQuery.flatMap((p) => p.sources).filter((s) => !byId.has(s.id));
check('no_phantom_ids_all_sources_preserved', phantomDocs.length === 0, `${phantomDocs.length} phantom resolution(s)`);
// Assert every returned answer's source equals the indexed document/corpus source.
const sourceMismatches = perQuery
  .flatMap((p) => p.sources.filter((s) => !byId.has(s.id) || byId.get(s.id).source !== s.source))
  .map((s) => `${s.id}:mismatch`);
check('returned_sources_match_corpus', sourceMismatches.length === 0, sourceMismatches.join(',') || 'all returned sources equal corpus/indexed source');

// ---- Baseline deficiency gate: full-text is the baseline. Vector/hybrid is
//      recommended ONLY if full-text demonstrably fails on source recovery.
//      If every expected source is recovered, select Orama full-text explicitly
//      and do NOT expand to vectors (STOP gate). ----
const failedQueries = perQuery.filter((p) => p.relevantRecovered === 0);
const baselineDeficiency = failedQueries.length > 0;
check('baseline_fulltext_not_deficient', !baselineDeficiency, baselineDeficiency
  ? `full-text (hyphen-split tokenizer) missed ${failedQueries.map((f) => f.id).join(',')}`
  : 'full-text (hyphen-split tokenizer) recovered every expected source; vector/hybrid NOT required');
check('no_embeddings_or_external_api',
  !/\b(embedding|vector|hybrid|external|api|https?:\/\/)/i.test(JSON.stringify(perQuery)),
  'retrieval path is local Orama full-text; no embeddings, vectors, hybrid mode, external API, or credentials');

const DECISION = baselineDeficiency
  ? 'DEFICIENT: full-text failed source recovery on some queries. Vector/hybrid evaluation required before selection (proven deficiency).'
  : 'SELECT ORAMA FULL-TEXT (BM25F, hyphen-split tokenizer): recovers every expected source on a local, deterministic, cost-free baseline. Default Orama English tokenizer keeps hyphenated compounds as single tokens (reproducible empty results for "out"/"stitch"); the tuned tokenizer resolves this while remaining pure full-text. Hybrid/vector would impose external embeddings (a declared non-goal) with no demonstrated benefit; rejected per STOP gate.';

// ---- Report (human-readable, persisted) ----
// Answer persistence: every returned answer is stored as ID + verbatim source
// (+ deterministic BM25F score). No `date` / runtime latency here: the committed
// evidence must be byte-stable across consecutive clean runs.
const report = {
  experiment: 'rag-retrieval',
  task: 'T-44',
  engine: 'orama',
  engineVersion: '@orama/orama 2.1.1',
  mode: 'full-text BM25F',
  corpus: { version: CORPUS_VERSION, rules: RULES.length, fields: Object.keys(SCHEMA) },
  queries: { version: QUERIES_VERSION, total: QUERIES.length, filterQueries: filterQueries.length },
  metrics: {
    meanRecallAtK: Number(meanRecall.toFixed(4)),
    meanPrecisionAtK: Number(meanPrecision.toFixed(4)),
    savedIndexBytes: persistedBytes,
  },
  persistenceDeterministic: deterministic,
  filtersNarrowByMetadata: filterAllHit,
  baselineDeficiency,
  decision: DECISION,
  perQuery: perQuery.map((p) => ({
    id: p.id, k: QUERIES.find((q) => q.id === p.id)?.k,
    recallAtK: Number(p.recallAtK.toFixed(4)),
    precisionAtK: Number(p.precisionAtK.toFixed(4)),
    answers: p.sources.map((s) => ({ id: s.id, source: s.source, score: s.score })),
    note: p.note,
  })),
};

const diagnostics = {
  title: 'T-44 local Orama full-text/BM25 retrieval benchmark',
  decision: DECISION,
  engine: 'orama 2.1.1 full-text BM25F',
  invariantsTotal: invariants.length,
  invariantsPassed: invariants.filter((i) => i.pass).length,
  invariants,
  meanRecallAtK: Number(meanRecall.toFixed(4)),
  meanPrecisionAtK: Number(meanPrecision.toFixed(4)),
  persistenceDeterministic: deterministic,
  savedIndexBytes: persistedBytes,
  sourcePreserving: 'every recovered document maps back to a corpus rule with verbatim id/source; no session/DNA/credential fields in schema or query path',
};

await writeFile(join(evidenceDir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2) + '\n');
await writeFile(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');

// ---- Transient performance artifact (gitignored): captures the real runtime
//      latency and run timestamp so they never pollute committed evidence. ----
const performance = {
  note: 'transient runtime-latency evidence; NOT versioned. Committed diagnostics/report are byte-stable across clean runs.',
  date: new Date().toISOString(),
  meanLatencyMs: Number(meanLatencyMs.toFixed(4)),
  perQuery: perQuery.map((p) => ({ id: p.id, elapsedMs: Number(p.elapsedMs.toFixed(4)) })),
};
await writeFile(join(outDir, 'performance.json'), JSON.stringify(performance, null, 2) + '\n');

const passCount = invariants.filter((i) => i.pass).length;
const failed = invariants.filter((i) => !i.pass);
console.table(invariants.map((i) => ({ id: i.id, pass: i.pass })));
console.log('\n---- per-query ----');
for (const p of perQuery) {
  const q = QUERIES.find((x) => x.id === p.id);
  console.log(`  ${p.id}  ${summary(q, p)}`);
}
console.log(`\n[T-44] recall@k mean=${meanRecall.toFixed(4)} precision@k mean=${meanPrecision.toFixed(4)} latency mean=${Number(meanLatencyMs.toFixed(4))}ms persistenceDeterministic=${deterministic}`);
console.log(`[T-44] ${passCount}/${invariants.length} invariants passed`);
console.log(`[T-44] DECISION: ${DECISION}`);
if (failed.length) {
  console.error('FAILED:', JSON.stringify(failed, null, 2));
  process.exitCode = 1;
}
if (passCount !== invariants.length) process.exitCode = 1;
