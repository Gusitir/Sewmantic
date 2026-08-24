# DECISION v1 - Stack Fundacional Seleccionado para Motor Semantico

Status: architecture selected; integration not authorized
Decision date: 2026-08-23
Evidence plan: `PLAN_v1.0-semantic-pattern-foundation.md`

## Selected stack

| Capa | Seleccion | Evidencia | Condicion de integracion |
|---|---|---|---|
| Modelo de dominio | Kernel TypeScript propio: `Edge`, `EdgeSequence`, `Panel`, `Component`, `Interface`, `StitchPair`, constraints | T-42, 18/18 invariantes | Convertir spike ESM a contratos TypeScript versionados; no copiar runtime Python |
| Geometria 2D | `@flatten-js/core@1.6.14` detras de `GeometryAdapter` | T-41, poligonos/agujeros/booleanos/cortes curvos | No exponer tipos Flatten en contratos publicos; offset requiere gate especifico |
| Harness | `ai@7.0.77` + `@ai-sdk/fireworks@3.0.38` | T-43 live: 2 pasos, tool call real, 855 tokens, respuesta final | Tool registry de dominio, max steps, Zod y revisiones permanecen propios |
| Modelo operativo | Fireworks `accounts/fireworks/models/qwen3p8-max` para patronista; Obreros usan DeepSeek V4 Flash 0731 | T-43 live y orquestacion verificada | Provider configurable; no acoplar estado al modelo |
| Validacion | Zod como fuente de schemas runtime | T-43 tools y baseline del producto | Capability Registry debe generar Zod/tipos/tools/prompt desde una fuente unica |
| Estado inicial | JSON local versionado detras de `SessionStore`/`RevisionStore` | T-43 restart byte-identical y undo hash-exacto | Migrar a SQLite solo si consultas/concurrencia lo justifican |
| RAG | `@orama/orama@2.1.1`, full-text BM25F + filtros | T-44, 24 reglas, 18 consultas, recall@k 1.0, 14/14 invariantes | Tokenizer de guion fijado; corpus y expected sources versionados |
| Vector/hibrido | Diferido | T-44 no encontro deficiencia full-text | Activar solo con benchmark real que demuestre mejora |
| Tools externas | Internas primero; MCP diferido | Decision de alcance | Adapter MCP solo despues de estabilizar contratos internos |
| Salidas comerciales | Pipeline SVG/PDF/GLB/techpack/Etsy existente mediante adapters | Baseline actual | Migracion incremental; no reescritura big-bang |

## Evidence summary

- `T-41`: 16/16 invariantes. Flatten.js representa area y agujeros semanticamente; Maker.js es path-centric y no es kernel de producto.
- `T-42`: 18/18 invariantes. Matching de interfaces, orientacion, cortes, pinzas, IDs y round-trip son viables sin nuevas dependencias de dominio.
- `T-43`: 17/17 invariantes offline. Vercel AI SDK + Fireworks ejecuto `get_current_pattern` en un tool loop real de dos pasos, 855 tokens y sin secretos persistidos.
- `T-44`: 14/14 invariantes. Orama recupero las 18 fuentes esperadas, respeto filtros, persistio el indice y preservo `hit.document.id/source`.
- Gate conjunto final: cuatro experimentos PASS, `npm run build` PASS y `npm test` 21/21 suites, 556/556 tests PASS.

## Explicit rejections

- **Maker.js como kernel:** rechazado; util para dibujo/export/offset, pero no posee semantica nativa de area con agujeros.
- **OpenAI Agents SDK para esta fase:** rechazado; Fireworks requiere adapter manual y Vercel posee provider de primera parte ya probado.
- **Mastra:** rechazado inicialmente por superficie y complejidad desproporcionadas para una app local.
- **Vectra/sqlite-vec/vector RAG:** diferidos; no existe deficiencia full-text demostrada.
- **Seamly2D code:** no incorporar por GPLv3 sin decision legal explicita.
- **GarmentCode runtime Python:** no incorporar completo; portar conceptos/algoritmos MIT con atribucion y contratos propios.
- **MCP inicial:** diferido; no agrega valor antes de estabilizar tools internas.

## Known risks and mandatory gates

1. `@flatten-js/core` no resuelve por si solo todos los offsets de margen; Phase 11 debe comparar `@flatten-js/polygon-offset` o una operacion propia antes de seleccionar offset productivo.
2. El corpus T-44 es sintetico y pequeno; la seleccion Orama full-text debe revalidarse al crecer el corpus real.
3. El live T-43 probo una tool de lectura; las mutaciones permanecen probadas offline. La primera integracion debe probar `apply_pattern_patch -> validate -> revision -> undo` en vivo con presupuesto acotado.
4. Los tipos de dependencias nunca cruzan el boundary del dominio; cada tercero queda detras de adapter.
5. Ningun archivo en `experiments/` se copia directamente a `src/` sin un brief de migracion, revision y tests de produccion.

## STOP boundary

La seleccion de stack completa la autorizacion `D-2026-08-23-V1-EXEC`. No se inicia Semantic Kernel MVP ni se integra dependencia alguna hasta que el Humano confirme `H-04` y autorice el siguiente plan.

## Savepoint

- Tag: `savepoint-v1-foundation-stack-20260823`
- Commit: `5abf95ae180a714f19385d8fcfd6b26b99f2fbe2`
- Remote: private GitHub `Gusitir/Sewmantic`, tag y `master` verificados.
- Google Drive bundle: `Mi unidad/backups/sewmantic-savepoint-v1-foundation-stack-20260823.bundle`
- Bundle SHA-256: `58C877AE59940917B30F001E558BB7B8F1CF0B8909E496CB93A6FF1BB63DFE9E`
- Google Drive snapshot: `Mi unidad/backups/sewmantic-savepoint-v1-foundation-stack-20260823.zip`
- ZIP SHA-256: `3038A9EBF608D763AFF7B99E105C408EE1811143B0A334AE6E019035D8930EEB`
- Verification: bundle complete history PASS; ZIP 166 entries PASS.
