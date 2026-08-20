/**
 * src/server/public/viewer3d.js
 * Visor 3D WebGL Interactivo Autónomo para Mallas Textiles Paramétricas (.glb / glTF 2.0)
 * pattern-ai-core - Tarea T-24
 */

// Presets de materiales PBR textiles para previsualización interactiva en tiempo real
export const FABRIC_PRESETS = {
  linen: { name: 'Lino Natural', color: '#D2C7B2', roughness: 0.85, metallic: 0.0 },
  denim: { name: 'Mezclilla / Denim', color: '#26477A', roughness: 0.75, metallic: 0.0 },
  cotton: { name: 'Algodón / Jersey', color: '#E6E6E1', roughness: 0.70, metallic: 0.0 },
  silk: { name: 'Seda Satén', color: '#E0D1E6', roughness: 0.25, metallic: 0.08 },
  leather: { name: 'Cuero / Gamuza', color: '#3D2314', roughness: 0.40, metallic: 0.05 },
  wool: { name: 'Lana / Paño', color: '#525259', roughness: 0.92, metallic: 0.0 },
};

/**
 * Clase Principal del Visor 3D WebGL
 */
export class GarmentViewer3D {
  constructor(container, options = {}) {
    if (!container) throw new Error('[GarmentViewer3D] Se requiere un elemento contenedor DOM válido.');
    this.container = container;
    this.theme = options.theme || 'dark';
    this.autoRotate = options.autoRotate ?? true;
    this.showWireframe = false;
    this.showGrid = true;
    this.currentModelUrl = null;
    this.currentGlbData = null;

    // Estado del motor Three.js / WebGL
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentMeshGroup = null;
    this.groundGrid = null;
    this.lightsGroup = null;
    this.materialsList = [];

    // Metadatos del modelo cargado
    this.stats = {
      vertexCount: 0,
      triangleCount: 0,
      meshCount: 0,
      materialName: 'PBR Fabric',
    };

    // Inicializar DOM e interfaz
    this.initDom();
    this.initThreeJs().catch((err) => {
      console.warn('[GarmentViewer3D] Error cargando módulos Three.js:', err);
      this.initFallbackWebGL();
    });
  }

  /**
   * Crea el esqueleto DOM del visor con HUD y toolbar
   */
  initDom() {
    this.container.innerHTML = '';
    this.container.classList.add('pac-viewer3d-container');
    if (this.theme === 'light') {
      this.container.classList.add('theme-light');
    }

    // Viewport contenedor del canvas
    this.viewportEl = document.createElement('div');
    this.viewportEl.className = 'viewer3d-viewport';
    this.container.appendChild(this.viewportEl);

    // Toolbar flotante superior
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'viewer3d-floating-toolbar';
    this.toolbarEl.innerHTML = `
      <button type="button" class="viewer3d-btn active" id="v3dBtnRotate" title="Rotación Automática 360°">
        <span>🔄</span> <span class="btn-text">Girar</span>
      </button>
      <button type="button" class="viewer3d-btn" id="v3dBtnWireframe" title="Alternar Malla Wireframe">
        <span>🕸️</span> <span class="btn-text">Wireframe</span>
      </button>
      <button type="button" class="viewer3d-btn" id="v3dBtnReset" title="Restablecer Vista y Cámara">
        <span>🎯</span> <span class="btn-text">Reset</span>
      </button>
      <div class="viewer3d-separator"></div>
      <select class="viewer3d-select" id="v3dFabricSelect" title="Previsualizar Textura Textil PBR">
        <option value="default">🧵 Tela Original</option>
        <option value="linen">🌾 Lino Natural</option>
        <option value="denim">👖 Denim / Jeans</option>
        <option value="cotton">👕 Algodón</option>
        <option value="silk">✨ Seda / Satén</option>
        <option value="leather">🧥 Cuero</option>
        <option value="wool">🧶 Lana</option>
      </select>
      <div class="viewer3d-color-picker-btn" id="v3dColorBtn" title="Cambiar Color de la Prenda" style="background-color: #D2C7B2;">
        <input type="color" class="viewer3d-color-input" id="v3dColorInput" value="#D2C7B2" />
      </div>
    `;
    this.container.appendChild(this.toolbarEl);

    // HUD inferior con estadísticas
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'viewer3d-hud';
    this.hudEl.innerHTML = `
      <div class="viewer3d-hud-row">
        <span class="viewer3d-hud-label">Vértices:</span>
        <span class="viewer3d-hud-val" id="v3dVertexCount">-</span>
      </div>
      <div class="viewer3d-hud-row">
        <span class="viewer3d-hud-label">Triángulos:</span>
        <span class="viewer3d-hud-val" id="v3dTriangleCount">-</span>
      </div>
      <div class="viewer3d-hud-row">
        <span class="viewer3d-hud-label">Material:</span>
        <span class="viewer3d-hud-val" id="v3dMaterial">-</span>
      </div>
    `;
    this.container.appendChild(this.hudEl);

    // Badge de ayuda con controles
    this.helpBadgeEl = document.createElement('div');
    this.helpBadgeEl.className = 'viewer3d-help-badge';
    this.helpBadgeEl.innerHTML = '🖱️ Arrastrar: Rotar | Rueda: Zoom | Clic Der / Shift: Paneo';
    this.container.appendChild(this.helpBadgeEl);

    // Spinner overlay
    this.loaderEl = document.createElement('div');
    this.loaderEl.className = 'viewer3d-loader';
    this.loaderEl.innerHTML = `
      <div class="viewer3d-spinner"></div>
      <div class="viewer3d-loader-text">Cargando Modelo 3D WebGL...</div>
    `;
    this.container.appendChild(this.loaderEl);

    // Bindings de la barra de herramientas
    this.btnRotate = this.toolbarEl.querySelector('#v3dBtnRotate');
    this.btnWireframe = this.toolbarEl.querySelector('#v3dBtnWireframe');
    this.btnReset = this.toolbarEl.querySelector('#v3dBtnReset');
    this.selectFabric = this.toolbarEl.querySelector('#v3dFabricSelect');
    this.btnColor = this.toolbarEl.querySelector('#v3dColorBtn');
    this.inputColor = this.toolbarEl.querySelector('#v3dColorInput');

    this.valVertices = this.hudEl.querySelector('#v3dVertexCount');
    this.valTriangles = this.hudEl.querySelector('#v3dTriangleCount');
    this.valMaterial = this.hudEl.querySelector('#v3dMaterial');

    this.btnRotate?.addEventListener('click', () => {
      this.toggleAutoRotate();
    });

    this.btnWireframe?.addEventListener('click', () => {
      this.toggleWireframe();
    });

    this.btnReset?.addEventListener('click', () => {
      this.resetView();
    });

    this.selectFabric?.addEventListener('change', (e) => {
      this.applyFabricPreset(e.target.value);
    });

    this.inputColor?.addEventListener('input', (e) => {
      this.applyCustomColor(e.target.value);
      if (this.btnColor) this.btnColor.style.backgroundColor = e.target.value;
    });
  }

  /**
   * Carga dinámica de Three.js, GLTFLoader y OrbitControls
   */
  async initThreeJs() {
    let THREE = window.THREE;
    let GLTFLoader = window.GLTFLoader;
    let OrbitControls = window.OrbitControls;

    if (!THREE) {
      try {
        const threeModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
        THREE = threeModule;
        window.THREE = THREE;

        const gltfModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
        GLTFLoader = gltfModule.GLTFLoader;

        const controlsModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js');
        OrbitControls = controlsModule.OrbitControls;
      } catch (err) {
        console.warn('[GarmentViewer3D] CDN Three.js no disponible o modo offline. Usando renderizado nativo canvas/webgl.');
        this.initFallbackWebGL();
        return;
      }
    }

    this.THREE = THREE;
    this.GLTFLoader = GLTFLoader;
    this.OrbitControls = OrbitControls;

    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupRenderer();
    this.setupControls();
    this.setupStudioEnvironment();
    this.startAnimationLoop();

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.viewportEl);

    this.hideLoader();
  }

  /**
   * Configura la escena Three.js
   */
  setupScene() {
    this.scene = new this.THREE.Scene();
    const bgColor = this.theme === 'light' ? 0xf1f5f9 : 0x0a0f1d;
    this.scene.background = new this.THREE.Color(bgColor);
    this.scene.fog = new this.THREE.FogExp2(bgColor, 0.15);
  }

  /**
   * Configura la cámara perspectiva
   */
  setupCamera() {
    const aspect = (this.viewportEl.clientWidth || 600) / (this.viewportEl.clientHeight || 500);
    this.camera = new this.THREE.PerspectiveCamera(45, aspect, 0.05, 50);
    this.camera.position.set(0, 1.2, 2.2);
  }

  /**
   * Configura el set de iluminación de estudio fotográfico
   */
  setupLights() {
    this.lightsGroup = new this.THREE.Group();

    // 1. Luz Ambiental Suave
    const ambIntensity = this.theme === 'light' ? 0.9 : 0.6;
    const ambLight = new this.THREE.AmbientLight(0xffffff, ambIntensity);
    this.lightsGroup.add(ambLight);

    // 2. Luz de Relleno Hemisférica (Cielo / Suelo)
    const hemiLight = new this.THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 0.5);
    hemiLight.position.set(0, 10, 0);
    this.lightsGroup.add(hemiLight);

    // 3. Luz Principal (Key Light)
    const keyLight = new this.THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(1.5, 3.0, 2.5);
    keyLight.castShadow = true;
    this.lightsGroup.add(keyLight);

    // 4. Luz de Relleno Suave (Fill Light)
    const fillLight = new this.THREE.DirectionalLight(0x93c5fd, 0.7);
    fillLight.position.set(-2.0, 1.5, 1.5);
    this.lightsGroup.add(fillLight);

    // 5. Luz de Contorno Dorsal (Rim Light para silueta)
    const rimLight = new this.THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(0, 2.5, -2.5);
    this.lightsGroup.add(rimLight);

    this.scene.add(this.lightsGroup);
  }

  /**
   * Configura el renderizador WebGL
   */
  setupRenderer() {
    this.renderer = new this.THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.viewportEl.clientWidth || 600, this.viewportEl.clientHeight || 500);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;

    if (this.THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = this.THREE.SRGBColorSpace;
    }
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.renderer.domElement.className = 'viewer3d-canvas';
    this.viewportEl.appendChild(this.renderer.domElement);
  }

  /**
   * Configura los controles orbitales de cámara
   */
  setupControls() {
    if (this.OrbitControls && this.camera && this.renderer) {
      this.controls = new this.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = true;
      this.controls.minDistance = 0.4;
      this.controls.maxDistance = 6.0;
      this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // No sumergir bajo el suelo
      this.controls.target.set(0, 1.05, 0); // Altura media del torso
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = 1.5;
    }
  }

  /**
   * Agrega pedestal de estudio y sombra de suelo suave
   */
  setupStudioEnvironment() {
    const gridColor = this.theme === 'light' ? 0xcbd5e1 : 0x1e293b;
    const centerColor = this.theme === 'light' ? 0x94a3b8 : 0x38bdf8;

    // Cuadrícula de suelo circular
    this.groundGrid = new this.THREE.GridHelper(3.0, 30, centerColor, gridColor);
    this.groundGrid.position.y = 0;
    this.groundGrid.material.opacity = 0.4;
    this.groundGrid.material.transparent = true;
    this.scene.add(this.groundGrid);

    // Disco sombra
    const shadowGeo = new this.THREE.CircleGeometry(0.65, 32);
    const shadowMat = new this.THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: this.theme === 'light' ? 0.15 : 0.35,
    });
    const shadowMesh = new this.THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.001;
    this.scene.add(shadowMesh);
  }

  /**
   * Bucle de animación continuo
   */
  startAnimationLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }

  /**
   * Carga un modelo 3D (.glb) desde una URL o un ArrayBuffer
   */
  async loadModel(urlOrBuffer) {
    this.showLoader();

    if (!urlOrBuffer) {
      this.showError('No se especificó la ruta del modelo 3D.');
      return;
    }

    this.currentModelUrl = typeof urlOrBuffer === 'string' ? urlOrBuffer : null;

    try {
      let gltfData = null;

      if (typeof urlOrBuffer === 'string') {
        const res = await fetch(urlOrBuffer);
        if (!res.ok) {
          throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
        }
        const arrayBuf = await res.arrayBuffer();
        this.currentGlbData = arrayBuf;
        gltfData = await this.parseGlbBuffer(arrayBuf);
      } else if (urlOrBuffer instanceof ArrayBuffer) {
        this.currentGlbData = urlOrBuffer;
        gltfData = await this.parseGlbBuffer(urlOrBuffer);
      }

      if (this.GLTFLoader && this.currentGlbData) {
        const loader = new this.GLTFLoader();
        loader.parse(
          this.currentGlbData,
          '',
          (gltf) => {
            this.displayGltfScene(gltf.scene);
            this.hideLoader();
          },
          (err) => {
            console.error('[GarmentViewer3D] Error parseando con GLTFLoader:', err);
            this.displayDirectMesh(gltfData);
            this.hideLoader();
          }
        );
      } else if (gltfData) {
        this.displayDirectMesh(gltfData);
        this.hideLoader();
      }
    } catch (err) {
      console.error('[GarmentViewer3D] Falló la carga del modelo 3D:', err);
      this.showError(`No se pudo cargar el modelo 3D (.glb): ${err.message}`);
    }
  }

  /**
   * Parser autónomo glTF 2.0 binario para extraer posiciones, normales, UVs e índices
   */
  async parseGlbBuffer(buffer) {
    const view = new DataView(buffer);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) {
      throw new Error('El archivo no es un buffer binario glTF 2.0 válido (magic header incorrecto).');
    }

    const version = view.getUint32(4, true);
    const jsonLength = view.getUint32(12, true);
    const jsonBytes = new Uint8Array(buffer, 20, jsonLength);
    const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
    const gltfDoc = JSON.parse(jsonStr);

    const binChunkOffset = 20 + jsonLength;
    const binLength = view.getUint32(binChunkOffset, true);
    const binBuffer = buffer.slice(binChunkOffset + 8, binChunkOffset + 8 + binLength);

    return { gltfDoc, binBuffer };
  }

  /**
   * Despliega la escena cargada por GLTFLoader
   */
  displayGltfScene(gltfScene) {
    if (this.currentMeshGroup) {
      this.scene.remove(this.currentMeshGroup);
    }

    this.currentMeshGroup = gltfScene;
    this.materialsList = [];
    let totalVerts = 0;
    let totalTris = 0;
    let meshCount = 0;
    let primaryMatName = 'PBR Fabric';

    this.currentMeshGroup.traverse((node) => {
      if (node.isMesh) {
        meshCount++;
        node.castShadow = true;
        node.receiveShadow = true;

        if (node.geometry) {
          const pos = node.geometry.attributes.position;
          if (pos) totalVerts += pos.count;
          if (node.geometry.index) {
            totalTris += node.geometry.index.count / 3;
          } else if (pos) {
            totalTris += pos.count / 3;
          }
        }

        if (node.material) {
          if (Array.isArray(node.material)) {
            this.materialsList.push(...node.material);
            primaryMatName = node.material[0]?.name || primaryMatName;
          } else {
            this.materialsList.push(node.material);
            primaryMatName = node.material.name || primaryMatName;
          }
        }
      }
    });

    this.scene.add(this.currentMeshGroup);
    this.fitToScreen();

    // Actualizar estadísticas HUD
    this.stats = {
      vertexCount: totalVerts,
      triangleCount: Math.round(totalTris),
      meshCount,
      materialName: primaryMatName,
    };
    this.updateHud();
  }

  /**
   * Construye mallas directamente en Three.js a partir de la estructura parseada
   */
  displayDirectMesh({ gltfDoc, binBuffer }) {
    if (!this.THREE || !this.scene) return;

    if (this.currentMeshGroup) {
      this.scene.remove(this.currentMeshGroup);
    }

    this.currentMeshGroup = new this.THREE.Group();
    this.materialsList = [];

    // 1. Extraer material PBR
    const matDef = gltfDoc.materials?.[0]?.pbrMetallicRoughness || {};
    const baseColor = matDef.baseColorFactor || [0.82, 0.78, 0.70, 1.0];
    const roughness = matDef.roughnessFactor ?? 0.75;
    const metallic = matDef.metallicFactor ?? 0.0;

    const material = new this.THREE.MeshStandardMaterial({
      color: new this.THREE.Color(baseColor[0], baseColor[1], baseColor[2]),
      roughness,
      metallic,
      side: this.THREE.DoubleSide,
      wireframe: this.showWireframe,
    });
    this.materialsList.push(material);

    // 2. Extraer buffers y atributos de la primera malla
    const meshDef = gltfDoc.meshes?.[0];
    const prim = meshDef?.primitives?.[0];

    if (prim && gltfDoc.accessors && gltfDoc.bufferViews) {
      const posAcc = gltfDoc.accessors[prim.attributes.POSITION];
      const normAcc = prim.attributes.NORMAL !== undefined ? gltfDoc.accessors[prim.attributes.NORMAL] : null;
      const uvAcc = prim.attributes.TEXCOORD_0 !== undefined ? gltfDoc.accessors[prim.attributes.TEXCOORD_0] : null;
      const idxAcc = prim.indices !== undefined ? gltfDoc.accessors[prim.indices] : null;

      const geometry = new this.THREE.BufferGeometry();

      if (posAcc) {
        const viewDef = gltfDoc.bufferViews[posAcc.bufferView];
        const offset = (viewDef.byteOffset || 0) + (posAcc.byteOffset || 0);
        const floatArray = new Float32Array(binBuffer, offset, posAcc.count * 3);
        geometry.setAttribute('position', new this.THREE.BufferAttribute(floatArray, 3));
      }

      if (normAcc) {
        const viewDef = gltfDoc.bufferViews[normAcc.bufferView];
        const offset = (viewDef.byteOffset || 0) + (normAcc.byteOffset || 0);
        const floatArray = new Float32Array(binBuffer, offset, normAcc.count * 3);
        geometry.setAttribute('normal', new this.THREE.BufferAttribute(floatArray, 3));
      } else {
        geometry.computeVertexNormals();
      }

      if (uvAcc) {
        const viewDef = gltfDoc.bufferViews[uvAcc.bufferView];
        const offset = (viewDef.byteOffset || 0) + (uvAcc.byteOffset || 0);
        const floatArray = new Float32Array(binBuffer, offset, uvAcc.count * 2);
        geometry.setAttribute('uv', new this.THREE.BufferAttribute(floatArray, 2));
      }

      if (idxAcc) {
        const viewDef = gltfDoc.bufferViews[idxAcc.bufferView];
        const offset = (viewDef.byteOffset || 0) + (idxAcc.byteOffset || 0);
        if (idxAcc.componentType === 5125) {
          // UINT32
          const intArray = new Uint32Array(binBuffer, offset, idxAcc.count);
          geometry.setIndex(new this.THREE.BufferAttribute(intArray, 1));
        } else {
          // UINT16
          const intArray = new Uint16Array(binBuffer, offset, idxAcc.count);
          geometry.setIndex(new this.THREE.BufferAttribute(intArray, 1));
        }
      }

      const mesh = new this.THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.currentMeshGroup.add(mesh);
    }

    this.scene.add(this.currentMeshGroup);
    this.fitToScreen();

    // Actualizar HUD
    const posAttr = this.currentMeshGroup.children[0]?.geometry?.attributes?.position;
    const idxAttr = this.currentMeshGroup.children[0]?.geometry?.index;
    this.stats = {
      vertexCount: posAttr ? posAttr.count : 0,
      triangleCount: idxAttr ? Math.round(idxAttr.count / 3) : posAttr ? Math.round(posAttr.count / 3) : 0,
      meshCount: 1,
      materialName: gltfDoc.materials?.[0]?.name || 'PBR Fabric',
    };
    this.updateHud();
  }

  /**
   * Centra y enmarca el modelo en la vista de cámara
   */
  fitToScreen() {
    if (!this.currentMeshGroup || !this.camera || !this.controls) return;

    const box = new this.THREE.Box3().setFromObject(this.currentMeshGroup);
    const center = box.getCenter(new this.THREE.Vector3());
    const size = box.getSize(new this.THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraZ = Math.max(cameraZ, 1.2);

    this.camera.position.set(0, center.y, cameraZ);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  /**
   * Restablece la posición y orientación de la cámara
   */
  resetView() {
    this.fitToScreen();
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate;
    }
  }

  /**
   * Alterna la rotación automática 360°
   */
  toggleAutoRotate(enable) {
    this.autoRotate = enable !== undefined ? enable : !this.autoRotate;
    if (this.controls) {
      this.controls.autoRotate = this.autoRotate;
    }
    if (this.btnRotate) {
      this.btnRotate.classList.toggle('active', this.autoRotate);
    }
  }

  /**
   * Alterna la visualización de la malla en modo alambre (wireframe)
   */
  toggleWireframe(enable) {
    this.showWireframe = enable !== undefined ? enable : !this.showWireframe;
    for (const mat of this.materialsList) {
      if (mat) mat.wireframe = this.showWireframe;
    }
    if (this.btnWireframe) {
      this.btnWireframe.classList.toggle('active', this.showWireframe);
    }
  }

  /**
   * Aplica un preset PBR textil a los materiales del modelo
   */
  applyFabricPreset(fabricKey) {
    if (fabricKey === 'default') {
      if (this.currentModelUrl) {
        this.loadModel(this.currentModelUrl);
      }
      return;
    }

    const preset = FABRIC_PRESETS[fabricKey];
    if (!preset) return;

    for (const mat of this.materialsList) {
      if (mat) {
        mat.color = new this.THREE.Color(preset.color);
        mat.roughness = preset.roughness;
        mat.metallic = preset.metallic;
        mat.needsUpdate = true;
      }
    }

    if (this.valMaterial) this.valMaterial.textContent = preset.name;
    if (this.btnColor) this.btnColor.style.backgroundColor = preset.color;
    if (this.inputColor) this.inputColor.value = preset.color;
  }

  /**
   * Aplica un color personalizado en tiempo real
   */
  applyCustomColor(hexColor) {
    for (const mat of this.materialsList) {
      if (mat) {
        mat.color = new this.THREE.Color(hexColor);
        mat.needsUpdate = true;
      }
    }
  }

  /**
   * Actualiza el tema del visor (Dark / Light)
   */
  setTheme(theme) {
    this.theme = theme;
    this.container.classList.toggle('theme-light', theme === 'light');

    if (this.scene && this.THREE) {
      const bgColor = theme === 'light' ? 0xf1f5f9 : 0x0a0f1d;
      this.scene.background = new this.THREE.Color(bgColor);
      this.scene.fog.color = new this.THREE.Color(bgColor);
    }

    if (this.groundGrid && this.scene) {
      this.scene.remove(this.groundGrid);
      const gridColor = theme === 'light' ? 0xcbd5e1 : 0x1e293b;
      const centerColor = theme === 'light' ? 0x94a3b8 : 0x38bdf8;
      this.groundGrid = new this.THREE.GridHelper(3.0, 30, centerColor, gridColor);
      this.groundGrid.position.y = 0;
      this.groundGrid.material.opacity = 0.4;
      this.groundGrid.material.transparent = true;
      this.scene.add(this.groundGrid);
    }
  }

  /**
   * Ajusta las dimensiones del renderizador al redimensionar la ventana o panel
   */
  handleResize() {
    if (!this.viewportEl || !this.camera || !this.renderer) return;
    const width = this.viewportEl.clientWidth || 600;
    const height = this.viewportEl.clientHeight || 500;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Actualiza el HUD con la cantidad de vértices y triángulos
   */
  updateHud() {
    if (this.valVertices) {
      this.valVertices.textContent = this.stats.vertexCount.toLocaleString();
    }
    if (this.valTriangles) {
      this.valTriangles.textContent = this.stats.triangleCount.toLocaleString();
    }
    if (this.valMaterial) {
      this.valMaterial.textContent = this.stats.materialName;
    }
  }

  /**
   * Muestra el spinner de carga
   */
  showLoader() {
    if (this.loaderEl) {
      this.loaderEl.style.display = 'flex';
      this.loaderEl.style.opacity = '1';
    }
  }

  /**
   * Oculta el spinner de carga
   */
  hideLoader() {
    if (this.loaderEl) {
      this.loaderEl.style.opacity = '0';
      setTimeout(() => {
        if (this.loaderEl) this.loaderEl.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Despliega un mensaje de error visual
   */
  showError(message) {
    this.hideLoader();
    const errorEl = document.createElement('div');
    errorEl.className = 'viewer3d-error-overlay';
    errorEl.innerHTML = `
      <div class="viewer3d-error-icon">⚠️</div>
      <div class="viewer3d-error-title">No se pudo cargar la vista 3D</div>
      <div class="viewer3d-error-desc">${message}</div>
      <button class="viewer3d-btn active" style="margin-top:10px;" id="v3dRetryBtn">🔄 Reintentar Carga</button>
    `;

    const existingError = this.container.querySelector('.viewer3d-error-overlay');
    if (existingError) existingError.remove();

    this.container.appendChild(errorEl);

    errorEl.querySelector('#v3dRetryBtn')?.addEventListener('click', () => {
      errorEl.remove();
      if (this.currentModelUrl) {
        this.loadModel(this.currentModelUrl);
      }
    });
  }

  /**
   * Fallback WebGL ligero y seguro si Three.js no está disponible
   */
  initFallbackWebGL() {
    this.hideLoader();
    const canvas = document.createElement('canvas');
    canvas.className = 'viewer3d-canvas';
    this.viewportEl.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render2dFallback = () => {
      const w = (canvas.width = this.viewportEl.clientWidth || 600);
      const h = (canvas.height = this.viewportEl.clientHeight || 500);

      ctx.fillStyle = this.theme === 'light' ? '#f1f5f9' : '#0a0f1d';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Visor 3D WebGL Activo', w / 2, h / 2 - 10);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Genera o selecciona un patrón para visualizar la geometría 3D en tiempo real.', w / 2, h / 2 + 15);
    };

    render2dFallback();
    window.addEventListener('resize', render2dFallback);
  }

  /**
   * Libera recursos y memoria WebGL
   */
  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
