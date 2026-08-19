/**
 * src/server/public/app.js
 * Orquestador Frontend del Dashboard Web Studio y Controlador de UI
 * pattern-ai-core
 */

import { PatternViewer } from './viewer.js';

// Estado global de la aplicación
const state = {
  theme: localStorage.getItem('pac_theme') || 'dark',
  activeTab: 'vector2d', // 'vector2d' | 'techpack' | 'etsy'
  activeConceptSlug: null,
  activePatternData: null,
  activeGrid: 'off',
  selectedSizes: ['S', 'M', 'L', 'XL', '2XL'],
  customMeasurements: {
    chest_circumference_mm: 1040,
    waist_circumference_mm: 860,
    hip_circumference_mm: 1020,
    inseam_mm: 800,
    sleeve_length_mm: 650,
  },
};

// Referencias DOM
let viewerInstance = null;

// Elementos de la barra superior
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIcon = document.getElementById('themeIcon');
const serverStatusBadge = document.getElementById('serverStatusBadge');
const versionBadge = document.getElementById('versionBadge');
const providerBadge = document.getElementById('providerBadge');

// Elementos del formulario generador
const generateForm = document.getElementById('generateForm');
const promptInput = document.getElementById('promptInput');
const providerSelect = document.getElementById('providerSelect');
const generateBtn = document.getElementById('generateBtn');
const generateBtnText = document.getElementById('generateBtnText');
const generateBtnSpinner = document.getElementById('generateBtnSpinner');
const presetsContainer = document.getElementById('presetsContainer');

// Sliders biométricos
const chestSlider = document.getElementById('chestSlider');
const waistSlider = document.getElementById('waistSlider');
const hipSlider = document.getElementById('hipSlider');
const inseamSlider = document.getElementById('inseamSlider');
const sleeveSlider = document.getElementById('sleeveSlider');

const chestVal = document.getElementById('chestVal');
const waistVal = document.getElementById('waistVal');
const hipVal = document.getElementById('hipVal');
const inseamVal = document.getElementById('inseamVal');
const sleeveVal = document.getElementById('sleeveVal');
const resetBioBtn = document.getElementById('resetBioBtn');

// Tallas y opciones
const sizePillsContainer = document.getElementById('sizePillsContainer');

// Pestañas centrales y toolbar del visor
const tabBtnVector = document.getElementById('tabBtnVector');
const tabBtnTechpack = document.getElementById('tabBtnTechpack');
const tabBtnEtsy = document.getElementById('tabBtnEtsy');

const viewVector2d = document.getElementById('viewVector2d');
const viewTechpack = document.getElementById('viewTechpack');
const viewEtsy = document.getElementById('viewEtsy');

const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');
const btnFitView = document.getElementById('btnFitView');
const btnResetView = document.getElementById('btnResetView');
const gridModeSelect = document.getElementById('gridModeSelect');
const btnCheckCalibration = document.getElementById('btnCheckCalibration');
const viewerSizePills = document.getElementById('viewerSizePills');

// Panel derecho (Métricas y descargas)
const fabricConsumptionVal = document.getElementById('fabricConsumptionVal');
const totalPartsCountVal = document.getElementById('totalPartsCountVal');
const fabricWidthVal = document.getElementById('fabricWidthVal');
const wasteFactorVal = document.getElementById('wasteFactorVal');

const downloadA4Btn = document.getElementById('downloadA4Btn');
const downloadLetterBtn = document.getElementById('downloadLetterBtn');
const downloadA0Btn = document.getElementById('downloadA0Btn');
const downloadSvgBtn = document.getElementById('downloadSvgBtn');
const downloadTechpackPdfBtn = document.getElementById('downloadTechpackPdfBtn');
const downloadBundleZipBtn = document.getElementById('downloadBundleZipBtn');

const libraryListContainer = document.getElementById('libraryListContainer');
const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');

/**
 * Inicializa el tema visual (Dark / Light)
 */
function initTheme() {
  document.body.className = `theme-${state.theme}`;
  if (themeIcon) {
    themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pac_theme', state.theme);
      document.body.className = `theme-${state.theme}`;
      themeIcon.textContent = state.theme === 'dark' ? '☀️' : '🌙';
      if (viewerInstance) {
        viewerInstance.setTheme(state.theme);
      }
    });
  }
}

/**
 * Inicializa los sliders biométricos y sincroniza valores
 */
function initBiometrics() {
  const updateSliderDisplay = () => {
    if (chestSlider && chestVal) {
      chestVal.textContent = `${chestSlider.value} mm (${(chestSlider.value / 10).toFixed(1)} cm)`;
      state.customMeasurements.chest_circumference_mm = Number(chestSlider.value);
    }
    if (waistSlider && waistVal) {
      waistVal.textContent = `${waistSlider.value} mm (${(waistSlider.value / 10).toFixed(1)} cm)`;
      state.customMeasurements.waist_circumference_mm = Number(waistSlider.value);
    }
    if (hipSlider && hipVal) {
      hipVal.textContent = `${hipSlider.value} mm (${(hipSlider.value / 10).toFixed(1)} cm)`;
      state.customMeasurements.hip_circumference_mm = Number(hipSlider.value);
    }
    if (inseamSlider && inseamVal) {
      inseamVal.textContent = `${inseamSlider.value} mm (${(inseamSlider.value / 10).toFixed(1)} cm)`;
      state.customMeasurements.inseam_mm = Number(inseamSlider.value);
    }
    if (sleeveSlider && sleeveVal) {
      sleeveVal.textContent = `${sleeveSlider.value} mm (${(sleeveSlider.value / 10).toFixed(1)} cm)`;
      state.customMeasurements.sleeve_length_mm = Number(sleeveSlider.value);
    }
  };

  [chestSlider, waistSlider, hipSlider, inseamSlider, sleeveSlider].forEach((slider) => {
    if (slider) {
      slider.addEventListener('input', updateSliderDisplay);
    }
  });

  if (resetBioBtn) {
    resetBioBtn.addEventListener('click', () => {
      if (chestSlider) chestSlider.value = '1040';
      if (waistSlider) waistSlider.value = '860';
      if (hipSlider) hipSlider.value = '1020';
      if (inseamSlider) inseamSlider.value = '800';
      if (sleeveSlider) sleeveSlider.value = '650';
      updateSliderDisplay();
    });
  }

  updateSliderDisplay();
}

/**
 * Inicializa las píldoras de selección de tallas
 */
function initSizePills() {
  const allSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];

  if (sizePillsContainer) {
    sizePillsContainer.innerHTML = '';
    allSizes.forEach((size) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = `size-pill ${state.selectedSizes.includes(size) ? 'active' : ''}`;
      pill.textContent = size;
      pill.addEventListener('click', () => {
        if (state.selectedSizes.includes(size)) {
          if (state.selectedSizes.length > 1) {
            state.selectedSizes = state.selectedSizes.filter((s) => s !== size);
            pill.classList.remove('active');
          }
        } else {
          state.selectedSizes.push(size);
          pill.classList.add('active');
        }
      });
      sizePillsContainer.appendChild(pill);
    });
  }

  if (viewerSizePills) {
    viewerSizePills.innerHTML = '';
    allSizes.forEach((size) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'btn-tool active';
      pill.textContent = size;
      pill.addEventListener('click', () => {
        const isActive = pill.classList.toggle('active');
        if (viewerInstance) {
          viewerInstance.toggleSizeLayer(size, isActive);
        }
      });
      viewerSizePills.appendChild(pill);
    });
  }
}

/**
 * Consulta el estado del servidor
 */
async function fetchServerStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) throw new Error('Servidor no disponible');
    const data = await res.json();
    if (serverStatusBadge) {
      serverStatusBadge.className = 'status-badge online';
      serverStatusBadge.innerHTML = '<span class="status-dot"></span> Motor Conectado';
    }
    if (versionBadge) {
      versionBadge.textContent = `v${data.version || '0.1.0'}`;
    }
    if (providerBadge) {
      providerBadge.textContent = `IA: ${(data.activeProvider || 'mock').toUpperCase()}`;
    }
  } catch (err) {
    if (serverStatusBadge) {
      serverStatusBadge.className = 'status-badge';
      serverStatusBadge.innerHTML = '<span style="color:#ef4444;">●</span> Desconectado';
    }
  }
}

/**
 * Carga el catálogo de presets en tarjetas interactivas
 */
async function loadPresetsCatalog() {
  try {
    const res = await fetch('/api/presets');
    if (!res.ok) return;
    const data = await res.json();
    const presets = data.presets || [];

    if (presetsContainer && presets.length > 0) {
      presetsContainer.innerHTML = '';

      presets.forEach((p) => {
        const card = document.createElement('div');
        card.className = 'preset-card';

        let icon = '📐';
        if (p.id === 'hoodie') icon = '🧥';
        else if (p.id === 'tshirt') icon = '👕';
        else if (p.id === 'dress') icon = '👗';
        else if (p.id === 'vest') icon = '🦺';
        else if (p.id === 'pirate_vest') icon = '🏴‍☠️';
        else if (p.id === 'pirate_shorts') icon = '🩳';

        card.innerHTML = `
          <div class="preset-card-title">${icon} ${p.name}</div>
          <div class="preset-card-desc">${p.description || p.concept_name}</div>
        `;

        card.addEventListener('click', () => {
          document.querySelectorAll('.preset-card').forEach((c) => c.classList.remove('active'));
          card.classList.add('active');

          if (promptInput) {
            promptInput.value = p.description || p.name;
          }

          if (p.target_layers && p.target_layers.length > 0) {
            state.selectedSizes = [...p.target_layers];
            initSizePills();
          }

          // Ajustar sliders según ADN del preset si aplica
          if (p.dna?.sizing?.chest_circ_mm && chestSlider) {
            chestSlider.value = String(p.dna.sizing.chest_circ_mm);
          }
          if (p.dna?.sizing?.waist_circ_mm && waistSlider) {
            waistSlider.value = String(p.dna.sizing.waist_circ_mm);
          }
          if (p.dna?.sizing?.hip_circ_mm && hipSlider) {
            hipSlider.value = String(p.dna.sizing.hip_circ_mm);
          }
          initBiometrics();
        });

        presetsContainer.appendChild(card);
      });
    }
  } catch (err) {
    console.error('Error al cargar catálogo de presets:', err);
  }
}

/**
 * Inicializa el visor interactivo SVG
 */
function initViewer() {
  const viewerContainer = document.getElementById('viewerStage');
  if (viewerContainer) {
    viewerInstance = new PatternViewer(viewerContainer, {
      theme: state.theme,
      onPieceSelect: (pieceName) => {
        console.log('Pieza seleccionada en visor:', pieceName);
      },
    });

    // Controles de barra de herramientas
    if (btnZoomIn) btnZoomIn.addEventListener('click', () => viewerInstance.zoomIn());
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => viewerInstance.zoomOut());
    if (btnFitView) btnFitView.addEventListener('click', () => viewerInstance.fitView());
    if (btnResetView) btnResetView.addEventListener('click', () => viewerInstance.resetView());

    if (gridModeSelect) {
      gridModeSelect.addEventListener('change', (e) => {
        state.activeGrid = e.target.value;
        viewerInstance.setGrid(state.activeGrid);
      });
    }

    if (btnCheckCalibration) {
      btnCheckCalibration.addEventListener('click', () => {
        const found = viewerInstance.highlightCalibrationBox(true);
        if (!found) {
          alert('El patrón actual no contiene un recuadro de calibración específico.');
        }
      });
    }
  }
}

/**
 * Alterna entre las pestañas centrales (Visor 2D, Techpack, Etsy)
 */
function initTabs() {
  const switchTab = (tabKey) => {
    state.activeTab = tabKey;
    [tabBtnVector, tabBtnTechpack, tabBtnEtsy].forEach((btn) => btn?.classList.remove('active'));
    [viewVector2d, viewTechpack, viewEtsy].forEach((view) => view?.classList.remove('active'));

    if (tabKey === 'vector2d') {
      tabBtnVector?.classList.add('active');
      viewVector2d?.classList.add('active');
      if (viewerInstance) {
        setTimeout(() => {
          viewerInstance.updateRulers();
        }, 50);
      }
    } else if (tabKey === 'techpack') {
      tabBtnTechpack?.classList.add('active');
      viewTechpack?.classList.add('active');
    } else if (tabKey === 'etsy') {
      tabBtnEtsy?.classList.add('active');
      viewEtsy?.classList.add('active');
    }
  };

  tabBtnVector?.addEventListener('click', () => switchTab('vector2d'));
  tabBtnTechpack?.addEventListener('click', () => switchTab('techpack'));
  tabBtnEtsy?.addEventListener('click', () => switchTab('etsy'));
}

/**
 * Carga un patrón completo en la interfaz y en el visor
 */
async function loadPatternIntoStudio(conceptSlug) {
  if (!conceptSlug) return;
  state.activeConceptSlug = conceptSlug;

  try {
    // 1. Cargar archivo SVG continuo en el visor
    const svgRes = await fetch(`/api/patterns/${conceptSlug}/svg`);
    if (svgRes.ok) {
      const svgText = await svgRes.text();
      if (viewerInstance) {
        viewerInstance.loadSvg(svgText);
      }
    }

    // 2. Cargar Ficha Técnica JSON
    const techRes = await fetch(`/api/patterns/${conceptSlug}/techpack`);
    if (techRes.ok) {
      const techpack = await techRes.json();
      state.activePatternData = techpack;
      renderTechpackView(techpack);
      renderEtsyMetadataView(techpack);
      updateRightPanelStats(techpack);
    }

    // 3. Actualizar enlaces de descarga directa
    updateDownloadButtons(conceptSlug);
  } catch (err) {
    console.error('Error cargando patrón en el studio:', err);
  }
}

/**
 * Renderiza la vista de Ficha Técnica Industrial (Techpack)
 */
function renderTechpackView(techpack) {
  if (!viewTechpack) return;

  const piecesHtml = (techpack.cuttingPieces || [])
    .map(
      (p) => `
      <tr>
        <td><strong>${p.name.toUpperCase()}</strong></td>
        <td>${p.label || p.name}</td>
        <td>x${p.cutCount} ${p.onFold ? '(Al Lomo / Fold)' : ''}</td>
        <td>${p.seamAllowance_mm} mm</td>
        <td>${p.dimensions_mm?.width || '-'} × ${p.dimensions_mm?.height || '-'} mm</td>
      </tr>
    `
    )
    .join('');

  const measurementsHtml = (techpack.finishedMeasurements || [])
    .map(
      (m) => `
      <tr>
        <td><strong>${m.code || m.name}</strong></td>
        <td>${m.name}</td>
        <td>${m.baseValue_mm} mm (${(m.baseValue_mm / 10).toFixed(1)} cm)</td>
        <td>${m.description || '-'}</td>
      </tr>
    `
    )
    .join('');

  const sequenceHtml = (techpack.assemblySequence || [])
    .map(
      (s) => `
      <li style="margin-bottom: 8px;">
        <strong>Paso ${s.step || ''}:</strong> ${s.operation || s.title || ''} 
        <span style="color: var(--text-dim); font-size: 0.8rem;">(${s.stitchType || s.notes || ''})</span>
      </li>
    `
    )
    .join('');

  viewTechpack.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.25rem; font-weight: 700;">${techpack.conceptName || 'Ficha Técnica Industrial'}</h2>
        <div style="color: var(--text-muted); font-size: 0.85rem;">Talla Base: <strong>${techpack.baseSize || 'M'}</strong> | Bloque: <strong>${techpack.baseBlock || 'Sloper'}</strong></div>
      </div>
      <a class="btn-tool" href="/api/patterns/${state.activeConceptSlug}/download/techpack-pdf" download>📥 Descargar Tech Pack PDF</a>
    </div>

    <h3 style="font-size: 1rem; margin-top: 18px; margin-bottom: 8px;">✂️ Piezas de Corte y Moldería</h3>
    <table class="tech-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre de Pieza</th>
          <th>Cantidad de Corte</th>
          <th>Margen de Costura</th>
          <th>Dimensiones (An × Al)</th>
        </tr>
      </thead>
      <tbody>${piecesHtml || '<tr><td colspan="5">No se encontraron piezas</td></tr>'}</tbody>
    </table>

    <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">📏 Medidas de Prenda Terminada</h3>
    <table class="tech-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Punto de Medición</th>
          <th>Medida Base</th>
          <th>Tolerancia / Detalle</th>
        </tr>
      </thead>
      <tbody>${measurementsHtml || '<tr><td colspan="4">Sin medidas registradas</td></tr>'}</tbody>
    </table>

    <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">🧵 Secuencia de Armado y Confección</h3>
    <ol style="padding-left: 20px; font-size: 0.85rem; color: var(--text-main);">
      ${sequenceHtml || '<li>Secuencia estándar de confección industrial.</li>'}
    </ol>
  `;
}

/**
 * Renderiza la vista de Metadatos Etsy & Comercial
 */
function renderEtsyMetadataView(techpack) {
  if (!viewEtsy) return;

  const conceptName = techpack.conceptName || 'Patrón Textil Paramétrico';
  const title = `Sewing Pattern PDF | ${conceptName.replace(/_/g, ' ')} | Sizes XS-3XL | Instant Download`;
  const sku = `PAC-${conceptName.toUpperCase().slice(0, 8)}-M`;

  const tags = [
    'sewing pattern',
    'pdf pattern',
    'digital pattern',
    'anime cosplay',
    'diy streetwear',
    'pattern cutting',
    'menswear pattern',
    'oversize sloper',
    'printable pdf',
    'a4 pattern',
    'us letter pattern',
    'freesewing',
    'tech pack',
  ];

  const tagsHtml = tags
    .map(
      (t) => `
      <span class="etsy-tag-pill">
        ${t}
        <button style="background:none;border:none;color:#38bdf8;cursor:pointer;" onclick="navigator.clipboard.writeText('${t}')" title="Copiar tag">📋</button>
      </span>
    `
    )
    .join('');

  viewEtsy.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.25rem; font-weight: 700;">🛍️ Kit Comercial & Metadatos Etsy</h2>
        <div style="color: var(--text-muted); font-size: 0.85rem;">Optimizado para listings de alta conversión en Etsy y Shopify</div>
      </div>
      <a class="btn-download-action zip-btn" style="width: auto;" href="/api/patterns/${state.activeConceptSlug}/bundle" download>📦 Descargar ZIP Etsy Completo</a>
    </div>

    <div class="etsy-meta-box">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">Título de Listing SEO Sugerido (Máx 140 caracteres):</label>
      <div style="display: flex; gap: 8px;">
        <input type="text" value="${title}" readonly style="flex:1; background:#0d1321; border:1px solid #334155; padding:8px 12px; border-radius:6px; color:#fff;" id="etsyTitleInput" />
        <button class="btn-tool" onclick="navigator.clipboard.writeText(document.getElementById('etsyTitleInput').value); alert('¡Título copiado!');">Copiar</button>
      </div>
    </div>

    <div class="etsy-meta-box">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">13 Tags de Alto Tráfico para Etsy (1-Click Copy):</label>
      <div class="etsy-tags-cloud">${tagsHtml}</div>
    </div>

    <div class="etsy-meta-box">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">SKU Comercial de Inventario:</label>
      <div style="font-family: monospace; font-size: 1rem; color: #34d399; font-weight: 700;">${sku}</div>
    </div>
  `;
}

/**
 * Actualiza el panel derecho con métricas de tela y piezas
 */
function updateRightPanelStats(techpack) {
  const avgFabric = techpack.fabricConsumption?.averageLinearMeters || 1.4;
  const partsCount = (techpack.cuttingPieces || []).length || 4;

  if (fabricConsumptionVal) fabricConsumptionVal.textContent = `${avgFabric.toFixed(2)} m`;
  if (totalPartsCountVal) totalPartsCountVal.textContent = String(partsCount);
  if (fabricWidthVal) fabricWidthVal.textContent = '1500 mm';
  if (wasteFactorVal) wasteFactorVal.textContent = '15%';
}

/**
 * Actualiza los enlaces de descarga directa
 */
function updateDownloadButtons(slug) {
  if (!slug) return;

  if (downloadA4Btn) downloadA4Btn.href = `/api/patterns/${slug}/download/a4`;
  if (downloadLetterBtn) downloadLetterBtn.href = `/api/patterns/${slug}/download/letter`;
  if (downloadA0Btn) downloadA0Btn.href = `/api/patterns/${slug}/download/a0`;
  if (downloadSvgBtn) downloadSvgBtn.href = `/api/patterns/${slug}/download/svg`;
  if (downloadTechpackPdfBtn) downloadTechpackPdfBtn.href = `/api/patterns/${slug}/download/techpack-pdf`;
  if (downloadBundleZipBtn) downloadBundleZipBtn.href = `/api/patterns/${slug}/bundle`;
}

/**
 * Carga la lista de patrones disponibles en el servidor
 */
async function loadLibraryPatterns() {
  if (!libraryListContainer) return;

  try {
    libraryListContainer.innerHTML = '<div style="color:var(--text-dim);padding:10px;text-align:center;">Cargando biblioteca...</div>';
    const res = await fetch('/api/patterns');
    if (!res.ok) throw new Error('Error al consultar biblioteca');
    const data = await res.json();
    const patterns = data.patterns || [];

    if (patterns.length === 0) {
      libraryListContainer.innerHTML = '<div style="color:var(--text-dim);padding:10px;text-align:center;font-size:0.8rem;">No hay patrones guardados todavía. ¡Genera el primero!</div>';
      return;
    }

    libraryListContainer.innerHTML = '';
    patterns.forEach((p, idx) => {
      const item = document.createElement('div');
      item.className = 'library-item';
      const slug = p.concept_slug || p.concept_name;

      item.innerHTML = `
        <div class="library-item-header">
          <span class="library-item-name">${p.concept_name.replace(/_/g, ' ')}</span>
          <span class="size-pill" style="padding:2px 6px;font-size:0.7rem;">${p.base_block || 'sloper'}</span>
        </div>
        <div class="library-item-meta">${p.description || 'Patrón paramétrico'}</div>
      `;

      item.addEventListener('click', () => {
        loadPatternIntoStudio(slug);
      });

      libraryListContainer.appendChild(item);

      // Cargar el primer patrón automáticamente al inicio
      if (idx === 0 && !state.activeConceptSlug) {
        loadPatternIntoStudio(slug);
      }
    });
  } catch (err) {
    libraryListContainer.innerHTML = `<div style="color:var(--danger);padding:8px;font-size:0.8rem;">${err.message}</div>`;
  }
}

/**
 * Maneja el envío del formulario de generación
 */
function initGenerateForm() {
  if (!generateForm) return;

  generateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prompt = promptInput?.value?.trim();
    if (!prompt) return;

    const provider = providerSelect?.value || 'mock';
    const sizes = state.selectedSizes;
    const customMeasurements = state.customMeasurements;

    if (generateBtn) generateBtn.disabled = true;
    if (generateBtnText) generateBtnText.textContent = 'Orquestando Geometría IA...';
    if (generateBtnSpinner) generateBtnSpinner.style.display = 'block';

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          provider,
          sizes,
          customMeasurements,
          bundle: true,
          wasteFactor: 0.15,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falló la generación del patrón');
      }

      await loadLibraryPatterns();
      if (data.conceptSlug) {
        await loadPatternIntoStudio(data.conceptSlug);
      }
    } catch (err) {
      alert('Error en la generación: ' + err.message);
    } finally {
      if (generateBtn) generateBtn.disabled = false;
      if (generateBtnText) generateBtnText.textContent = '⚡ Generar Patrón Paramétrico';
      if (generateBtnSpinner) generateBtnSpinner.style.display = 'none';
    }
  });

  if (refreshLibraryBtn) {
    refreshLibraryBtn.addEventListener('click', loadLibraryPatterns);
  }
}

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initBiometrics();
  initSizePills();
  initViewer();
  initTabs();
  initGenerateForm();

  fetchServerStatus();
  loadPresetsCatalog();
  loadLibraryPatterns();
});
