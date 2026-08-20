/**
 * src/server/public/app.js
 * Orquestador Frontend del Dashboard Web Studio y Controlador de UI
 * pattern-ai-core
 */

import { PatternViewer } from './viewer.js';
import { GarmentViewer3D } from './viewer3d.js';

// Estado global de la aplicación
const state = {
  theme: localStorage.getItem('pac_theme') || 'dark',
  activeTab: 'vector2d', // 'vector2d' | '3d' | 'techpack' | 'etsy'
  activeConceptSlug: null,
  activePatternData: null,
  activeGrid: 'off',
  activeSelectedSize: 'M',
  selectedSizes: ['S', 'M', 'L', 'XL', '2XL'],
  uploadedImageData: null,
  uploadedImageName: null,
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
let viewer3dInstance = null;

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

// Elementos de Imagen Dropzone
const imageDropzone = document.getElementById('imageDropzone');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imagePreviewImg = document.getElementById('imagePreviewImg');
const btnRemoveImage = document.getElementById('btnRemoveImage');

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
const tabBtn3D = document.getElementById('tabBtn3D');
const tabBtnTechpack = document.getElementById('tabBtnTechpack');
const tabBtnEtsy = document.getElementById('tabBtnEtsy');

const viewVector2d = document.getElementById('viewVector2d');
const view3d = document.getElementById('view3d');
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

const downloadGlbBtn = document.getElementById('downloadGlbBtn');
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
      if (viewer3dInstance) {
        viewer3dInstance.setTheme(state.theme);
      }
    });
  }
}

/**
 * Procesa y comprime opcionalmente una imagen en un canvas virtual si excede 4MB
 */
function processImageFile(file, onComplete) {
  if (!file) return;

  const validExtensions = ['png', 'jpg', 'jpeg', 'webp'];
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  const isValidMime =
    file.type?.startsWith('image/') ||
    ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type);
  const isValidExt = validExtensions.includes(ext);

  if (!isValidMime && !isValidExt) {
    alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG o WEBP).');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const rawDataUrl = e.target.result;
    const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

    if (file.size > MAX_SIZE_BYTES) {
      // Redimensionado y compresión ligera en canvas virtual para proteger la memoria
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onComplete(compressedDataUrl, file.name);
        } else {
          onComplete(rawDataUrl, file.name);
        }
      };
      img.onerror = () => {
        onComplete(rawDataUrl, file.name);
      };
      img.src = rawDataUrl;
    } else {
      onComplete(rawDataUrl, file.name);
    }
  };
  reader.readAsDataURL(file);
}

/**
 * Inicializa el cargador de imágenes por Drag & Drop
 */
function initImageUploader() {
  if (!imageDropzone || !imageFileInput) return;

  const handleFile = (file) => {
    processImageFile(file, (dataUrl, fileName) => {
      state.uploadedImageData = dataUrl;
      state.uploadedImageName = fileName;

      if (imagePreviewImg && imagePreviewContainer) {
        imagePreviewImg.src = dataUrl;
        imagePreviewContainer.style.display = 'block';
        imageDropzone.style.display = 'none';
      }
    });
  };

  imageDropzone.addEventListener('click', () => {
    imageFileInput.click();
  });

  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  });

  imageDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageDropzone.classList.add('drag-over');
  });

  imageDropzone.addEventListener('dragleave', () => {
    imageDropzone.classList.remove('drag-over');
  });

  imageDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  if (btnRemoveImage) {
    btnRemoveImage.addEventListener('click', (e) => {
      e.stopPropagation();
      state.uploadedImageData = null;
      state.uploadedImageName = null;
      if (imageFileInput) imageFileInput.value = '';
      if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
      if (imageDropzone) imageDropzone.style.display = 'flex';
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
      pill.className = `btn-tool size-tool-pill ${size === state.activeSelectedSize ? 'active' : ''}`;
      pill.textContent = `Talla ${size}`;
      pill.setAttribute('data-size', size);

      pill.addEventListener('click', () => {
        state.activeSelectedSize = size;
        document.querySelectorAll('.size-tool-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');

        if (viewerInstance) {
          viewerInstance.highlightSize(size);
        }

        if (state.activePatternData) {
          updateRightPanelStats(state.activePatternData, size);
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
        else if (p.id === 'pirate_shorts') icon = '👖';
        else if (p.id === 'straw_pirate_full_set') icon = '🏴‍☠️';

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
 * Inicializa el visor interactivo 3D WebGL
 */
function initViewer3D() {
  const stage = document.getElementById('viewer3dStage');
  if (stage) {
    viewer3dInstance = new GarmentViewer3D(stage, {
      theme: state.theme,
      autoRotate: true,
    });
  }
}

/**
 * Alterna entre las pestañas centrales (Visor 2D, Visor 3D, Techpack, Etsy)
 */
function initTabs() {
  const switchTab = (tabKey) => {
    state.activeTab = tabKey;
    [tabBtnVector, tabBtn3D, tabBtnTechpack, tabBtnEtsy].forEach((btn) => btn?.classList.remove('active'));
    [viewVector2d, view3d, viewTechpack, viewEtsy].forEach((view) => {
      if (view) {
        view.classList.remove('active');
        view.style.display = 'none';
      }
    });

    if (tabKey === 'vector2d') {
      tabBtnVector?.classList.add('active');
      if (viewVector2d) {
        viewVector2d.classList.add('active');
        viewVector2d.style.display = 'block';
      }
      if (viewerInstance) {
        setTimeout(() => {
          viewerInstance.updateRulers();
        }, 50);
      }
    } else if (tabKey === '3d') {
      tabBtn3D?.classList.add('active');
      if (view3d) {
        view3d.classList.add('active');
        view3d.style.display = 'block';
      }
      if (viewer3dInstance) {
        setTimeout(() => {
          viewer3dInstance.handleResize();
        }, 50);
      }
    } else if (tabKey === 'techpack') {
      tabBtnTechpack?.classList.add('active');
      if (viewTechpack) {
        viewTechpack.classList.add('active');
        viewTechpack.style.display = 'block';
      }
      if (state.activePatternData) {
        renderTechpackView(state.activePatternData);
      }
    } else if (tabKey === 'etsy') {
      tabBtnEtsy?.classList.add('active');
      if (viewEtsy) {
        viewEtsy.classList.add('active');
        viewEtsy.style.display = 'block';
      }
      if (state.activePatternData) {
        renderEtsyMetadataView(state.activePatternData);
      }
    }
  };

  tabBtnVector?.addEventListener('click', () => switchTab('vector2d'));
  tabBtn3D?.addEventListener('click', () => switchTab('3d'));
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
    // 1. Cargar archivo SVG continuo en el visor 2D
    const svgRes = await fetch(`/api/patterns/${conceptSlug}/svg`);
    if (svgRes.ok) {
      const svgText = await svgRes.text();
      if (viewerInstance) {
        viewerInstance.loadSvg(svgText);
        viewerInstance.highlightSize(state.activeSelectedSize);
      }
    }

    // 2. Cargar modelo 3D GLB en el visor 3D
    if (viewer3dInstance) {
      viewer3dInstance.loadModel(`/api/patterns/${conceptSlug}/glb`);
    }

    // 3. Cargar Ficha Técnica JSON
    const techRes = await fetch(`/api/patterns/${conceptSlug}/techpack`);
    if (techRes.ok) {
      const techpack = await techRes.json();
      state.activePatternData = techpack;
      renderTechpackView(techpack);
      renderEtsyMetadataView(techpack);
      updateRightPanelStats(techpack, state.activeSelectedSize);
    }

    // 4. Actualizar enlaces de descarga directa
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

  const rawPieces = techpack.pieces || techpack.cuttingPieces || [];
  const rawPOM = techpack.pointsOfMeasure || techpack.finishedMeasurements || [];
  const rawSteps = techpack.steps || techpack.assemblySequence || [];
  const rawNotions = techpack.notions || [];
  const fabricBreakdown = techpack.fabricConsumption?.breakdown_by_fabric;

  const piecesHtml = rawPieces
    .map(
      (p) => `
      <tr>
        <td><strong>${(p.id || p.name || '').toUpperCase()}</strong></td>
        <td>${p.name || p.label || p.id}</td>
        <td>${p.quantityDescription || `x${p.cutCount || 1} ${p.onFold ? '(Al Lomo)' : ''}`}</td>
        <td>${p.seamAllowance_mm || techpack.seamAllowance_mm || 10} mm</td>
        <td>${p.width_mm || p.dimensions_mm?.width || '-'} × ${p.height_mm || p.dimensions_mm?.height || '-'} mm</td>
        <td>${p.suggestedFabric || '-'}</td>
      </tr>
    `
    )
    .join('');

  const pomHtml = rawPOM
    .map(
      (m) => `
      <tr>
        <td><strong style="color: var(--accent-cyan); font-family: monospace;">${m.code || m.id || '-'}</strong></td>
        <td><strong>${m.name || ''}</strong></td>
        <td>${m.description || m.location || '-'}</td>
        <td style="font-weight: 700; color: #fff;">${m.baseValue_mm || m.measurement_mm || '-'} mm (${m.baseValue_mm ? (m.baseValue_mm / 10).toFixed(1) : '-'} cm)</td>
        <td>±${m.tolerance_mm ?? 3} mm</td>
      </tr>
    `
    )
    .join('');

  const sequenceHtml = rawSteps
    .map(
      (s) => `
      <li style="margin-bottom: 10px; line-height: 1.4;">
        <strong>Paso ${s.step || ''}: ${s.operation || s.title || ''}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
          ${s.description || s.notes || ''}
          ${s.machine || s.stitchType ? `<span style="display:inline-block; margin-left:6px; padding:2px 6px; background:var(--bg-input); border-radius:4px; font-family:monospace; color:var(--accent-cyan); font-size:0.75rem;">${s.machine || s.stitchType}</span>` : ''}
        </div>
      </li>
    `
    )
    .join('');

  const notionsHtml = rawNotions
    .map(
      (n) => `
      <tr>
        <td><strong style="text-transform: capitalize;">${n.category || 'Avío'}</strong></td>
        <td>${n.name || ''}</td>
        <td>${n.specification || '-'}</td>
        <td style="font-weight: 600;">${n.quantity || '-'}</td>
        <td>${n.usageLocation || '-'}</td>
      </tr>
    `
    )
    .join('');

  let fabricBreakdownHtml = '';
  if (fabricBreakdown && Object.keys(fabricBreakdown).length > 0) {
    const cards = Object.values(fabricBreakdown)
      .map(
        (f) => `
        <div class="fabric-stat-box" style="text-align: left; padding: 12px 16px;">
          <div style="font-weight: 700; font-size: 0.9rem; color: #fff; margin-bottom: 4px;">${f.fabricName || f.fabricKey}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 6px;">Color: ${f.color || 'Coordinado'} | Ancho: ${f.width_mm} mm</div>
          <div style="font-size: 1.1rem; font-weight: 800; color: var(--accent-cyan); font-family: monospace;">${(f.averageLinearMeters || 0).toFixed(2)} m <span style="font-size:0.75rem; font-weight:400; color:var(--text-muted);">(Promedio / Prenda)</span></div>
        </div>
      `
      )
      .join('');

    fabricBreakdownHtml = `
      <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 10px;">🧶 Desglose de Consumo por Tela (Multi-Tela)</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 20px;">
        ${cards}
      </div>
    `;
  }

  let customMeasHtml = '';
  if (techpack.customMeasurements && Object.keys(techpack.customMeasurements).length > 0) {
    const rows = Object.entries(techpack.customMeasurements)
      .map(
        ([k, v]) => `
        <tr>
          <td><strong style="font-family: monospace;">${k}</strong></td>
          <td style="font-weight: 700; color: var(--accent-cyan);">${v} mm (${(Number(v) / 10).toFixed(1)} cm)</td>
        </tr>
      `
      )
      .join('');

    customMeasHtml = `
      <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">👤 Personalización Antropométrica Aplicada</h3>
      <table class="tech-table" style="max-width: 500px; margin-bottom: 20px;">
        <thead><tr><th>Cota Antropométrica</th><th>Medida a Medida</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  viewTechpack.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px;">
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 700; color: #fff;">${techpack.conceptName?.replace(/_/g, ' ').toUpperCase() || 'FICHA TÉCNICA INDUSTRIAL'}</h2>
        <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">
          Talla Base: <strong style="color:var(--accent-cyan);">${techpack.primarySize || techpack.baseSize || 'M'}</strong> | Bloque: <strong>${techpack.baseBlock || 'Sloper'}</strong> | Merma: <strong>${techpack.fabricConsumption?.wastePercentage || 15}%</strong>
        </div>
      </div>
      <a class="btn-tool" href="/api/patterns/${state.activeConceptSlug}/download/techpack-pdf" download>📥 Descargar Tech Pack PDF</a>
    </div>

    ${customMeasHtml}
    ${fabricBreakdownHtml}

    <h3 style="font-size: 1rem; margin-top: 20px; margin-bottom: 8px;">✂️ Piezas de Corte y Moldería (${rawPieces.length} piezas)</h3>
    <table class="tech-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nombre de Pieza</th>
          <th>Cantidad de Corte</th>
          <th>Margen de Costura</th>
          <th>Dimensiones (An × Al)</th>
          <th>Tela Asignada</th>
        </tr>
      </thead>
      <tbody>${piecesHtml || '<tr><td colspan="6">No se encontraron piezas</td></tr>'}</tbody>
    </table>

    <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">📏 Puntos de Control y Medidas de Calidad (POM)</h3>
    <table class="tech-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Punto de Control</th>
          <th>Descripción</th>
          <th>Medida Terminada</th>
          <th>Tolerancia</th>
        </tr>
      </thead>
      <tbody>${pomHtml || '<tr><td colspan="5">Sin medidas de control registradas</td></tr>'}</tbody>
    </table>

    ${
      rawNotions.length > 0
        ? `
      <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">📦 Lista de Avíos y Fornituras (BOM)</h3>
      <table class="tech-table">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Nombre</th>
            <th>Especificación</th>
            <th>Cantidad</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>${notionsHtml}</tbody>
      </table>
    `
        : ''
    }

    <h3 style="font-size: 1rem; margin-top: 24px; margin-bottom: 8px;">🧵 Secuencia de Armado y Confección Industrial</h3>
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

  const conceptName = techpack.conceptName || 'Patron Textil Parametrico';
  const cleanName = conceptName.replace(/_/g, ' ');
  const title = `Sewing Pattern PDF | ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} | Sizes XS-3XL | Instant Download A4 Letter A0 Plotter`;
  const sku = `PAT-AI-${conceptName.toUpperCase().slice(0, 8)}-001`;

  const tags = [
    'sewing pattern',
    'pdf pattern',
    'digital pattern',
    'anime cosplay',
    'diy clothing',
    'pattern cutting',
    'menswear pattern',
    'streetwear sloper',
    'printable pdf',
    'a4 pattern',
    'us letter pattern',
    'freesewing',
    'sewing tech pack',
  ];

  const tagsHtml = tags
    .map(
      (t) => `
      <span class="etsy-tag-pill">
        ${t}
        <button type="button" style="background:none;border:none;color:#38bdf8;cursor:pointer;margin-left:4px;" onclick="navigator.clipboard.writeText('${t}')" title="Copiar tag">📋</button>
      </span>
    `
    )
    .join('');

  viewEtsy.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px;">
      <div>
        <h2 style="font-size: 1.3rem; font-weight: 700; color: #fff;">🛍️ Kit Comercial & Metadatos Etsy SEO</h2>
        <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 2px;">Optimizado para listings de alta conversión en Etsy, Shopify y marketplaces digitales</div>
      </div>
      <a class="btn-download-action zip-btn" style="width: auto;" href="/api/patterns/${state.activeConceptSlug}/bundle" download>📦 Descargar ZIP Etsy Completo</a>
    </div>

    <div class="etsy-meta-box">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">Título de Listing SEO Optimizado (122 / 140 caracteres):</label>
      <div style="display: flex; gap: 8px; margin-top: 6px;">
        <input type="text" value="${title}" readonly style="flex:1; background:#0d1321; border:1px solid #334155; padding:8px 12px; border-radius:6px; color:#fff; font-size:0.85rem;" id="etsyTitleInput" />
        <button class="btn-tool" type="button" onclick="navigator.clipboard.writeText(document.getElementById('etsyTitleInput').value); alert('¡Título copiado al portapapeles!');">📋 Copiar</button>
      </div>
    </div>

    <div class="etsy-meta-box">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">13 Tags SEO de Alto Tráfico para Etsy:</label>
        <button class="btn-tool" type="button" style="font-size:0.75rem;" onclick="navigator.clipboard.writeText('${tags.join(', ')}'); alert('¡13 tags copiados!');">Copiar Todos (Separados por coma)</button>
      </div>
      <div class="etsy-tags-cloud" style="margin-top: 8px;">${tagsHtml}</div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <div class="etsy-meta-box">
        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">SKU Comercial de Inventario:</label>
        <div style="font-family: monospace; font-size: 1rem; color: #34d399; font-weight: 700; margin-top: 4px;">${sku}</div>
      </div>
      <div class="etsy-meta-box">
        <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">Precio Sugerido en Etsy / Gumroad:</label>
        <div style="font-family: monospace; font-size: 1.1rem; color: #38bdf8; font-weight: 700; margin-top: 4px;">$14.99 - $16.99 USD</div>
      </div>
    </div>

    <div class="etsy-meta-box">
      <label style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">Estructura Interna del Archivo .ZIP Entregable:</label>
      <ul style="font-family: monospace; font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; padding-left: 20px; line-height: 1.6;">
        <li>📁 01_Print_At_Home_A4/ (Patrón paginado A4 con cuadro 10x10 cm en Pág 1)</li>
        <li>📁 02_Print_At_Home_US_Letter/ (Patrón paginado US Letter)</li>
        <li>📁 03_Copy_Shop_Plotter_A0/ (Patrón continuo para copistería)</li>
        <li>📁 04_Vector_Layers_SVG/ (Vector editable multi-capa)</li>
        <li>📁 05_Sewing_Guide_And_TechPack/ (Ficha técnica PDF, MD y JSON)</li>
        <li>📁 06_Dna_Parameters/ (Archivo ADN paramétrico JSON)</li>
        <li>📄 README_Etsy_Printing_Instructions.pdf (Guía de calibración e impresión)</li>
      </ul>
    </div>
  `;
}

/**
 * Actualiza el panel derecho con métricas de tela y piezas
 */
function updateRightPanelStats(techpack, targetSize) {
  const sizeToUse = targetSize || state.activeSelectedSize || 'M';
  const perSizeData = techpack.fabricConsumption?.perSize?.[sizeToUse];
  const sizeFabric = perSizeData?.estimatedLinearMeters;
  const avgFabric = techpack.fabricConsumption?.averageLinearMeters || 1.4;

  const displayMeters = sizeFabric ? `${sizeFabric.toFixed(2)} m (Talla ${sizeToUse})` : `${avgFabric.toFixed(2)} m`;
  const rawPieces = techpack.pieces || techpack.cuttingPieces || [];
  const partsCount = rawPieces.length || 4;

  if (fabricConsumptionVal) fabricConsumptionVal.textContent = displayMeters;
  if (totalPartsCountVal) totalPartsCountVal.textContent = String(partsCount);
  if (fabricWidthVal) fabricWidthVal.textContent = `${techpack.fabricConsumption?.fabricWidth_mm || 1500} mm`;
  if (wasteFactorVal) wasteFactorVal.textContent = `${techpack.fabricConsumption?.wastePercentage || 15}%`;
}

/**
 * Actualiza los enlaces de descarga directa
 */
function updateDownloadButtons(slug) {
  if (!slug) return;

  if (downloadGlbBtn) downloadGlbBtn.href = `/api/patterns/${slug}/glb`;
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
    const rawPrompt = promptInput?.value?.trim() || '';
    const imagePath = state.uploadedImageData;

    if (!rawPrompt && !imagePath) {
      alert('Por favor escribe una descripción de la prenda o arrastra una imagen de referencia.');
      return;
    }

    const defaultImagePrompt =
      'Generar patrón paramétrico preciso a partir del diseño y silueta de la imagen';
    const prompt = rawPrompt || (imagePath ? defaultImagePrompt : '');

    const provider = providerSelect?.value || 'api';
    const sizes = state.selectedSizes;
    const customMeasurements = state.customMeasurements;

    if (generateBtn) generateBtn.disabled = true;
    if (generateBtnText) {
      generateBtnText.textContent = imagePath
        ? 'Analizando Imagen & Creando Moldería...'
        : 'Orquestando Geometría IA...';
    }
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
          imagePath,
          bundle: true,
          wasteFactor: 0.15,
        }),
      });

      const data = await res.json().catch(() => ({ success: false, error: 'Respuesta no válida del servidor' }));
      if (!res.ok || !data || !data.success) {
        const errorMsg = data?.error || 'Error desconocido';
        const details = data?.details ? '\n\nDetalles: ' + data.details : '';
        throw new Error(errorMsg + details);
      }

      await loadLibraryPatterns();
      if (data.conceptSlug) {
        await loadPatternIntoStudio(data.conceptSlug);
      }
    } catch (err) {
      alert('Error en la generación:\n' + err.message);
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
  initImageUploader();
  initBiometrics();
  initSizePills();
  initViewer();
  initViewer3D();
  initTabs();
  initGenerateForm();

  fetchServerStatus();
  loadPresetsCatalog();
  loadLibraryPatterns();
});
