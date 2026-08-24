# REFERENCES v1 - Fundaciones Open Source Evaluadas

Verified research date: 2026-08-23
Purpose: registrar evidencia de diseno y licencias antes de seleccionar dependencias para Motor v2.

## Shortlist

| Proyecto | Licencia | Aporte verificable | Decision preliminar |
|---|---|---|---|
| [GarmentCode](https://github.com/maria-korosteleva/GarmentCode) | MIT | `Edge`, `Panel`, `Component`, `Interface`, reglas de costura, operadores y patrones parametricos | Portar conceptos y evaluar algoritmos; no adoptar el stack Python completo |
| [Design2GarmentCode](https://github.com/Style3D/design2garmentcode-impl) | MIT | Sintesis multimodal de programas y comando conversacional `modify:` | Referencia de UX/pipeline; evitar su enorme vocabulario cerrado y dependencias ML pesadas |
| [FreeSewing](https://github.com/freesewing/freesewing) | MIT | Disenos parametricos y ecosistema Node ya relacionado con el producto | Mantener adapter; no depender exclusivamente de un repositorio archivado |
| [Seamly2D](https://github.com/FashionFreedom/Seamly2D) | GPL-3.0 | CAD de patronaje, formulas, medidas y fixtures industriales | Referencia funcional; no incorporar codigo sin decision legal/copyleft explicita |
| [Flatten.js](https://github.com/alexbol99/flatten-js) | MIT | Geometria 2D, arcos, poligonos, cortes, booleanos, relaciones y offsets | Candidato principal para Geometry Adapter |
| [Maker.js](https://github.com/microsoft/maker.js) | Apache-2.0 | Paths, chains, modelos JSON, mirror, booleanos y exportadores | Comparador de Flatten.js e inspiracion para DSL/model tree |
| [JSCAD](https://github.com/jscad/OpenJSCAD.org) | MIT | CAD procedural 2D/3D modular en JavaScript | Reservar para componentes rigidos y accesorios futuros |
| [Vercel AI SDK](https://github.com/vercel/ai) | Apache-2.0 | Tool loop, Zod, streaming UI y provider OpenAI-compatible | Candidato principal para harness Fireworks |
| [OpenAI Agents SDK JS](https://github.com/openai/openai-agents-js) | MIT | Sessions, tools, HITL, tracing y handoffs | Comparador de harness; probar compatibilidad real con Fireworks |
| [Mastra](https://github.com/mastra-ai/mastra) | Apache-2.0 core; `ee/` comercial | Agentes, workflows, memoria, RAG, suspend/resume y observabilidad | Referencia completa; evitar peso y superficie enterprise iniciales |
| [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | MIT/Apache-2.0 | Protocolo estandar de tools/resources/prompts | Adapter futuro; tools internas primero |
| [Orama](https://github.com/oramasearch/orama) | Apache-2.0 | Full-text, BM25, filtros, vector e hibrido embebido TypeScript | Candidato principal para RAG local |
| [Vectra](https://github.com/Stevenic/vectra) | MIT | Indice vectorial local file-backed y embeddings locales | Alternativa si el spike exige vector-first |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | Apache-2.0 | Busqueda vectorial embebida en SQLite | No inicial: pre-1.0 y extension nativa complican Windows |
| [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) | MIT | Loop lineal pequeno, trazabilidad y ejecuciones independientes | Adoptar filosofia de simplicidad, no su herramienta shell |

## Hallazgos que condicionan el diseno

1. GarmentCode demuestra que una interfaz de costura debe ser una entidad de dominio, no un nombre inferido. Su `StitchingRule` subdivide interfaces para compatibilizar segmentos y advierte diferencias de longitud.
2. Sus operadores actualizan geometria e interfaces al insertar cortes o pinzas; esta coherencia debe ser invariante del kernel propio.
3. Design2GarmentCode valida imagen/texto -> programa parametrico -> modificacion conversacional, pero su `Text Space` cerrado reproduce el limite que Motor v2 debe superar con operadores y recetas.
4. Vercel AI SDK ya ofrece provider OpenAI-compatible y tool loop; no hay valor en reimplementar transporte, streaming o parsing de tool calls.
5. Orama permite iniciar RAG con full-text y filtros sin embeddings ni servicio externo; vector/hibrido puede activarse solo si el benchmark lo justifica.
6. Flatten.js cubre operaciones geometricas genericas, pero no conoce costuras, pinzas o confeccionabilidad; debe quedar detras de un adapter y nunca convertirse en el modelo de dominio.
7. Seamly2D contiene experiencia industrial valiosa, pero GPLv3 requiere una decision consciente antes de reutilizar codigo.

## Restricciones de adopcion

- Verificar licencia del paquete exacto, no solo del repositorio, antes de integrar.
- Registrar copyright y atribuciones para codigo MIT/Apache reutilizado sustancialmente.
- No mezclar codigo GPLv3 con el producto sin aprobacion humana y revision legal.
- No adoptar una dependencia hasta pasar fixture de dominio, gate de Windows y evaluacion de mantenimiento.
- Mantener adapters propios para evitar acoplar contratos del producto a APIs de terceros.

## Hipotesis a validar

- `Flatten.js` puede preservar area, orientacion y offsets de patrones densos en milimetros.
- El modelo semantico de GarmentCode puede reducirse a un kernel TypeScript pequeno sin arrastrar simulacion Python.
- Vercel AI SDK puede operar Fireworks con tools, streaming y estado local sin perdida de argumentos.
- Orama full-text con metadatos satisface el primer corpus; embeddings no son requisito inicial.

Las decisiones finales pertenecen a `PLAN_v1.0-semantic-pattern-foundation.md` y requieren evidencia de sus cuatro spikes.

## Final foundation selection

La seleccion empirica esta en `DECISION_v1-foundation-stack.md`: Flatten.js, kernel TypeScript propio, Vercel AI SDK + Fireworks y Orama full-text. Alternativas no seleccionadas o diferidas permanecen documentadas para reevaluacion por evidencia.
