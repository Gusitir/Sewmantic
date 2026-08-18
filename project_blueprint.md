# **Blueprint Técnico y Estratégico: Generador Paramétrico de Patrones IA**

## **1\. Visión del Proyecto y Modelo de Negocio**

> * **Objetivo Dual:**  
  * **Uso personal y prototipado:** Crear siluetas de autor, estética streetwear y prendas físicas para el universo de **MyPetCreature** con ajuste a medidas exactas.  
  * **Comercialización digital:** Venta de patrones en PDF descargable con costo marginal de entrega de \\$0\\text{ USD} y márgenes superiores al 90%.  
> * **Nicho Estratégico:** Streetwear conceptual, siluetas anime/geek y cortes estructurados (mercado de alta disposición de pago: \\$12\\text{ \- }\\$20\\text{ USD} por patrón).  
> * **Canal de Venta Inicial:** **Etsy** directo. Resuelve pasarelas de pago, cobro de impuestos digitales internacionales (IVA/VAT) y aporta tráfico de búsqueda orgánico.  
> * **Blindaje Legal (Marcas Registradas):**  
  * Los cortes de ropa no tienen copyright, pero los nombres sí.  
  * En títulos y descripciones se usan conceptos descriptivos: *"Anime Water Goddess Cosplay Dress & Streetwear Set"* en lugar de marcas protegidas (como *Aqua* o *KonoSuba*).

## **2\. Arquitectura del Pipeline Técnico**

\[ Imagen de Referencia \] \+ \[ rules\_pattern\_making.md \]  
                         │  
                         ▼  
        ┌──────────────────────────────────┐  
        │   AI Provider Factory (.env)     │  
        └────────────────┬─────────────────┘  
                         │  
         ┌───────────────┴───────────────┐  
         ▼                               ▼  
┌──────────────────┐           ┌──────────────────┐  
│  OpenCode CLI    │           │   API Directa    │  \<-- Intercambiable sin tocar código  
│ (Subscripción)   │           │ (Claude/OpenAI)  │  
└────────┬─────────┘           └────────┬─────────┘  
         │                              │  
         └───────────────┬──────────────┘  
                         │  
                         ▼  
           \[ JSON Paramétrico de ADN \]  
                         │  
                         ▼  
        \[ Motor Geométrico: FreeSewing \]  
  • Modificación de Bloques Base (Slopers)  
  • Cálculo de holguras, costuras y piquetes  
                         │  
                         ▼  
           \[ Exportables de Salida \]  
  ├── PDF Paginado A4 / Letter / A3 (con cruces de registro A1, A2...)  
  ├── SVG / PDF A0 continuo (para Plotter / Corte láser)  
  └── Ficha técnica de armado y consumo de tela

## **3\. Contrato de Datos y Moldería Paramétrica**

Para evitar que la IA alucine curvas vectoriales imposibles, el modelo solo emite **operaciones sobre bloques base**:

### **Esquema JSON Normalizado**

{  
  "concept\_name": "water\_priestess\_hoodie",  
  "base\_block": "menswear\_torso\_oversize",  
  "ease": {  
    "chest\_ease\_mm": 120,  
    "bicep\_ease\_mm": 60  
  },  
  "modifications": {  
    "neckline": { "type": "crossover\_hood", "depth\_mm": 40 },  
    "sleeves": { "type": "drop\_shoulder", "drop\_mm": 50, "cuff\_elastic": true },  
    "hem": { "type": "curved\_tail", "drop\_mm": 35 }  
  },  
  "notions": \["1x cordón 120cm", "2x ojetes metálicos", "30cm elástico puños"\],  
  "estimated\_fabric\_meters": 1.85  
}

## **4\. Reglas de Control de Calidad Textil (En el Motor)**

> * **Separación de Holguras (*Ease*):**  
  * *Holgura de confort:* \+2\\text{ a }+4\\text{ cm} mínimos sobre el contorno para movilidad.  
  * *Holgura de diseño (oversize):* \+12\\text{ a }+25\\text{ cm} según la silueta de la imagen.  
> * **Cuadro de Calibración Anti-Errores (Impresión):**  
  * Inclusión obligatoria en la **Página 1** de un recuadro de 10\\text{ cm} \\times 10\\text{ cm} (4\\text{ in} \\times 4\\text{ in}) con regla visual y advertencia de imprimir a escala 100%.  
> * **Capas PDF (*PDF Layers*):** Exportación con tallas separadas por capas (XS a 3XL) para permitir imprimir solo la talla deseada.  
> * **Marcas Técnicas Automatizadas:**  
  * Dirección de hilo de tela (*grainline*) en el 100% de las piezas.  
  * Piquetes de coincidencia (*notches*) en costuras clave (sisa con copa de manga, costados, tiros).  
  * Margen de costura parametrizable (10\\text{ mm} estándar, 20\\text{ \- }30\\text{ mm} en dobladillos).

## **5\. Arquitectura del Código Fuente (Estructura en PC)**

pattern-ai-core/  
├── .env                               \# Configuración (AI\_PROVIDER=opencode | api)  
├── rules\_pattern\_making.md            \# Reglas de patronaje inyectadas al LLM  
├── package.json  
├── tsconfig.json  
├── src/  
│   ├── index.ts                       \# Entrypoint CLI  
│   ├── ai/  
│   │   ├── base\_provider.ts           \# Interfaz común (IAiProvider)  
│   │   ├── opencode\_cli\_provider.ts   \# Ejecución bash con suscripción ChatGPT  
│   │   ├── direct\_api\_provider.ts     \# Conexión directa HTTP/SDK con API Key  
│   │   └── factory.ts                 \# Selector de proveedor  
│   ├── engine/  
│   │   ├── base\_blocks/               \# Slopers de FreeSewing (torso, falda, manga)  
│   │   ├── modifier.ts                \# Aplica el JSON sobre los bloques  
│   │   └── exporter.ts                \# Renderizado SVG y Tiling a PDF (A4/Plotter)  
│   └── utils/  
│       └── tiler.ts                   \# Generador de cruces de corte y numeración  
└── output/                            \# PDFs y SVGs generados

## **6\. Roadmap por Fases**

| Fase | Alcance Técnico | Objetivo de Negocio |
| :---- | :---- | :---- |
| **Fase 1: MVP Operativo** *(Inmediato)* | CLI con OpenCode \+ ChatGPT, motor FreeSewing en Node.js, exportación A4/Plotter y subida manual a Etsy. | Validar la calidad de ensamble de las prendas, crear prototipos personales de *MyPetCreature* y generar las primeras ventas en Etsy. |
| **Fase 2: Web Vitrina \+ 3D / AR** | Portal web de catálogo, script headless en Blender (bpy) para simular tela y exportar .glb, reutilizando el visor WebGL/AR de *MyPetCreatures* con botones de compra hacia Etsy. | Elevar la percepción de marca, mejorar la conversión y justificar precios premium (\\$15\\text{ \- }\\$22\\text{ USD}). |
| **Fase 3: Optimización** *(Opcional)* | Migración a API directa o *fine-tuning* en Together.ai (Qwen-VL). | Reducir costos por llamada solo cuando el volumen de generación sea masivo. |

