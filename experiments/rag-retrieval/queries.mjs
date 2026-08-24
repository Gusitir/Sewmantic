// T-44 benchmark queries: versioned, deterministic. Each query references exactly
// one target rule (expected ID + source) so recall@k collapses to "was the target
// recovered in the top-k window" and precision@k = relevantRecovered / k. Filter
// queries additionally pin the expected set via `where` metadata. Never reference
// Pattern DNA, credentials, session data, or API payloads.

export const QUERIES_VERSION = 'v1';

export const QUERIES = [
  // ---- Full-text BM25 baseline, top-k readout ----
  { id: 'Q01-den-hem',            text: 'denim jeans blind hem twin needle stitch width',                    k: 3, expected: [{ id: 'RUL-001-DEN-HEM',   source: 'doc://rules_pattern_making.md#s01-denim' }] },
  { id: 'Q02-hip-ease',           text: 'rigid denim hip ease crotch jeans',                                  k: 3, expected: [{ id: 'RUL-002-DEN-HIP',   source: 'doc://rules_pattern_making.md#s02-denim-hip' }] },
  { id: 'Q03-seam-allowance',     text: 'trousers seam allowance flat felled topstitch',                     k: 3, expected: [{ id: 'RUL-003-DEN-SEAM',  source: 'doc://rules_pattern_making.md#s03-denim-seam' }] },
  { id: 'Q04-cargo-bartack',      text: 'cargo pocket bartack reinforcement canvas',                         k: 3, expected: [{ id: 'RUL-005-CAR-POCKET',source: 'doc://rules_pattern_making.md#s05-cargo-pocket' }] },
  { id: 'Q05-waistband-bias',     text: 'waistband facing bias interline roll out',                          k: 3, expected: [{ id: 'RUL-006-CAR-BELT',  source: 'doc://rules_pattern_making.md#s06-cargo-belt' }] },
  { id: 'Q06-chest-ease',         text: 'wool jacket chest ease shoulder sleeve head',                       k: 3, expected: [{ id: 'RUL-007-JKT-EASE',  source: 'doc://rules_pattern_making.md#s07-jacket-ease' }] },
  { id: 'Q07-back-grainline',     text: 'jacket back grainline centre back seam',                            k: 3, expected: [{ id: 'RUL-008-JKT-GRAIN', source: 'doc://rules_pattern_making.md#s08-jacket-grain' }] },
  { id: 'Q08-hoodie-overlock',    text: 'knit hoodie seam overlock allowance gusset',                        k: 3, expected: [{ id: 'RUL-011-HOD-SEAM',  source: 'doc://rules_pattern_making.md#s11-hoodie-seam' }] },
  { id: 'Q09-rib-cuff',           text: 'ribbed fleece cuff waistband twin stitch',                          k: 3, expected: [{ id: 'RUL-012-HOD-CUFF',  source: 'doc://rules_pattern_making.md#s12-hoodie-cuff' }] },
  { id: 'Q10-separating-zip',     text: 'separating zipper heavy fleece foldline teeth',                     k: 3, expected: [{ id: 'RUL-013-HOD-ZIP',   source: 'doc://rules_pattern_making.md#s13-hoodie-zip' }] },
  { id: 'Q11-jersey-wale',        text: 'jersey knit wale direction straight grain',                         k: 3, expected: [{ id: 'RUL-014-TSH-GRAIN', source: 'doc://rules_pattern_making.md#s14-tshirt-grain' }] },
  { id: 'Q12-knife-pleat',        text: 'twill skirt knife pleat underlay pressed',                          k: 3, expected: [{ id: 'RUL-016-SKT-PLEAT', source: 'doc://rules_pattern_making.md#s16-skirt-pleat' }] },
  { id: 'Q13-vest-collar',        text: 'utility vest collar stand notched lapel',                           k: 3, expected: [{ id: 'RUL-018-VST-COLLAR',source: 'doc://rules_pattern_making.md#s18-vest-collar' }] },
  { id: 'Q14-jeans-fly-zip',      text: 'jeans metal zipper fly shield denim',                               k: 3, expected: [{ id: 'RUL-021-DEN-ZIP',   source: 'doc://rules_pattern_making.md#s21-denim-zip' }] },

  // ---- Metadata filter checks (garment / fabric pinning) ----
  { id: 'Q15-hem-denim-filter',   text: 'hem',  k: 10, expected: [{ id: 'RUL-001-DEN-HEM', source: 'doc://rules_pattern_making.md#s01-denim' }],
    where: { garment: 'jeans' }, note: 'garment=jeans must narrow the generic "hem" term to the denim hem rule' },
  { id: 'Q16-grain-wool-filter',  text: 'grainline back seam', k: 10, expected: [{ id: 'RUL-008-JKT-GRAIN', source: 'doc://rules_pattern_making.md#s08-jacket-grain' }],
    where: { fabric: 'wool', garment: 'jacket' }, note: 'fabric+garment pinning desambiguates grainline rules' },
  { id: 'Q17-seam-state-filter',  text: 'seam allowance', k: 5, expected: [{ id: 'RUL-003-DEN-SEAM', source: 'doc://rules_pattern_making.md#s03-denim-seam' }],
    where: { state: 'cutting' }, note: 'state=cutting surfaces only the cutting rule that carries seam allowance' },
  { id: 'Q18-pocket-cargo-preset',text: 'pocket reinforcement', k: 5, expected: [{ id: 'RUL-005-CAR-POCKET', source: 'doc://rules_pattern_making.md#s05-cargo-pocket' }],
    where: { garment: 'cargoPants', fabric: 'canvas' }, note: 'cargoPants+canvas colocation is exact' },
];
