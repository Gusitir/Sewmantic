import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import Flatten from '@flatten-js/core';
import makerjs from 'makerjs';

const root = new URL('.', import.meta.url);
const fixtures = JSON.parse(readFileSync(new URL('./fixtures.json', root)));
const output = new URL('./diagnostics/', root);
mkdirSync(output, { recursive: true });

const tolerance = 0.001;
const pointKey = ([x, y]) => `${x.toFixed(6)},${y.toFixed(6)}`;
const relativeError = (actual, expected) => Math.abs(actual - expected) / Math.abs(expected);
const signedArea = (points) => points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + point[0] * next[1] - next[0] * point[1];
}, 0) / 2;
const polygonArea = (points) => Math.abs(signedArea(points));
const closedModel = (points) => ({
  paths: Object.fromEntries(points.map((point, index) => [
    `edge-${index}`,
    new makerjs.paths.Line(point, points[(index + 1) % points.length]),
  ])),
});
const flattenPolygon = (rings) => new Flatten.Polygon(rings);

function flattenCutIntersections(points, cut) {
  return points.reduce((all, point, index) => {
    const edge = new Flatten.Segment(Flatten.point(point), Flatten.point(points[(index + 1) % points.length]));
    return all.concat(cut.intersect(edge));
  }, []);
}

function makerCutIntersections(points, cut) {
  return points.reduce((all, point, index) => {
    const edge = new makerjs.paths.Line(point, points[(index + 1) % points.length]);
    return all.concat(makerjs.path.intersection(cut, edge)?.intersectionPoints || []);
  }, []);
}

function translatePoint(point, origin) {
  return [point[0] + origin[0], point[1] + origin[1]];
}

function absoluteMakerPath(path, origin) {
  if (path.type === makerjs.pathType.Line) {
    return new makerjs.paths.Line(translatePoint(path.origin, origin), translatePoint(path.end, origin));
  }
  if (path.type === makerjs.pathType.Arc) {
    return new makerjs.paths.Arc(translatePoint(path.origin, origin), path.radius, path.startAngle, path.endAngle);
  }
  throw new Error(`Unsupported Maker.js path type in geometry spike: ${path.type}`);
}

function modelPaths(model, inheritedOrigin = [0, 0]) {
  const origin = [
    inheritedOrigin[0] + (model.origin?.[0] || 0),
    inheritedOrigin[1] + (model.origin?.[1] || 0),
  ];
  const paths = Object.values(model.paths || {}).map((path) => absoluteMakerPath(path, origin));
  return paths.concat(Object.values(model.models || {}).flatMap((child) => modelPaths(child, origin)));
}

function modelSegments(model, inheritedOrigin = [0, 0]) {
  return modelPaths(model, inheritedOrigin).flatMap((path) => path.type === makerjs.pathType.Line ? [{
    start: path.origin,
    end: path.end,
  }] : []);
}

function modelPathCount(model) {
  return modelPaths(model).length;
}

function makerModelArea(model) {
  const remaining = modelSegments(model);
  const loops = [];
  while (remaining.length) {
    const first = remaining.pop();
    const loop = [first.start, first.end];
    while (pointKey(loop[loop.length - 1]) !== pointKey(loop[0])) {
      const endpoint = pointKey(loop[loop.length - 1]);
      const index = remaining.findIndex((segment) => pointKey(segment.start) === endpoint || pointKey(segment.end) === endpoint);
      if (index === -1) throw new Error('Maker.js boolean did not yield a closed line loop');
      const [segment] = remaining.splice(index, 1);
      loop.push(pointKey(segment.start) === endpoint ? segment.end : segment.start);
    }
    loops.push(loop.slice(0, -1));
  }
  return loops.reduce((sum, loop) => sum + Math.abs(signedArea(loop)), 0);
}

function inspectMakerOutlineIntersections(model) {
  const paths = modelPaths(model);
  let linePairsChecked = 0;
  let arcPairsChecked = 0;
  let unexpected = false;
  for (let left = 0; left < paths.length; left += 1) {
    for (let right = left + 1; right < paths.length; right += 1) {
      const leftPath = paths[left];
      const rightPath = paths[right];
      if (leftPath.type === makerjs.pathType.Arc || rightPath.type === makerjs.pathType.Arc) {
        arcPairsChecked += 1;
      } else {
        linePairsChecked += 1;
      }
      const intersections = makerjs.path.intersection(leftPath, rightPath)?.intersectionPoints || [];
      const endpoints = [
        ...(makerjs.point.fromPathEnds(leftPath) || []),
        ...(makerjs.point.fromPathEnds(rightPath) || []),
      ];
      if (intersections.some((point) => !endpoints.some((endpoint) => pointKey(point) === pointKey(endpoint)))) {
        unexpected = true;
      }
    }
  }
  return {
    pathTypes: [...new Set(paths.map((path) => path.type))],
    linePairsChecked,
    arcPairsChecked,
    unexpected,
  };
}

function svgPolygons(title, layers) {
  const allPoints = layers.flatMap((layer) => layer.rings.flat());
  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const minX = Math.min(...xs) - 5;
  const minY = Math.min(...ys) - 5;
  const width = Math.max(...xs) - minX + 5;
  const height = Math.max(...ys) - minY + 5;
  const paths = layers.map(({ color, rings, label }) => `<g fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="0.7"><path fill-rule="evenodd" d="${rings.map((ring) => `M ${ring.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`).join(' ')}"/></g><text x="${minX + 1}" y="${minY + 4 + layers.indexOf(layers.find((layer) => layer.label === label)) * 4}" fill="${color}" font-size="3">${label}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}"><title>${title}</title><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="white"/>${paths}</svg>\n`;
}

function cutSvg(polygon, segment) {
  const points = polygon.concat(segment);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs) - 5;
  const minY = Math.min(...ys) - 5;
  const width = Math.max(...xs) - minX + 5;
  const height = Math.max(...ys) - minY + 5;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}"><title>Cut intersections (mm)</title><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="white"/><path d="M ${polygon.map(([x, y]) => `${x} ${y}`).join(' L ')} Z" fill="#0a9396" fill-opacity="0.15" stroke="#0a9396" stroke-width="0.7"/><line x1="${segment[0][0]}" y1="${segment[0][1]}" x2="${segment[1][0]}" y2="${segment[1][1]}" stroke="#ae2012" stroke-width="0.7"/></svg>\n`;
}

function run() {
  const started = performance.now();
  const concaveArea = polygonArea(fixtures.concave);
  const flattenConcave = flattenPolygon([fixtures.concave]);
  const flattenHole = flattenPolygon([fixtures.withHole.outer, fixtures.withHole.hole]);
  const makerHole = { models: { outer: closedModel(fixtures.withHole.outer), hole: closedModel(fixtures.withHole.hole) } };
  const flattenCut = flattenCutIntersections(
    fixtures.cut.polygon,
    new Flatten.Segment(Flatten.point(fixtures.cut.segment[0]), Flatten.point(fixtures.cut.segment[1]))
  );
  const makerCut = makerCutIntersections(
    fixtures.cut.polygon,
    new makerjs.paths.Line(fixtures.cut.segment[0], fixtures.cut.segment[1])
  );
  const curvedCutPoints = {
    start: [-5, 15],
    through: [20, 20],
    end: [45, 15],
  };
  const curvedCut = {
    // Same three-point arc represented by each library's native path type.
    flatten: new Flatten.Arc(
      Flatten.point([20, -45]),
      65,
      Math.atan2(60, -25),
      Math.atan2(60, 25),
      false
    ),
    maker: new makerjs.paths.Arc(curvedCutPoints.start, curvedCutPoints.through, curvedCutPoints.end),
  };
  const flattenCurvedCut = flattenCutIntersections(fixtures.cut.polygon, curvedCut.flatten);
  const makerCurvedCut = makerCutIntersections(fixtures.cut.polygon, curvedCut.maker);
  const makerCurvedMidpoint = makerjs.point.fromAngleOnCircle(
    makerjs.angle.ofArcMiddle(curvedCut.maker),
    curvedCut.maker
  );
  const flattenUnion = Flatten.BooleanOperations.unify(flattenPolygon([fixtures.boolean.a]), flattenPolygon([fixtures.boolean.b]));
  const makerUnion = makerjs.model.combineUnion(closedModel(fixtures.boolean.a), closedModel(fixtures.boolean.b));
  const makerOffset = makerjs.model.outline(closedModel(fixtures.offset.polygon), fixtures.offset.margin, 0, false);
  const makerOffsetIntersections = inspectMakerOutlineIntersections(makerOffset);
  const unionSnapshot = () => JSON.stringify({
    flatten: Flatten.BooleanOperations.unify(flattenPolygon([fixtures.boolean.a]), flattenPolygon([fixtures.boolean.b])).area(),
    maker: makerModelArea(makerjs.model.combineUnion(closedModel(fixtures.boolean.a), closedModel(fixtures.boolean.b))),
  });
  const values = {
    concave: { expectedArea: concaveArea, flattenArea: flattenConcave.area(), makerArea: polygonArea(fixtures.concave) },
    hole: { expectedArea: 1000, flattenArea: flattenHole.area(), makerSemanticArea: null },
    cut: { flattenIntersections: flattenCut.length, makerIntersections: makerCut.length },
    curvedCut: {
      flattenIsArc: curvedCut.flatten instanceof Flatten.Arc,
      makerIsArc: curvedCut.maker.type === makerjs.pathType.Arc,
      flattenMidpoint: [curvedCut.flatten.middle().x, curvedCut.flatten.middle().y],
      makerMidpoint: makerCurvedMidpoint,
      flattenIntersections: flattenCurvedCut.length,
      makerIntersections: makerCurvedCut.length,
    },
    boolean: { expectedArea: fixtures.boolean.unionArea, flattenArea: flattenUnion.area(), makerArea: makerModelArea(makerUnion) },
    offset: {
      makerPathCount: modelPathCount(makerOffset),
      makerPathTypes: makerOffsetIntersections.pathTypes,
      makerLinePairsChecked: makerOffsetIntersections.linePairsChecked,
      makerArcPairsChecked: makerOffsetIntersections.arcPairsChecked,
      makerUnexpectedIntersection: makerOffsetIntersections.unexpected,
      flattenNativeOffset: false,
    },
  };
  const checks = [
    ['concave Flatten area', relativeError(values.concave.flattenArea, values.concave.expectedArea) < tolerance],
    ['concave Maker.js area', relativeError(values.concave.makerArea, values.concave.expectedArea) < tolerance],
    ['hole Flatten area', relativeError(values.hole.flattenArea, values.hole.expectedArea) < tolerance],
    ['cut Flatten intersections', values.cut.flattenIntersections === 2],
    ['cut Maker.js intersections', values.cut.makerIntersections === 2],
    ['curved cut uses Flatten Arc', values.curvedCut.flattenIsArc && Math.abs(values.curvedCut.flattenMidpoint[1] - curvedCutPoints.start[1]) > tolerance],
    ['curved cut uses Maker.js Arc', values.curvedCut.makerIsArc && Math.abs(values.curvedCut.makerMidpoint[1] - curvedCutPoints.start[1]) > tolerance],
    ['curved cut Flatten intersections', values.curvedCut.flattenIntersections === 2],
    ['curved cut Maker.js intersections', values.curvedCut.makerIntersections === 2],
    ['boolean Flatten area', relativeError(values.boolean.flattenArea, values.boolean.expectedArea) < tolerance],
    ['boolean Maker.js area', relativeError(values.boolean.makerArea, values.boolean.expectedArea) < tolerance],
    ['offset Maker.js closed output', values.offset.makerPathCount > fixtures.offset.polygon.length],
    ['offset Maker.js validates lines and arcs', values.offset.makerPathTypes.includes(makerjs.pathType.Line) && values.offset.makerPathTypes.includes(makerjs.pathType.Arc)],
    ['offset Maker.js checks line/arc pairs', values.offset.makerLinePairsChecked > 0 && values.offset.makerArcPairsChecked > 0],
    ['offset Maker.js no unexpected line/arc crossing', !values.offset.makerUnexpectedIntersection],
    ['round-trip deterministic boolean result', unionSnapshot() === unionSnapshot()],
  ];
  writeFileSync(new URL('./concave.svg', output), svgPolygons('Concave polygon (mm)', [{ label: 'concave', color: '#006d77', rings: [fixtures.concave] }]));
  writeFileSync(new URL('./hole.svg', output), svgPolygons('Polygon with hole (mm)', [{ label: 'Flatten.js hole', color: '#9b2226', rings: [fixtures.withHole.outer, fixtures.withHole.hole] }]));
  writeFileSync(new URL('./cut.svg', output), cutSvg(fixtures.cut.polygon, fixtures.cut.segment));
  writeFileSync(new URL('./boolean-union.svg', output), svgPolygons('Boolean union (mm)', [{ label: 'A', color: '#005f73', rings: [fixtures.boolean.a] }, { label: 'B', color: '#ca6702', rings: [fixtures.boolean.b] }]));
  writeFileSync(new URL('./offset-makerjs.svg', output), makerjs.exporter.toSVG(makerOffset));
  values.latencyMs = Number((performance.now() - started).toFixed(3));
  console.table(checks.map(([fixture, pass]) => ({ fixture, pass })));
  console.table([values.concave, values.hole, values.cut, values.curvedCut, values.boolean, values.offset, { latencyMs: values.latencyMs }]);
  console.log(`Geometry spike: ${checks.filter(([, pass]) => pass).length}/${checks.length} invariants passed`);
  if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
}

run();
