/**
 * tests/triangulator.test.ts
 * Suite de Pruebas Unitarias y Validación Geométrica del Motor de Triangulación 2D
 * (Ear Clipping Triangulator) - T-25
 * pattern-ai-core
 */

import { describe, it, expect } from 'vitest';
import { Point2D, createPoint, computePolygonArea } from '../src/engine/geometry.js';
import {
  triangulatePolygon,
  computeTriangulatedArea,
  validateTriangleOrientations,
  triangulatePolygonMesh,
  computeSignedPolygonArea,
  getPolygonOrientation,
  isPolygonConvex,
  cleanPolygonVertices,
  isPointInTriangle,
  crossProduct2D,
} from '../src/engine/triangulator.js';
import { generateTorsoBlock } from '../src/engine/base_blocks/torso.js';
import { generateSleeveBlock } from '../src/engine/base_blocks/sleeve.js';
import { generateTrouserBlock } from '../src/engine/base_blocks/trousers.js';
import { generateSkirtBlock } from '../src/engine/base_blocks/skirt.js';
import { generateWomensBodiceBlock } from '../src/engine/base_blocks/womens_bodice.js';
import { generateHoodBlock } from '../src/engine/base_blocks/hood.js';
import { generatePocketBlock } from '../src/engine/base_blocks/pocket.js';
import { modifyPattern } from '../src/engine/modifier.js';
import { PatternDna } from '../src/types/pattern.js';

describe('Motor de Triangulación 2D de Polígonos de Moldería (Ear Clipping) - T-25', () => {
  // ==========================================
  // 1. POLÍGONOS CONVEXOS BÁSICOS
  // ==========================================
  describe('1. Polígonos Convexos Básicos', () => {
    it('debe triangular un triángulo simple preservando área y orientación CCW', () => {
      const triangle: Point2D[] = [
        createPoint(0, 0),
        createPoint(100, 0),
        createPoint(50, 80),
      ];

      const indices = triangulatePolygon(triangle);
      expect(indices).toEqual([0, 1, 2]);

      const triArea = computeTriangulatedArea(triangle, indices);
      const polyArea = computePolygonArea(triangle);
      expect(triArea).toBe(4000); // (100 * 80) / 2
      expect(polyArea).toBe(4000);
      expect(validateTriangleOrientations(triangle, indices)).toBe(true);
    });

    it('debe triangular un rectángulo (4 vértices) produciendo exactamente 2 triángulos', () => {
      const rect: Point2D[] = [
        createPoint(0, 0),
        createPoint(200, 0),
        createPoint(200, 100),
        createPoint(0, 100),
      ];

      const indices = triangulatePolygon(rect);
      expect(indices.length).toBe(6); // 2 triángulos * 3 índices

      const triArea = computeTriangulatedArea(rect, indices);
      const polyArea = computePolygonArea(rect);
      expect(triArea).toBe(20000); // 200 * 100
      expect(polyArea).toBe(20000);
      expect(validateTriangleOrientations(rect, indices)).toBe(true);
    });

    it('debe triangular un trapecio simétrico con área exacta', () => {
      const trapezoid: Point2D[] = [
        createPoint(0, 0),
        createPoint(150, 0),
        createPoint(120, 80),
        createPoint(30, 80),
      ];

      const indices = triangulatePolygon(trapezoid);
      expect(indices.length).toBe(6);

      const triArea = computeTriangulatedArea(trapezoid, indices);
      const polyArea = computePolygonArea(trapezoid);
      // Area = ((150 + 90) / 2) * 80 = 9600
      expect(triArea).toBe(9600);
      expect(polyArea).toBe(9600);
      expect(validateTriangleOrientations(trapezoid, indices)).toBe(true);
    });

    it('debe triangular un pentágono y hexágono regulares produciendo N-2 triángulos', () => {
      // Hexágono regular de radio 100
      const hex: Point2D[] = [];
      const n = 6;
      const r = 100;
      for (let i = 0; i < n; i++) {
        const theta = (i * 2 * Math.PI) / n;
        hex.push(createPoint(r * Math.cos(theta), r * Math.sin(theta)));
      }

      const indices = triangulatePolygon(hex);
      expect(indices.length).toBe((n - 2) * 3); // 4 triángulos = 12 índices

      const triArea = computeTriangulatedArea(hex, indices);
      const polyArea = computePolygonArea(hex);
      const relError = Math.abs(triArea - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.0001);
      expect(validateTriangleOrientations(hex, indices)).toBe(true);
    });
  });

  // ==========================================
  // 2. POLÍGONOS CÓNCAVOS TEXTILES COMPLEJOS
  // ==========================================
  describe('2. Polígonos Cóncavos Textiles Complejos', () => {
    it('debe triangular un Torso Delantero con Escote en V Profundo y Bajo en Pico de Chaleco', () => {
      // Delantero de chaleco con escote en V profundo y dobladillo inferior en punta
      const vestFront: Point2D[] = [
        createPoint(0, 180), // Vértice inferior del escote V profundo (cóncavo)
        createPoint(70, 30), // Vértice cuello-hombro
        createPoint(160, 45), // Punta de hombro
        createPoint(150, 100), // Sisa superior
        createPoint(140, 160), // Curva de sisa
        createPoint(170, 220), // Fondo de sisa
        createPoint(165, 450), // Costado cintura
        createPoint(160, 520), // Costado bajo
        createPoint(0, 580), // Punta central del dobladillo de chaleco
      ];

      const mesh = triangulatePolygonMesh(vestFront);
      expect(mesh.indices.length).toBe((vestFront.length - 2) * 3);

      const polyArea = computePolygonArea(vestFront);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.001); // Error < 0.1%
      expect(mesh.isCcw).toBe(true);
    });

    it('debe triangular una Manga con Curva de Copa en S (curvatura cóncava y convexa)', () => {
      // Contorno de manga con copa estilizada
      const sleeve: Point2D[] = [
        createPoint(0, 100), // Sisa izquierda bajo axila
        createPoint(30, 60), // Inflexión cóncava izquierda
        createPoint(80, 20), // Curva convexa de copa
        createPoint(140, 0), // Cúspide de la copa
        createPoint(200, 20), // Curva convexa derecha
        createPoint(250, 60), // Inflexión cóncava derecha
        createPoint(280, 100), // Sisa derecha bajo axila
        createPoint(240, 550), // Puño derecho
        createPoint(40, 550), // Puño izquierdo
      ];

      const mesh = triangulatePolygonMesh(sleeve);
      expect(mesh.indices.length).toBe((sleeve.length - 2) * 3);

      const polyArea = computePolygonArea(sleeve);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
    });

    it('debe triangular una Pierna de Pantalón con Curva de Entrepierna Cóncava Profunda', () => {
      const trouserLeg: Point2D[] = [
        createPoint(0, 0), // Cintura centro delantero
        createPoint(180, 0), // Cintura costado
        createPoint(190, 200), // Cadera costado
        createPoint(185, 550), // Rodilla costado
        createPoint(170, 950), // Bajo costado
        createPoint(60, 950), // Bajo entrepierna
        createPoint(80, 550), // Rodilla entrepierna
        createPoint(120, 260), // Entrepierna baja
        createPoint(140, 220), // Punta de tiro (crotch point)
        createPoint(70, 130), // Curva cóncava de tiro
        createPoint(30, 60), // Tiro superior
      ];

      const mesh = triangulatePolygonMesh(trouserLeg);
      expect(mesh.indices.length).toBe((trouserLeg.length - 2) * 3);

      const polyArea = computePolygonArea(trouserLeg);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
    });

    it('debe triangular una Falda Evasé con Arco Cóncavo de Ruedo', () => {
      const evaseSkirt: Point2D[] = [
        createPoint(0, 0), // Cintura centro
        createPoint(90, 8), // Cintura intermedia
        createPoint(180, 0), // Cintura costado
        createPoint(260, 600), // Ruedo costado
        createPoint(180, 615), // Ruedo intermedio (arco cóncavo)
        createPoint(90, 620), // Ruedo medio
        createPoint(0, 610), // Ruedo centro
      ];

      const mesh = triangulatePolygonMesh(evaseSkirt);
      expect(mesh.indices.length).toBe((evaseSkirt.length - 2) * 3);

      const polyArea = computePolygonArea(evaseSkirt);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
    });

    it('debe triangular polígonos con entrantes agudas tipo estrella o pinza profunda', () => {
      // Polígono con dos pinzas profundas en la cintura
      const dartedBodice: Point2D[] = [
        createPoint(0, 0),
        createPoint(40, 0),
        createPoint(45, 120), // Punta de pinza 1 (cóncava profunda)
        createPoint(50, 0),
        createPoint(90, 0),
        createPoint(95, 120), // Punta de pinza 2 (cóncava profunda)
        createPoint(100, 0),
        createPoint(150, 0),
        createPoint(150, 300),
        createPoint(0, 300),
      ];

      const mesh = triangulatePolygonMesh(dartedBodice);
      const polyArea = computePolygonArea(dartedBodice);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;
      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
    });
  });

  // ==========================================
  // 3. INTEGRACIÓN CON SLOPERS REALES DE FREESEWING
  // ==========================================
  describe('3. Integración con Bloques Base Paramétricos Reales', () => {
    it('debe triangular todas las piezas del bloque base de Torso (Delantero y Espalda)', () => {
      const torso = generateTorsoBlock('M');

      // 1. Delantero
      const frontIndices = triangulatePolygon(torso.front.outline);
      expect(frontIndices.length).toBeGreaterThanOrEqual(9);
      const frontTriArea = computeTriangulatedArea(torso.front.outline, frontIndices);
      const frontPolyArea = computePolygonArea(torso.front.outline);
      const frontError = Math.abs(frontTriArea - frontPolyArea) / frontPolyArea;
      expect(frontError).toBeLessThan(0.001);
      expect(validateTriangleOrientations(torso.front.outline, frontIndices)).toBe(true);

      // 2. Espalda
      const backIndices = triangulatePolygon(torso.back.outline);
      expect(backIndices.length).toBeGreaterThanOrEqual(9);
      const backTriArea = computeTriangulatedArea(torso.back.outline, backIndices);
      const backPolyArea = computePolygonArea(torso.back.outline);
      const backError = Math.abs(backTriArea - backPolyArea) / backPolyArea;
      expect(backError).toBeLessThan(0.001);
      expect(validateTriangleOrientations(torso.back.outline, backIndices)).toBe(true);
    });

    it('debe triangular la pieza de Manga con curvas Bezier densamente muestreadas', () => {
      const sleeveBlock = generateSleeveBlock('L');
      const sleeveOutline = sleeveBlock.sleeve.outline;

      const indices = triangulatePolygon(sleeveOutline);
      expect(indices.length).toBeGreaterThan(15);

      const triArea = computeTriangulatedArea(sleeveOutline, indices);
      const polyArea = computePolygonArea(sleeveOutline);
      const error = Math.abs(triArea - polyArea) / polyArea;
      expect(error).toBeLessThan(0.001);
      expect(validateTriangleOrientations(sleeveOutline, indices)).toBe(true);
    });

    it('debe triangular piezas de Pantalón (delantero y trasero con tiro anatómico)', () => {
      const trousers = generateTrouserBlock('M');

      // Pierna delantera
      const frontIndices = triangulatePolygon(trousers.front_leg.outline);
      const frontTriArea = computeTriangulatedArea(trousers.front_leg.outline, frontIndices);
      const frontPolyArea = computePolygonArea(trousers.front_leg.outline);
      expect(Math.abs(frontTriArea - frontPolyArea) / frontPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(trousers.front_leg.outline, frontIndices)).toBe(true);

      // Pierna trasera
      const backIndices = triangulatePolygon(trousers.back_leg.outline);
      const backTriArea = computeTriangulatedArea(trousers.back_leg.outline, backIndices);
      const backPolyArea = computePolygonArea(trousers.back_leg.outline);
      expect(Math.abs(backTriArea - backPolyArea) / backPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(trousers.back_leg.outline, backIndices)).toBe(true);
    });

    it('debe triangular piezas de Falda (delantero y trasero evasé)', () => {
      const skirt = generateSkirtBlock('M', { silhouette: 'a_line', flare_mm: 120 });

      const frontIndices = triangulatePolygon(skirt.front_skirt.outline);
      const frontTriArea = computeTriangulatedArea(skirt.front_skirt.outline, frontIndices);
      const frontPolyArea = computePolygonArea(skirt.front_skirt.outline);
      expect(Math.abs(frontTriArea - frontPolyArea) / frontPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(skirt.front_skirt.outline, frontIndices)).toBe(true);

      const backIndices = triangulatePolygon(skirt.back_skirt.outline);
      const backTriArea = computeTriangulatedArea(skirt.back_skirt.outline, backIndices);
      const backPolyArea = computePolygonArea(skirt.back_skirt.outline);
      expect(Math.abs(backTriArea - backPolyArea) / backPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(skirt.back_skirt.outline, backIndices)).toBe(true);
    });

    it('debe triangular piezas de Corpiño Femenino Anatómico con Pinzas', () => {
      const bodice = generateWomensBodiceBlock('S', { bust_dart_width_mm: 35 });

      const frontIndices = triangulatePolygon(bodice.front_bodice.outline);
      const frontTriArea = computeTriangulatedArea(bodice.front_bodice.outline, frontIndices);
      const frontPolyArea = computePolygonArea(bodice.front_bodice.outline);
      expect(Math.abs(frontTriArea - frontPolyArea) / frontPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(bodice.front_bodice.outline, frontIndices)).toBe(true);
    });

    it('debe triangular Capucha Anatómica y Bolsillo Canguro', () => {
      const hood = generateHoodBlock('M');
      const pocket = generatePocketBlock('M');

      const hoodIndices = triangulatePolygon(hood.hood.outline);
      const hoodTriArea = computeTriangulatedArea(hood.hood.outline, hoodIndices);
      const hoodPolyArea = computePolygonArea(hood.hood.outline);
      expect(Math.abs(hoodTriArea - hoodPolyArea) / hoodPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(hood.hood.outline, hoodIndices)).toBe(true);

      const pocketIndices = triangulatePolygon(pocket.pocket.outline);
      const pocketTriArea = computeTriangulatedArea(pocket.pocket.outline, pocketIndices);
      const pocketPolyArea = computePolygonArea(pocket.pocket.outline);
      expect(Math.abs(pocketTriArea - pocketPolyArea) / pocketPolyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(pocket.pocket.outline, pocketIndices)).toBe(true);
    });

    it('debe triangular patrones modificados por ADN paramétrico (Escote V y Dobladillo Curvo)', () => {
      const dna: PatternDna = {
        concept_name: 'test_triangulate_dna',
        base_block: 'menswear_torso_oversize',
        ease: { chest_ease_mm: 80 },
        modifications: {
          neckline: { type: 'v_neck', depth_mm: 90 },
          hem: { type: 'curved', drop_mm: 40 },
        },
      };

      const result = modifyPattern(dna, 'M');
      const frontPart = result.parts.front;
      const indices = triangulatePolygon(frontPart.outline);
      const triArea = computeTriangulatedArea(frontPart.outline, indices);
      const polyArea = computePolygonArea(frontPart.outline);

      expect(Math.abs(triArea - polyArea) / polyArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(frontPart.outline, indices)).toBe(true);
    });
  });

  // ==========================================
  // 4. ROBUSTEZ, CASOS BORDE Y LIMPIEZA GEOMÉTRICA
  // ==========================================
  describe('4. Robustez, Casos Borde y Limpieza Geométrica', () => {
    it('debe manejar e invertir polígonos dados en sentido horario (CW) a CCW', () => {
      // Cuadrado orientado en CW (sentido horario)
      const cwSquare: Point2D[] = [
        createPoint(0, 0),
        createPoint(0, 100),
        createPoint(100, 100),
        createPoint(100, 0),
      ];

      expect(getPolygonOrientation(cwSquare)).toBe('CW');
      expect(computeSignedPolygonArea(cwSquare)).toBeLessThan(0);

      const indices = triangulatePolygon(cwSquare);
      expect(indices.length).toBe(6);

      // Los triángulos generados deben tener orientación CCW positiva
      expect(validateTriangleOrientations(cwSquare, indices)).toBe(true);
      expect(computeTriangulatedArea(cwSquare, indices)).toBe(10000);
    });

    it('debe limpiar automáticamente vértices duplicados de cierre de anillo (P_0 == P_last)', () => {
      const closedSquare: Point2D[] = [
        createPoint(0, 0),
        createPoint(100, 0),
        createPoint(100, 100),
        createPoint(0, 100),
        createPoint(0, 0), // Duplicado de cierre
      ];

      const cleaned = cleanPolygonVertices(closedSquare, 0.1);
      expect(cleaned.points.length).toBe(4);

      const indices = triangulatePolygon(closedSquare);
      expect(indices.length).toBe(6);
      expect(computeTriangulatedArea(closedSquare, indices)).toBe(10000);
    });

    it('debe filtrar micro-distancias y vértices redundantes consecutivos (< 0.1 mm)', () => {
      const noisyPoly: Point2D[] = [
        createPoint(0, 0),
        createPoint(0.02, 0.01), // Micro-vértice espurio
        createPoint(100, 0),
        createPoint(100.04, 0.02), // Micro-vértice espurio
        createPoint(100, 100),
        createPoint(0, 100),
      ];

      const cleaned = cleanPolygonVertices(noisyPoly, 0.1);
      expect(cleaned.points.length).toBe(4);

      const indices = triangulatePolygon(noisyPoly);
      expect(indices.length).toBe(6);
      expect(computeTriangulatedArea(noisyPoly, indices)).toBe(10000);
    });

    it('debe devolver array vacío para polígonos degenerados (< 3 vértices)', () => {
      expect(triangulatePolygon([])).toEqual([]);
      expect(triangulatePolygon([createPoint(0, 0)])).toEqual([]);
      expect(triangulatePolygon([createPoint(0, 0), createPoint(10, 10)])).toEqual([]);
    });

    it('debe clasificar correctamente la convexidad con isPolygonConvex', () => {
      const convexPoly: Point2D[] = [
        createPoint(0, 0),
        createPoint(100, 0),
        createPoint(100, 100),
        createPoint(0, 100),
      ];
      expect(isPolygonConvex(convexPoly)).toBe(true);

      const concavePoly: Point2D[] = [
        createPoint(0, 0),
        createPoint(100, 0),
        createPoint(50, 50), // Muesca cóncava
        createPoint(100, 100),
        createPoint(0, 100),
      ];
      expect(isPolygonConvex(concavePoly)).toBe(false);
    });

    it('debe testear con precisión el predicado punto en triángulo (isPointInTriangle)', () => {
      const a = createPoint(0, 0);
      const b = createPoint(100, 0);
      const c = createPoint(50, 80);

      // Punto interior
      expect(isPointInTriangle(createPoint(50, 30), a, b, c)).toBe(true);
      // Punto exterior
      expect(isPointInTriangle(createPoint(120, 30), a, b, c)).toBe(false);
      expect(isPointInTriangle(createPoint(50, -10), a, b, c)).toBe(false);
      expect(isPointInTriangle(createPoint(50, 100), a, b, c)).toBe(false);
      // Vértices del triángulo (no deben contar como intrusos)
      expect(isPointInTriangle(a, a, b, c)).toBe(false);
      expect(isPointInTriangle(b, a, b, c)).toBe(false);
      expect(isPointInTriangle(c, a, b, c)).toBe(false);
      // Los puntos en aristas tampoco bloquean una oreja.
      expect(isPointInTriangle(createPoint(50, 0), a, b, c)).toBe(false);
      expect(isPointInTriangle(createPoint(75, 40), a, b, c)).toBe(false);
    });

    it('debe bloquear una oreja cuya diagonal contiene un vértice no adyacente', () => {
      const diagonalVertexOutline: Point2D[] = [
        createPoint(0, 0),
        createPoint(2, 0),
        createPoint(2, 2),
        createPoint(1, 1),
        createPoint(0, 2),
      ];

      const indices = triangulatePolygon(diagonalVertexOutline, { tolerance_mm: 0 });
      const polygonArea = computePolygonArea(diagonalVertexOutline);
      const triangulatedArea = computeTriangulatedArea(diagonalVertexOutline, indices);

      expect(indices.length).toBe((diagonalVertexOutline.length - 2) * 3);
      expect(new Set(indices)).toEqual(new Set(diagonalVertexOutline.map((_, index) => index)));
      expect(Math.abs(triangulatedArea - polygonArea) / polygonArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(diagonalVertexOutline, indices)).toBe(true);
      for (let i = 0; i < indices.length; i += 3) {
        const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
        expect(crossProduct2D(diagonalVertexOutline[a], diagonalVertexOutline[b], diagonalVertexOutline[c])).toBeGreaterThan(1e-7);
      }
    });

    it('debe triangular una curva densa cóncava con puntos colineales sin abanico', () => {
      const denseConcaveOutline: Point2D[] = [
        createPoint(0, 0),
        createPoint(20, 0),
        createPoint(40, 0),
        createPoint(60, 0),
        createPoint(80, 0),
        createPoint(120, 0),
        createPoint(120, 25),
        createPoint(118, 45),
        createPoint(112, 62),
        createPoint(105, 75),
        createPoint(100, 100),
        createPoint(75, 100),
        createPoint(50, 100),
        createPoint(0, 100),
        createPoint(0, 70),
        createPoint(20, 70),
        createPoint(45, 55),
        createPoint(20, 40),
        createPoint(0, 40),
      ];

      const indices = triangulatePolygon(denseConcaveOutline);
      const polygonArea = computePolygonArea(denseConcaveOutline);
      const triangulatedArea = computeTriangulatedArea(denseConcaveOutline, indices);

       expect(indices.length).toBe((denseConcaveOutline.length - 2) * 3);
       expect(new Set(indices)).toEqual(new Set(denseConcaveOutline.map((_, index) => index)));
       expect(Math.abs(triangulatedArea - polygonArea) / polygonArea).toBeLessThan(0.001);
      expect(validateTriangleOrientations(denseConcaveOutline, indices)).toBe(true);
      for (let i = 0; i < indices.length; i += 3) {
        const [a, b, c] = [indices[i], indices[i + 1], indices[i + 2]];
        expect(crossProduct2D(denseConcaveOutline[a], denseConcaveOutline[b], denseConcaveOutline[c])).toBeGreaterThan(1e-7);
      }
    });
  });

  // ==========================================
  // 5. PATRONES ANIME / COSPLAY (KIMONO FURISODE, VESTIDOS)
  // ==========================================
  describe('5. Patrones Especiales Anime & Cosplay (Kimonos, Vestidos)', () => {
    it('debe triangular paneles de Manga Kimono Furisode con caída cuadrada amplia', () => {
      const furisodePanel: Point2D[] = [
        createPoint(0, 0), // Hombro sisa
        createPoint(300, 0), // Borde superior manga
        createPoint(300, 750), // Esquina inferior externa
        createPoint(100, 750), // Ruedo inferior
        createPoint(0, 500), // Inflexión de caída lateral
        createPoint(0, 150), // Costado sisa
      ];

      const mesh = triangulatePolygonMesh(furisodePanel);
      const polyArea = computePolygonArea(furisodePanel);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;

      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
      expect(mesh.indices.length).toBe((furisodePanel.length - 2) * 3);
    });

    it('debe triangular vestimenta anime completa (Water Goddess Dress) en todas las tallas XS-3XL', () => {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] as const;

      for (const sz of sizes) {
        const dressDna: PatternDna = {
          concept_name: 'anime_water_goddess_dress',
          base_block: 'dress_sloper',
          garment_category: 'dress',
          sizing: { size: sz },
          ease: { chest_ease_mm: 30, waist_ease_mm: 20, hip_ease_mm: 40 },
          modifications: {
            neckline: { type: 'sweetheart', depth_mm: 70 },
            hem: { type: 'asymmetric', drop_mm: 80 },
          },
        };

        const result = modifyPattern(dressDna, sz);
        for (const [partName, part] of Object.entries(result.parts)) {
          if (part.outline && part.outline.length >= 3) {
            const indices = triangulatePolygon(part.outline);
            const triArea = computeTriangulatedArea(part.outline, indices);
            const polyArea = computePolygonArea(part.outline);

            expect(indices.length).toBeGreaterThanOrEqual(3);
            const relError = Math.abs(triArea - polyArea) / (polyArea || 1);
            expect(relError).toBeLessThan(0.001);
            expect(validateTriangleOrientations(part.outline, indices)).toBe(true);
          }
        }
      }
    });

    it('debe triangular un polígono en estrella de 10 puntas (alta concavidad múltiple)', () => {
      const star: Point2D[] = [];
      const pointsCount = 10;
      for (let i = 0; i < pointsCount * 2; i++) {
        const r = i % 2 === 0 ? 150 : 60;
        const theta = (i * Math.PI) / pointsCount;
        star.push(createPoint(r * Math.cos(theta), r * Math.sin(theta)));
      }

      const mesh = triangulatePolygonMesh(star);
      const polyArea = computePolygonArea(star);
      const relError = Math.abs(mesh.area_mm2 - polyArea) / polyArea;

      expect(relError).toBeLessThan(0.001);
      expect(mesh.isCcw).toBe(true);
    });
  });
});
