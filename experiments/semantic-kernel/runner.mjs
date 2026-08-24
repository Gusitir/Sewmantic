// T-42 spike runner: builds a small garment with three panels, exercises seam
// matching across different segmentations, detects seam delta > 3mm and
// incompatible orientation, inserts a cut and a dart, verifies affected
// interfaces stay updated, and proves JSON round-trip preserves ids, semantics
// and measures. Writes SVG diagnostics and exits non-zero on any invariant
// failure. Pure ESM; no network, no credentials.

import { mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Edge, EdgeSequence, Panel, Interface, SemanticKernel } from './semantic-kernel.mjs';

const root = new URL('.', import.meta.url);
const output = new URL('./diagnostics/', root);
mkdirSync(output, { recursive: true });

const TOL = 0.001; // mm
const SEAM_TOLERANCE_MM = 3;

// Build the spike garment.
function build() {
  const k = new SemanticKernel();

  // Shared side-seam edges for panels A and B with DIFFERENT segmentation but
  // the SAME total length (100 mm): A uses 2 edges, B uses 4.
  k.addEdge(new Edge({ id: 'E-A-side-1', vertexA: 'VA-a-s', vertexB: 'VA-a-m', start: [60, 100], end: [60, 50] }));
  k.addEdge(new Edge({ id: 'E-A-side-2', vertexA: 'VA-a-m', vertexB: 'VA-a-b', start: [60, 50], end: [60, 0] }));
  // A waist (top edge) 60 mm in 2 edges.
  k.addEdge(new Edge({ id: 'E-A-waist-1', vertexA: 'VA-a-l', vertexB: 'VA-a-t', start: [0, 0], end: [30, 0] }));
  k.addEdge(new Edge({ id: 'E-A-waist-2', vertexA: 'VA-a-t', vertexB: 'VA-a-r', start: [30, 0], end: [60, 0] }));

  // B side seam runs bottom-to-top (opposite to A's top-to-bottom) so the pair
  // is seam-compatible. 4 equal edges.
  k.addEdge(new Edge({ id: 'E-B-side-1', vertexA: 'VB-b-s', vertexB: 'VB-s-1', start: [80, 0], end: [80, 25] }));
  k.addEdge(new Edge({ id: 'E-B-side-2', vertexA: 'VB-s-1', vertexB: 'VB-s-2', start: [80, 25], end: [80, 50] }));
  k.addEdge(new Edge({ id: 'E-B-side-3', vertexA: 'VB-s-2', vertexB: 'VB-s-3', start: [80, 50], end: [80, 75] }));
  k.addEdge(new Edge({ id: 'E-B-side-4', vertexA: 'VB-s-3', vertexB: 'VB-b-t', start: [80, 75], end: [80, 100] }));
  // B waist runs right-to-left (opposite to A's left-to-right). 4 edges of 15.
  for (let i = 0; i < 4; i += 1) {
    k.addEdge(new Edge({
      id: `E-B-waist-${i + 1}`,
      vertexA: `VB-w-${i}`,
      vertexB: `VB-w-${i + 1}`,
      start: [140 - i * 15, 100],
      end: [140 - (i + 1) * 15, 100],
    }));
  }

  // M is a mirrored twin with the RIGHT orientation (a genuine seam mate) but
  // we route an interface against a copy that runs the SAME direction to prove
  // orientation incompatibility is detected. We build M.side correct (upward)
  // only by duplicating geometry; the mis-oriented variant is a separate
  // sequence M.side-wrong.
  k.addEdge(new Edge({ id: 'E-M-side-1', vertexA: 'VM-side-1', vertexB: 'VM-side-2', start: [60, 220], end: [60, 170] }));
  k.addEdge(new Edge({ id: 'E-M-side-2', vertexA: 'VM-side-2', vertexB: 'VM-side-3', start: [60, 170], end: [60, 120] }));
  k.addEdge(new Edge({ id: 'E-M-wrong-1', vertexA: 'VM-w-1', vertexB: 'VM-w-2', start: [60, 220], end: [60, 170] }));
  k.addEdge(new Edge({ id: 'E-M-wrong-2', vertexA: 'VM-w-2', vertexB: 'VM-w-3', start: [60, 170], end: [60, 120] }));

  k.addSequence(new EdgeSequence({ id: 'S-A-side', panelId: 'P-A', role: 'side seam (front right)', edgeIds: ['E-A-side-1', 'E-A-side-2'] }));
  k.addSequence(new EdgeSequence({ id: 'S-A-waist', panelId: 'P-A', role: 'waist (front)', edgeIds: ['E-A-waist-1', 'E-A-waist-2'] }));
  k.addSequence(new EdgeSequence({ id: 'S-B-side', panelId: 'P-B', role: 'side seam (back left)', edgeIds: ['E-B-side-1', 'E-B-side-2', 'E-B-side-3', 'E-B-side-4'] }));
  k.addSequence(new EdgeSequence({ id: 'S-B-waist', panelId: 'P-B', role: 'waist (back)', edgeIds: ['E-B-waist-1', 'E-B-waist-2', 'E-B-waist-3', 'E-B-waist-4'] }));
  k.addSequence(new EdgeSequence({ id: 'S-M-side-right', panelId: 'P-M', role: 'side seam (mirror, correct)', edgeIds: ['E-M-side-1', 'E-M-side-2'] }));
  k.addSequence(new EdgeSequence({ id: 'S-M-side-wrong', panelId: 'P-M', role: 'side seam (mirror, mis-oriented)', edgeIds: ['E-M-wrong-1', 'E-M-wrong-2'] }));

  k.addPanel(new Panel({ id: 'P-A', name: 'Front', material: 'cotton', sequenceIds: ['S-A-side', 'S-A-waist'] }));
  k.addPanel(new Panel({ id: 'P-B', name: 'Back', material: 'cotton', sequenceIds: ['S-B-side', 'S-B-waist'] }));
  k.addPanel(new Panel({ id: 'P-M', name: 'Mirror', material: 'cotton', sequenceIds: ['S-M-side-right', 'S-M-side-wrong'] }));

  k.addInterface(new Interface({ id: 'I-AB-side', label: 'front/back side seam', leftSequenceId: 'S-A-side', rightSequenceId: 'S-B-side' }));
  k.addInterface(new Interface({ id: 'I-AB-waist', label: 'front/back waist', leftSequenceId: 'S-A-waist', rightSequenceId: 'S-B-waist' }));
  k.addInterface(new Interface({ id: 'I-AM-side', label: 'front/mirror side (orientation probe)', leftSequenceId: 'S-A-side', rightSequenceId: 'S-M-side-wrong' }));

  return k;
}

function svgPanels(kernel) {
  const draw = (seqId, stroke) => {
    const seq = kernel.sequences.get(seqId);
    const edges = seq.edges(kernel);
    const ring = edges.flatMap((e) => [e.start]).concat(edges.length ? [edges[edges.length - 1].end] : []);
    const d = ring
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`)
      .concat('Z')
      .join(' ');
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.4"/>`;
  };
  const box = (x, y, w, h, color) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="0.10" stroke="${color}" stroke-dasharray="3 2" stroke-width="0.8"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -40 260 300" width="520" height="600"><title>T-42 cosible panel pair (mm)</title><rect x="-10" y="-40" width="260" height="300" fill="white" stroke="none"/>
${box(0, 0, 60, 100, '#006d77')}${draw('S-A-side', '#0a9396')}
${box(80, 0, 60, 100, '#006d77')}${draw('S-B-side', '#94d2bd')}
${box(0, 120, 60, 100, '#5c677d')}${draw('S-M-side-wrong', '#e76f51')}
<text x="0" y="-6" font-size="9" fill="#333">A front: S-A-side runs down</text>
<text x="80" y="-6" font-size="9" fill="#333">B back: S-B-side runs up (mate)</text>
<text x="0" y="236" font-size="9" fill="#333">M mirror: S-M-side-wrong runs down, same direction as A (incompatible)</text>
</svg>\n`;
}

function run() {
  const started = performance.now();
  const kernel = build();

  // 1. Baseline matching across different segmentation.
  const abSide = kernel.interfaces.get('I-AB-side').match(kernel, SEAM_TOLERANCE_MM);
  const abWaist = kernel.interfaces.get('I-AB-waist').match(kernel, SEAM_TOLERANCE_MM);
  const amSide = kernel.interfaces.get('I-AM-side').match(kernel, SEAM_TOLERANCE_MM);

  const baselinePairsBeforeA = kernel.sequences.get('S-A-side').edges(kernel).length;
  const baselinePairsBeforeB = kernel.sequences.get('S-B-side').edges(kernel).length;

  // 2. Cut: split edge index 1 of A-side at t=0.5 -> total length unchanged,
  //    segmentation changes, affected interface re-resolves.
  kernel.cutSequence('S-A-side', 1, 0.5);
  const aSideLenAfterCut = kernel.sequences.get('S-A-side').length(kernel);
  const aSideEdgesAfterCut = kernel.sequences.get('S-A-side').edges(kernel).length;
  const abSideAfterCut = kernel.interfaces.get('I-AB-side').match(kernel, SEAM_TOLERANCE_MM);

  // 3. Dart: insert a 5 mm-deep dart into B-side (added length = 2*5=10 mm? no:
  //    the dart adds 2*depth). Use depth 4 -> +8 mm, delta 8 > 3.
  kernel.insertDart('S-B-side', 50, 4);
  const bSideLenAfterDart = kernel.sequences.get('S-B-side').length(kernel);
  const abSideAfterDart = kernel.interfaces.get('I-AB-side').match(kernel, SEAM_TOLERANCE_MM);

  // 4. JSON round-trip preserves ids, semantics and measures.
  const snapshot = kernel.toJSON();
  const rebuilt = SemanticKernel.fromJSON(snapshot);
  const idsEqual =
    JSON.stringify(kernel.idsSnapshot()) === JSON.stringify(rebuilt.idsSnapshot());
  const semanticSnapshot = snapshot.interfaces.map((i) => ({ left: i.leftSequenceId, right: i.rightSequenceId })).sort((a, b) => a.left.localeCompare(b.left));
  const semanticRebuilt = [...rebuilt.interfaces.values()].map((i) => ({ left: i.leftSequenceId, right: i.rightSequenceId })).sort((a, b) => a.left.localeCompare(b.left));
  const semanticsEqual = JSON.stringify(semanticSnapshot) === JSON.stringify(semanticRebuilt);

  // Compare measures of the MUTATED kernel (after cut + dart) against the
  // rebuilt kernel: round-trip must reproduce exact lengths and deltas.
  const measure = (k) => {
    const out = {};
    for (const [sid, seq] of k.sequences) out[`len:${sid}`] = +seq.length(k).toFixed(4);
    const m1 = k.interfaces.get('I-AB-side').match(k, SEAM_TOLERANCE_MM);
    const m2 = k.interfaces.get('I-AM-side').match(k, SEAM_TOLERANCE_MM);
    out['delta:I-AB-side'] = +m1.delta.toFixed(4);
    out['orient:I-AM-side'] = m2.orientationCompatible ? 1 : 0;
    return out;
  };
  const measures = { before: measure(kernel), after: measure(rebuilt) };
  const measuresEqual = Object.entries(measures.after).every(([key, val]) => Math.abs(val - measures.before[key]) < TOL);

  const checks = [
    ['AB side delta == 0 (different segmentation, equal length)', abSide.delta < TOL],
    ['AB side preserves total length (common == left == right 100)', Math.abs(abSide.commonLength - 100) < TOL && Math.abs(abSide.leftLength - abSide.rightLength) < TOL],
    ['AB side merges segmentation into >=4 stitch pairs', abSide.pairs.length >= 4],
    ['AB side orientation compatible (opposite tangents)', abSide.orientationCompatible === true],
    ['AB waist delta == 0', abWaist.delta < TOL],
    ['AB waist orientation compatible', abWaist.orientationCompatible === true],
    ['AM side orientation INCOMPATIBLE (same direction) detected', amSide.orientationCompatible === false],
    ['cut keeps A-side total length invariant', Math.abs(aSideLenAfterCut - 100) < TOL],
    ['cut raises A-side segmentation (2 -> 3 edges)', aSideEdgesAfterCut === baselinePairsBeforeA + 1],
    ['affected interface updates after cut (delta still 0)', abSideAfterCut.delta < TOL],
    ['dart extends B-side length (100 -> 108)', Math.abs(bSideLenAfterDart - 108) < TOL],
    ['affected interface reports seam delta > 3mm after dart', abSideAfterDart.delta > SEAM_TOLERANCE_MM],
    ['dart delta magnitude correct (+2*depth = 8)', Math.abs(abSideAfterDart.delta - 8) < TOL],
    ['baseline B-side segmentation was 4', baselinePairsBeforeB === 4],
    ['round-trip preserves all ids', idsEqual],
    ['round-trip preserves semantics (interface wiring)', semanticsEqual],
    ['round-trip preserves measures', measuresEqual],
  ];

  const diag = kernel.diagnostic('T-42');
  writeFileSync(new URL('./panels.svg', output), svgPanels(kernel));
  writeFileSync(new URL('./roundtrip.json', output), `${JSON.stringify({ snapshot, rebuiltIds: rebuilt.idsSnapshot(), measures, interfaceWiring: snapshot.interfaces }, (_, v) => (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) >= 1e7 ? Number(v.toFixed(3)) : v), 2)}\n`);

  const latencyMs = Number((performance.now() - started).toFixed(3));
  console.table(checks.map(([fixture, pass]) => ({ fixture, pass })));
  console.table([
    {
      abSide: { delta: abSide.delta, common: abSide.commonLength, pairs: abSide.pairs.length, orient: abSide.orientationCompatible },
      abWaist: { delta: abWaist.delta, pairs: abWaist.pairs.length },
      amSide: { orient: amSide.orientationCompatible },
      aSideEdges: { before: baselinePairsBeforeA, afterCut: aSideEdgesAfterCut, lenAfterCut: aSideLenAfterCut },
      bSideEdges: { before: baselinePairsBeforeB, afterDart: bSideLenAfterDart, delta: abSideAfterDart.delta },
      roundTrip: { idsEqual, semanticsEqual, measuresEqual },
      latencyMs,
    },
  ]);
  const passCount = checks.filter(([, pass]) => pass).length;
  console.log(`Semantic kernel spike (T-42): ${passCount}/${checks.length} invariants passed`);
  diag.latencyMs = latencyMs;
  diag.invariantsPassed = passCount;
  diag.invariantsTotal = checks.length;
  writeFileSync(new URL('./diagnostics.json', output), `${JSON.stringify(diag, null, 2)}\n`);
  if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
  return checks;
}

run();
