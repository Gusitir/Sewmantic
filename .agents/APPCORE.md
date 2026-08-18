# APPCORE - Generador Paramétrico de Patrones IA

Verified: 2026-08-17 at init

## Purpose and users

- Problem: Generar patrones textiles paramétricos listos para corte y confección a partir de conceptos o imágenes de referencia, evitando alucinaciones vectoriales de la IA mediante un motor geométrico determinista (FreeSewing).
- Users:
  - Diseñadores y costureros: Prototipado y confección de siluetas de autor / streetwear para MyPetCreature con ajuste a medidas exactas.
  - Clientes digitales en Etsy: Venta de patrones digitales en PDF descargable con costo marginal de entrega  USD y márgenes > 90%.
- Non-goals:
  - Generación directa de SVG arbitrarios no supervisados por IA sin pasar por bloques base normalizados.
  - Plataforma web multi-usuario en Fase 1 (se enfoca en CLI MVP).

## Stable constraints and invariants

- La IA nunca emite curvas vectoriales arbitrarias; solo emite un JSON paramétrico de ADN con modificaciones sobre bloques base (slopers).
- Separación de holguras: holgura de confort (+2 a +4 cm) vs holgura de diseño/oversize (+12 a +25 cm).
- Calibración de impresión obligatoria en Página 1: Recuadro de 10 cm x 10 cm (4 in x 4 in) a escala 100%.
- Capas de PDF por talla (XS a 3XL) para permitir impresión selectiva.
- Marcas técnicas automatizadas: Hilo de tela (grainline) en 100% de piezas, piquetes de coincidencia (notches) y margen de costura parametrizable (10mm estándar, 20-30mm en dobladillos).
- Blindaje legal: Uso exclusivo de nombres descriptivos sin marcas comerciales protegidas en títulos/fichas.

## Architecture map

- 
ules_pattern_making.md: Reglas de patronaje técnico inyectadas al LLM.
- src/index.ts: Entrypoint del CLI.
- src/ai/base_provider.ts: Interfaz común IAiProvider.
- src/ai/opencode_cli_provider.ts: Proveedor basado en OpenCode CLI / ChatGPT.
- src/ai/direct_api_provider.ts: Proveedor API directa (Claude / OpenAI).
- src/ai/factory.ts: Selector de proveedor según variable de entorno AI_PROVIDER.
- src/engine/base_blocks/: Slopers base de FreeSewing (torso, falda, manga).
- src/engine/modifier.ts: Motor que aplica el JSON paramétrico de ADN sobre los slopers.
- src/engine/exporter.ts: Renderizado SVG y exportación a PDF (A4/Letter y A0 Plotter).
- src/utils/tiler.ts: Generador de cruces de corte y numeración de páginas (A1, A2...).

## Interfaces and protocols

- Esquema JSON de ADN Paramétrico:
  - concept_name: string
  - ase_block: string
  - ease: { chest_ease_mm: number, bicep_ease_mm: number, ... }
  - modifications: { [component: string]: { type: string, [param: string]: any } }
  - 
otions: string[]
  - estimated_fabric_meters: number

## External systems

- OpenCode CLI / ChatGPT y Direct APIs (Claude/OpenAI).
- Etsy: Canal de venta digital inicial (flujo de carga manual en Fase 1).
- MyPetCreature 3D/AR Viewer: Integración de catálogo en Fase 2.

Only verified, durable facts belong here. Changing state belongs in CURRENT.
