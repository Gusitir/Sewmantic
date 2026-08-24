# ROADMAP v1 - Plataforma Semantica de Patronaje Conversacional

Status: strategic direction approved; implementation not authorized
Decision: `D-2026-08-23-V1`

## North star

Construir un patronista conversacional persistente que traduzca intenciones de diseno en operaciones semanticas, ejecute esas operaciones mediante un motor geometrico determinista, valide confeccionabilidad y produzca revisiones aprobables antes de exportar un paquete vendible para Etsy.

```text
Imagen o instruccion
  -> Patternist Harness
  -> estado y revision canonicos
  -> tool calling de dominio
  -> Semantic Pattern Kernel
  -> restricciones y validadores
  -> preview 2D/3D
  -> aprobacion humana
  -> pipeline comercial existente
```

## Invariantes aprobados

1. La IA no genera coordenadas finales arbitrarias ni edita archivos de producto directamente.
2. El estado canonico vive fuera del modelo: sesion, ADN, decisiones, revisiones, artefactos y resultados de validacion.
3. El agente emite operaciones o parches pequenos, tipados, reversibles y auditables.
4. Prompt, Zod, tipos, tools y documentacion de capacidades derivan de un Capability Registry unico.
5. El kernel modela `Edge`, `EdgeSequence`, `Panel`, `Component`, `Interface`, `StitchPair` y restricciones de costura.
6. Las prendas se expresan como recetas declarativas compuestas sobre operadores genericos.
7. Las capacidades evolucionan `draft -> experimental -> stable`; ninguna promocion ocurre sin pruebas y aprobacion humana.
8. RAG aporta conocimiento, nunca reemplaza estado, capacidades ni verdad geometrica.
9. El pipeline actual de PDF/SVG/GLB/techpack/Etsy se conserva mediante adaptadores durante la migracion.
10. Un pedido no soportado produce alternativa o Capability Gap; nunca exito ficticio.

## Arquitectura objetivo

```text
Patternist Harness
|- provider adapter and tool loop
|- session store and context builder
|- revision manager and undo/redo
|- capability/tool registry
`- bounded execution and human approval

Pattern Knowledge
`- local full-text/hybrid retrieval

Semantic Pattern Kernel
|- edges and curves
|- panels and components
|- interfaces and stitch pairs
|- constraints and diagnostics
`- geometry adapter

Capability Platform
|- operator SDK
|- recipe DSL
|- capability registry
|- gap queue
`- capability workshop

Commercial Pipeline Adapter
`- SVG/PDF/GLB/techpack/Etsy ZIP
```

## Ruta de desarrollo

| Fase | Resultado | Barrera de salida |
|---|---|---|
| **10.0 - Foundation Spikes** | Seleccion empirica de geometria, kernel semantico, harness y RAG | APTO tecnico; stack seleccionado; H-04 pendiente |
| **11.0 - Semantic Kernel MVP** | Edge/Panel/Interface/StitchPair, serializacion y restricciones base | ACTIVE: T-45 a T-48 autorizadas |
| **12.0 - Operators, Registry & Recipe DSL** | Operadores combinables y fuente unica de capacidades | Prompt/tipos/Zod/tools generados sin deriva contractual |
| **13.0 - Conversational Patternist Harness** | Sesiones, tools de dominio, revisiones, undo/redo y previews | Conversacion reproducible sin perdida de decisiones |
| **14.0 - Pattern Knowledge RAG** | Reglas textiles locales con retrieval filtrado y trazable | Corpus versionado y respuestas con fuentes pertinentes |
| **15.0 - Garment Family Migration** | Hoodie, camisa, chaleco, pantalon/shorts y falda/vestido sobre recetas | Cinco familias vendibles sin regresion del pipeline actual |
| **16.0 - Capability Workshop** | Gap queue, SDK y promocion draft/experimental/stable | Nueva capacidad creada sin modificar el kernel central |
| **17.0 - Product Readiness** | Flujo conversacional integrado a Web Studio y exportacion Etsy | Gates geometricos, visuales, fisicos y comerciales aprobados |

## Estrategia de reutilizacion

- Adoptar conceptos y algoritmos permisivos, no copiar arquitecturas completas por defecto.
- Usar `GarmentCode` como referencia principal de topologia textil y costuras semanticas.
- Evaluar `Flatten.js` como adapter geometrico 2D; comparar `Maker.js` solo donde aporte cadenas/modelos/exportacion.
- Evaluar Vercel AI SDK como tool loop principal compatible con Fireworks; comparar OpenAI Agents SDK en el spike.
- Evaluar Orama como RAG local full-text primero e hibrido despues; Vectra queda como alternativa vectorial.
- Mantener Seamly2D como referencia funcional sin incorporar codigo GPLv3 al producto.

## Automejora controlada

```text
intencion no soportada
  -> normalizar sinonimo
  -> buscar capacidad equivalente
  -> componer operadores
  -> crear receta provisional
  -> registrar Capability Gap
  -> implementar en Workshop
  -> verificar
  -> promover version
```

El agente puede proponer especificaciones y recetas, pero no publicar codigo nuevo en runtime. La mejora acumulativa ocurre mediante recetas, knowledge packs, fixtures y operadores versionados.

## Non-goals

- Soportar cualquier prenda existente en la primera version.
- Reemplazar de inmediato el pipeline comercial actual.
- Incorporar simulacion textil pesada durante Foundation Spikes.
- Crear infraestructura SaaS, multiusuario o distribuida.
- Adoptar un framework grande antes de probar su valor con fixtures del dominio.

## Criterio de exito de plataforma

- El agente solo utiliza capacidades reales y puede explicar supuestos o brechas.
- Cada borde de costura tiene semantica y pareja verificable.
- Las modificaciones son incrementales, reversibles y reproducibles.
- Nuevas prendas se crean principalmente por composicion de recetas.
- Las familias promovidas generan patrones confeccionables y paquetes Etsy sin correcciones manuales materiales.
