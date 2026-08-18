# Reglas Técnicas de Patronaje y Moldería Paramétrica (rules_pattern_making.md)

Este documento define las reglas técnicas textiles, restricciones geométricas y estándares de calidad para el sistema de generación de patrones **pattern-ai-core**. Estas reglas son inyectadas en los prompts del sistema de IA y aplicadas de forma determinista en el motor geométrico.

---

## 1. Principio Fundamental: Generación Paramétrica vs SVG Libre

1. **Prohibición de SVG Libre por IA:**
   - La IA **nunca** genera código SVG directo, puntos Bezier arbitrarios o geometrías flotantes sin base anatómica.
   - La IA genera exclusivamente un **JSON paramétrico estructurado** que especifica modificaciones numéricas (en milímetros) sobre bloques base (*slopers*) anatómicamente validados.
2. **Determinismo Geométrico:**
   - El motor geométrico (FreeSewing v3+) toma el JSON paramétrico y ejecuta transformaciones matemáticas exactas (cálculo de curvas, tangentes, intersecciones y empalmes).
   - Garantiza que todas las piezas sean geometrías cerradas, imprimibles y ensamblables en tela real.

---

## 2. Jerarquía y Separación de Holguras (Ease)

Toda prenda confeccionada requiere dos tipos distintos de holgura sobre las medidas corporales netas:

### 2.1. Holgura de Confort (*Comfort / Wearing Ease*)
- **Definición:** Espacio indispensable sobre el contorno corporal para permitir respiración, movimiento y postura sin deformar la prenda ni reventar costuras.
- **Rango estándar:** `+20 mm` a `+40 mm` (`+2 cm` a `+4 cm`) en contorno de pecho/busto, cintura y cadera.
- **Aplicación:** Base obligatoria en cualquier silueta ajustada o estándar.

### 2.2. Holgura de Diseño (*Design / Style Ease*)
- **Definición:** Volumen adicional deliberado para lograr una silueta estética particular (ej. Streetwear oversize, Boxy cut, Drop-shoulder, Kimono fit).
- **Rango Streetwear / Oversize:** `+120 mm` a `+250 mm` (`+12 cm` a `+25 cm`) de holgura total sobre el contorno de pecho.
- **Regla de proporción:** Al incrementar la holgura de pecho en siluetas *drop-shoulder*, la sisa debe profundizarse y la copa de manga (*sleeve cap*) debe aplanarse proporcionalmente para evitar pliegues en la axila.

---

## 3. Cuadro de Calibración Anti-Errores de Impresión

Para evitar que los usuarios impriman a escalas incorrectas (ej. *"Fit to page"* / *"Ajustar al área de impresión"*):

1. **Ubicación y Dimensiones Obligatorias:**
   - En la **Página 1** de todo documento PDF paginado (A4 / US Letter / A3) debe incluirse un **cuadro de calibración de 100 mm x 100 mm** ($10\text{ cm} \times 10\text{ cm} \approx 4\text{ in} \times 4\text{ in}$).
   - En coordenadas PostScript / PDFKit: $100\text{ mm} = 283.465\text{ pt}$.
2. **Elementos del Cuadro de Calibración:**
   - Recuadro exterior de $100 \times 100\text{ mm}$.
   - Regla milimétrica en eje X e Y con marcas de verificación a $50\text{ mm}$ y $100\text{ mm}$.
   - Texto de advertencia en negrita: **"VERIFICACIÓN DE ESCALA: Mide este cuadro con regla física. Debe medir exactamente 10 cm x 10 cm. Imprimir a escala 100% (sin ajuste de página)."**

---

## 4. Marcas Técnicas y Estándares de Producción Textil

El 100% de las piezas generadas por el motor deben contener las siguientes marcas técnicas estandarizadas:

### 4.1. Dirección de Hilo de Tela (*Grainline*)
- **Obligatoriedad:** 100% de las piezas de moldería.
- **Representación:** Línea continua con flechas en ambos extremos paralela al orillo de la tela (hilo de urdimbre) o a $45^\circ$ si el corte es al bies (*bias cut*).
- **Identificación:** Etiquetada con el texto `"GRAINLINE / HILO DE TELA"`.

### 4.2. Piquetes de Coincidencia (*Notches*)
- **Obligatoriedad:**
  - Sisa (*armhole*) del delantero: 1 piquete simple.
  - Sisa (*armhole*) de la espalda: 2 piquetes dobles (indica espalda).
  - Copa de manga (*sleeve cap*): 1 piquete delantero, 2 piquetes espalda, 1 piquete en el punto de hombro (*crown apex*).
  - Costados y tiros de pantalón: Piquetes de cintura, cadera y rodilla.
- **Validación por Longitud de Arco:**
  - La longitud de la curva de sisa delantera debe coincidir con la longitud de la curva de manga delantera (con una tolerancia de embebido o *sleeve ease* de $\le 15\text{ mm}$ en sastre y $0\text{ mm}$ a $5\text{ mm}$ en tejido de punto/streetwear).

### 4.3. Márgenes de Costura (*Seam Allowances*)
- **Margen estándar de unión:** `10 mm` (`1.0 cm`) en sisas, hombros, costados, escotes y tiros.
- **Dobladillos y bajos (*Hems*):** `25 mm` a `30 mm` (`2.5 cm` a `3.0 cm`) en bajo de cuerpo y puños.
- **Configuración:** Exportación con líneas de corte (con margen) y líneas de costura (*sewing line*) diferenciadas por tipo de trazo (línea discontinua para costura, continua para corte).

### 4.4. Nomenclatura e Información en Pieza
Cada pieza debe tener impreso en su interior:
- Nombre de la prenda / concepto (ej. `"STREETWEAR_OVERSIZE_HOODIE"`).
- Nombre de la pieza (ej. `"DELANTERO / FRONT"`, `"MANGA / SLEEVE"`, `"CAPUCHA / HOOD"`).
- Cantidad de corte (ej. `"Cortar 1 al doblez"`, `"Cortar 2 en espejo"`).
- Talla (o indicación de talla generada).

---

## 5. Blindaje Legal y Protección de Marcas Registradas

1. **Nombres Descriptivos de Siluetas:**
   - La ropa y sus cortes estructurales no están protegidos por derechos de autor (*copyright*), pero las marcas registradas, nombres de personajes y franquicias sí.
   - **Regla estricta:** Todos los nombres de conceptos, archivos y metadatos generados deben emplear descripciones funcionales, estéticas y de género sin mención directa de marcas registradas.
   - *Ejemplo correcto:* `"Water Priestess Cosplay Dress & Streetwear Pattern"`, `"Cyberpunk Shinobi Tactical Vest"`, `"Oversize Anime Protagonist Hoodie"`.
   - *Ejemplo prohibido:* `"Aqua Konosuba Dress"`, `"Naruto Akatsuki Cloak"`, `"Goku Gi"`.

---

## 6. Sistema de Medidas y Unidades

- **Unidad interna obligatoria:** Milímetros (`mm`).
- **Conversiones del motor:**
  - $1\text{ mm} = 2.83465\text{ pt}$ (puntos PostScript para PDFKit).
  - $1\text{ pulgada} = 25.4\text{ mm} = 72\text{ pt}$.
- Todas las entradas JSON y variables geométricas deben expresarse numéricamente en `mm`.
