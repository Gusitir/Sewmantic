/**
 * src/server/public/viewer3d.js
 * Visor 3D WebGL Nativo Autónomo e Interactivo para Mallas Textiles Paramétricas (.glb / glTF 2.0)
 * pattern-ai-core - Tarea T-24 & Optimización WebGL Nativa
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
 * Convierte color HEX a triplete RGB [0..1, 0..1, 0..1]
 */
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  const num = parseInt(c, 16);
  return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
}

// =========================================================================
// MATEMÁTICAS 3D Y MATRICES 4x4 NATIVAS (Sin dependencias externas)
// =========================================================================
const mat4 = {
  create() {
    const out = new Float32Array(16);
    out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
    return out;
  },

  identity(out) {
    for (let i = 0; i < 16; i++) out[i] = 0;
    out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
    return out;
  },

  perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[12] = 0;
    out[13] = 0;
    out[14] = (2 * far * near) * nf;
    out[15] = 0;
    return out;
  },

  lookAt(out, eye, center, up) {
    const eyex = eye[0], eyey = eye[1], eyez = eye[2];
    const upx = up[0], upy = up[1], upz = up[2];
    const centerx = center[0], centery = center[1], centerz = center[2];

    let z0 = eyex - centerx, z1 = eyey - centery, z2 = eyez - centerz;
    let len = 1 / Math.hypot(z0, z1, z2);
    z0 *= len; z1 *= len; z2 *= len;

    let x0 = upy * z2 - upz * z1, x1 = upz * z0 - upx * z2, x2 = upx * z1 - upy * z0;
    len = Math.hypot(x0, x1, x2);
    if (!len) {
      x0 = 0; x1 = 0; x2 = 0;
    } else {
      len = 1 / len;
      x0 *= len; x1 *= len; x2 *= len;
    }

    let y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
    len = Math.hypot(y0, y1, y2);
    if (!len) {
      y0 = 0; y1 = 0; y2 = 0;
    } else {
      len = 1 / len;
      y0 *= len; y1 *= len; y2 *= len;
    }

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
    out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
    out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
    out[15] = 1;
    return out;
  },

  multiply(out, a, b) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  },

  invert(out, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  },

  transpose(out, a) {
    if (out === a) {
      const a01 = a[1], a02 = a[2], a03 = a[3];
      const a12 = a[6], a13 = a[7];
      const a23 = a[11];
      out[1] = a[4]; out[2] = a[8]; out[3] = a[12];
      out[4] = a01; out[6] = a[9]; out[7] = a[13];
      out[8] = a02; out[9] = a12; out[11] = a[14];
      out[12] = a03; out[13] = a13; out[14] = a23;
    } else {
      out[0] = a[0]; out[1] = a[4]; out[2] = a[8]; out[3] = a[12];
      out[4] = a[1]; out[5] = a[5]; out[6] = a[9]; out[7] = a[13];
      out[8] = a[2]; out[9] = a[6]; out[10] = a[10]; out[11] = a[14];
      out[12] = a[3]; out[13] = a[7]; out[14] = a[11]; out[15] = a[15];
    }
    return out;
  },
};

// =========================================================================
// SHADERS GLSL WEBGL NATIVOS (PBR / BLINN-PHONG TEXTIL DE ALTO RENDIMIENTO)
// =========================================================================
const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;

uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uModelMatrix;
uniform mat4 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vWorldPosition = worldPos.xyz;
  vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
  vUv = aUv;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform vec3 uCameraPosition;
uniform vec3 uBaseColor;
uniform float uRoughness;
uniform float uMetallic;
uniform int uIsWireframe;

// Luces de Estudio PBR
uniform vec3 uKeyLightDir;
uniform vec3 uKeyLightColor;
uniform vec3 uFillLightDir;
uniform vec3 uFillLightColor;
uniform vec3 uRimLightDir;
uniform vec3 uRimLightColor;
uniform vec3 uAmbientColor;

void main() {
  if (uIsWireframe == 1) {
    gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0);
    return;
  }

  vec3 N = normalize(vNormal);
  if (length(N) < 0.1) N = vec3(0.0, 1.0, 0.0);

  vec3 V = normalize(uCameraPosition - vWorldPosition);
  // Iluminación doble cara (Two-sided lighting) para moldería textil
  if (dot(N, V) < 0.0) {
    N = -N;
  }

  // 1. Key Light (Directa / Frontal-Superior)
  vec3 L1 = normalize(uKeyLightDir);
  float diff1 = max(dot(N, L1), 0.0);
  vec3 H1 = normalize(L1 + V);
  float shininess = mix(16.0, 128.0, 1.0 - uRoughness);
  float spec1 = pow(max(dot(N, H1), 0.0), shininess) * (1.0 - uRoughness * 0.85);

  // 2. Fill Light (Lateral Suave)
  vec3 L2 = normalize(uFillLightDir);
  float diff2 = max(dot(N, L2), 0.0);

  // 3. Rim Light (Contorno Silueta Textil)
  vec3 L3 = normalize(uRimLightDir);
  float diff3 = max(dot(N, L3), 0.0);
  float rimFactor = pow(1.0 - max(dot(N, V), 0.0), 3.0) * diff3;

  // Síntesis de color PBR Textil
  vec3 ambient = uAmbientColor * uBaseColor;
  vec3 direct = uKeyLightColor * diff1 * uBaseColor;
  vec3 fill = uFillLightColor * diff2 * 0.6 * uBaseColor;
  vec3 specular = mix(vec3(1.0), uBaseColor, uMetallic) * (uKeyLightColor * spec1 * 0.45 + uRimLightColor * rimFactor * 0.6);

  vec3 finalColor = ambient + direct + fill + specular;
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

const GRID_VERTEX_SHADER = `
attribute vec3 aPosition;
uniform mat4 uProjectionMatrix;
uniform mat4 uViewMatrix;

varying vec3 vWorldPos;

void main() {
  vWorldPos = aPosition;
  gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
}
`;

const GRID_FRAGMENT_SHADER = `
precision mediump float;
varying vec3 vWorldPos;
uniform vec3 uGridColor;
uniform float uGridAlpha;

void main() {
  float dist = length(vWorldPos.xz);
  float fade = max(0.0, 1.0 - (dist / 1.5));
  gl_FragColor = vec4(uGridColor, uGridAlpha * fade);
}
`;

// =========================================================================
// PARSER AUTÓNOMO glTF 2.0 BINARIO (.GLB)
// =========================================================================
/**
 * Parsea un buffer binario .glb glTF 2.0 extrayendo todas las primitivas y mallas,
 * acumulando posiciones, normales, UVs e índices (con desplazamiento de índices)
 * y resolviendo la lista completa de materiales PBR textiles.
 */
export async function parseGlbBuffer(inputBuffer) {
  if (!inputBuffer || inputBuffer.byteLength < 20) {
    throw new Error('Buffer binario inválido o demasiado pequeño.');
  }

  // Normalizar a ArrayBuffer puro si viene como TypedArray o Node.js Buffer
  let buffer = inputBuffer;
  if (inputBuffer.buffer && inputBuffer.byteOffset !== undefined && inputBuffer.byteLength !== undefined) {
    buffer = inputBuffer.buffer.slice(inputBuffer.byteOffset, inputBuffer.byteOffset + inputBuffer.byteLength);
  }

  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) {
    throw new Error('El archivo no es un buffer binario glTF 2.0 válido (magic header incorrecto).');
  }

  const version = view.getUint32(4, true);
  const totalLength = view.getUint32(8, true);

  // Chunk 0: JSON glTF Structure
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  const jsonBytes = new Uint8Array(buffer, 20, jsonChunkLength);
  const jsonStr = new TextDecoder('utf-8').decode(jsonBytes);
  const gltfDoc = JSON.parse(jsonStr);

  // Chunk 1: BIN Buffer Data
  const binChunkOffset = 20 + jsonChunkLength;
  let binBuffer = null;
  if (binChunkOffset + 8 <= buffer.byteLength) {
    const binChunkLength = view.getUint32(binChunkOffset, true);
    binBuffer = buffer.slice(binChunkOffset + 8, binChunkOffset + 8 + binChunkLength);
  } else {
    binBuffer = new ArrayBuffer(0);
  }

  // 1. Extraer materiales PBR del documento glTF
  const parsedMaterials = [];
  if (Array.isArray(gltfDoc.materials) && gltfDoc.materials.length > 0) {
    for (const mat of gltfDoc.materials) {
      const pbr = mat.pbrMetallicRoughness || {};
      const baseColorFactor = pbr.baseColorFactor || [0.82, 0.78, 0.70, 1.0];
      parsedMaterials.push({
        name: mat.name || 'PBR Fabric',
        baseColor: [baseColorFactor[0], baseColorFactor[1], baseColorFactor[2]],
        roughness: pbr.roughnessFactor ?? 0.75,
        metallic: pbr.metallicFactor ?? 0.0,
      });
    }
  } else {
    parsedMaterials.push({
      name: 'PBR Fabric',
      baseColor: [0.82, 0.78, 0.70],
      roughness: 0.75,
      metallic: 0.0,
    });
  }

  // 2. Iterar sobre todas las mallas y primitivas de gltfDoc
  const parsedPrimitives = [];
  const meshes = gltfDoc.meshes || [];
  let totalVertexCount = 0;
  let totalTriangleCount = 0;

  for (let m = 0; m < meshes.length; m++) {
    const meshDef = meshes[m];
    const primitives = meshDef.primitives || [];

    for (let p = 0; p < primitives.length; p++) {
      const prim = primitives[p];
      let primPositions = null;
      let primNormals = null;
      let primUvs = null;
      let primIndices = null;
      let primVertexCount = 0;
      let primTriangleCount = 0;

      if (gltfDoc.accessors && gltfDoc.bufferViews && binBuffer) {
        // POSICIONES (vec3 FLOAT)
        if (prim.attributes.POSITION !== undefined) {
          const posAcc = gltfDoc.accessors[prim.attributes.POSITION];
          const viewDef = gltfDoc.bufferViews[posAcc.bufferView];
          const offset = (viewDef.byteOffset || 0) + (posAcc.byteOffset || 0);
          primPositions = new Float32Array(binBuffer.slice(offset, offset + posAcc.count * 3 * 4));
          primVertexCount = posAcc.count;
        }

        // NORMALES (vec3 FLOAT)
        if (prim.attributes.NORMAL !== undefined) {
          const normAcc = gltfDoc.accessors[prim.attributes.NORMAL];
          const viewDef = gltfDoc.bufferViews[normAcc.bufferView];
          const offset = (viewDef.byteOffset || 0) + (normAcc.byteOffset || 0);
          primNormals = new Float32Array(binBuffer.slice(offset, offset + normAcc.count * 3 * 4));
        }

        // TEXTURE UVS (vec2 FLOAT)
        if (prim.attributes.TEXCOORD_0 !== undefined) {
          const uvAcc = gltfDoc.accessors[prim.attributes.TEXCOORD_0];
          const viewDef = gltfDoc.bufferViews[uvAcc.bufferView];
          const offset = (viewDef.byteOffset || 0) + (uvAcc.byteOffset || 0);
          primUvs = new Float32Array(binBuffer.slice(offset, offset + uvAcc.count * 2 * 4));
        } else if (primVertexCount > 0) {
          primUvs = new Float32Array(primVertexCount * 2);
        }

        // ÍNDICES DE TRIÁNGULOS (UINT16 o UINT32)
        if (prim.indices !== undefined) {
          const idxAcc = gltfDoc.accessors[prim.indices];
          const viewDef = gltfDoc.bufferViews[idxAcc.bufferView];
          const offset = (viewDef.byteOffset || 0) + (idxAcc.byteOffset || 0);
          if (idxAcc.componentType === 5125) {
            primIndices = new Uint32Array(binBuffer.slice(offset, offset + idxAcc.count * 4));
          } else if (idxAcc.componentType === 5123) {
            primIndices = new Uint16Array(binBuffer.slice(offset, offset + idxAcc.count * 2));
          } else {
            const u8 = new Uint8Array(binBuffer.slice(offset, offset + idxAcc.count));
            primIndices = new Uint16Array(u8);
          }
          primTriangleCount = Math.round(idxAcc.count / 3);
        } else if (primPositions) {
          primTriangleCount = Math.round(primPositions.length / 9);
          primIndices = primPositions.length / 3 > 65535 ? new Uint32Array(primTriangleCount * 3) : new Uint16Array(primTriangleCount * 3);
          for (let i = 0; i < primIndices.length; i++) primIndices[i] = i;
        }
      }

      if (primPositions && primPositions.length > 0) {
        // Generar normales suaves si no vienen en el archivo
        if (!primNormals || primNormals.length !== primPositions.length) {
          primNormals = computeNormals(primPositions, primIndices);
        }

        const matIdx = prim.material !== undefined ? prim.material : 0;
        const primMat = parsedMaterials[matIdx] || parsedMaterials[0] || {
          name: 'PBR Fabric',
          baseColor: [0.82, 0.78, 0.70],
          roughness: 0.75,
          metallic: 0.0,
        };

        // Bounding Box local de la primitiva
        let pMinX = Infinity, pMinY = Infinity, pMinZ = Infinity;
        let pMaxX = -Infinity, pMaxY = -Infinity, pMaxZ = -Infinity;
        for (let i = 0; i < primPositions.length; i += 3) {
          const px = primPositions[i], py = primPositions[i + 1], pz = primPositions[i + 2];
          if (px < pMinX) pMinX = px; if (px > pMaxX) pMaxX = px;
          if (py < pMinY) pMinY = py; if (py > pMaxY) pMaxY = py;
          if (pz < pMinZ) pMinZ = pz; if (pz > pMaxZ) pMaxZ = pz;
        }

        parsedPrimitives.push({
          name: meshDef.name || `primitive_${m}_${p}`,
          positions: primPositions,
          normals: primNormals,
          uvs: primUvs,
          indices: primIndices,
          vertexCount: primVertexCount,
          triangleCount: primTriangleCount,
          materialIndex: matIdx,
          material: primMat,
          bounds: { minX: pMinX, minY: pMinY, minZ: pMinZ, maxX: pMaxX, maxY: pMaxY, maxZ: pMaxZ },
        });

        totalVertexCount += primVertexCount;
        totalTriangleCount += primTriangleCount;
      }
    }
  }

  // 3. Acumular y consolidar todos los buffers con desplazamiento (index offset)
  const combinedPositions = new Float32Array(totalVertexCount * 3);
  const combinedNormals = new Float32Array(totalVertexCount * 3);
  const combinedUvs = new Float32Array(totalVertexCount * 2);

  const useUint32 = totalVertexCount > 65535;
  const combinedIndices = useUint32
    ? new Uint32Array(totalTriangleCount * 3)
    : new Uint16Array(totalTriangleCount * 3);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const prim of parsedPrimitives) {
    if (prim.positions) {
      combinedPositions.set(prim.positions, vertexOffset * 3);
    }
    if (prim.normals) {
      combinedNormals.set(prim.normals, vertexOffset * 3);
    }
    if (prim.uvs) {
      combinedUvs.set(prim.uvs, vertexOffset * 2);
    }
    if (prim.indices) {
      for (let i = 0; i < prim.indices.length; i++) {
        combinedIndices[indexOffset + i] = prim.indices[i] + vertexOffset;
      }
      indexOffset += prim.indices.length;
    }
    vertexOffset += prim.vertexCount;
  }

  // 4. Calcular Bounding Box y Centro Global para auto-encuadre de cámara
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  if (totalVertexCount > 0) {
    for (let i = 0; i < combinedPositions.length; i += 3) {
      const x = combinedPositions[i], y = combinedPositions[i + 1], z = combinedPositions[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  } else {
    minX = -0.5; maxX = 0.5; minY = 0; maxY = 1.2; minZ = -0.3; maxZ = 0.3;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const radius = Math.max(0.4, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);

  const primaryMaterial = parsedMaterials[0] || {
    name: 'PBR Fabric',
    baseColor: [0.82, 0.78, 0.70],
    roughness: 0.75,
    metallic: 0.0,
  };

  return {
    gltfDoc,
    binBuffer,
    positions: combinedPositions,
    normals: combinedNormals,
    uvs: combinedUvs,
    indices: combinedIndices,
    vertexCount: totalVertexCount,
    triangleCount: totalTriangleCount,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
    center: [cx, cy, cz],
    size: [dx, dy, dz],
    radius,
    material: primaryMaterial,
    materials: parsedMaterials,
    primitives: parsedPrimitives,
  };
}

/**
 * Calcula vectores normales por vértice si el archivo glTF no los incluye
 */
function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);

  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3, i1 = indices[i + 1] * 3, i2 = indices[i + 2] * 3;
      const v0x = positions[i0], v0y = positions[i0 + 1], v0z = positions[i0 + 2];
      const v1x = positions[i1], v1y = positions[i1 + 1], v1z = positions[i1 + 2];
      const v2x = positions[i2], v2y = positions[i2 + 1], v2z = positions[i2 + 2];

      const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
      const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;

      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;

      normals[i0] += nx; normals[i0 + 1] += ny; normals[i0 + 2] += nz;
      normals[i1] += nx; normals[i1 + 1] += ny; normals[i1 + 2] += nz;
      normals[i2] += nx; normals[i2 + 1] += ny; normals[i2 + 2] += nz;
    }
  } else {
    for (let i = 0; i < positions.length; i += 9) {
      const v0x = positions[i], v0y = positions[i + 1], v0z = positions[i + 2];
      const v1x = positions[i + 3], v1y = positions[i + 4], v1z = positions[i + 5];
      const v2x = positions[i + 6], v2y = positions[i + 7], v2z = positions[i + 8];

      const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
      const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;
      const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;

      normals[i] = nx; normals[i + 1] = ny; normals[i + 2] = nz;
      normals[i + 3] = nx; normals[i + 4] = ny; normals[i + 5] = nz;
      normals[i + 6] = nx; normals[i + 7] = ny; normals[i + 8] = nz;
    }
  }

  // Normalizar vectores
  for (let i = 0; i < normals.length; i += 3) {
    const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    if (len > 0.0001) {
      normals[i] /= len; normals[i + 1] /= len; normals[i + 2] /= len;
    } else {
      normals[i] = 0; normals[i + 1] = 1; normals[i + 2] = 0;
    }
  }

  return normals;
}

// =========================================================================
// MOTOR WEBGL NATIVO AUTÓNOMO (Sin dependencias externas)
// =========================================================================
class NativeWebGlEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.theme = options.theme || 'dark';
    this.autoRotate = options.autoRotate ?? true;
    this.showWireframe = false;
    this.isDisposed = false;

    // Inicializar Contexto WebGL / WebGL2
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true }) ||
               canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) {
      throw new Error('WebGL no está soportado en este navegador.');
    }
    this.gl = gl;

    // Habilitar extensiones necesarias (ej: OES_element_index_uint para UINT32 indices)
    this.extUint = gl.getExtension('OES_element_index_uint');

    // Estado de Cámara Orbital
    this.target = [0, 0.9, 0];
    this.azimuth = 0.4; // Ángulo horizontal (yaw)
    this.polar = 1.35;  // Ángulo vertical (pitch, ~77 deg)
    this.distance = 2.2;
    this.minDistance = 0.3;
    this.maxDistance = 6.0;
    this.panOffset = [0, 0, 0];
    this.autoRotateSpeed = 0.6; // rad/seg

    // Material y Color actual
    this.baseColor = [0.82, 0.78, 0.70];
    this.roughness = 0.75;
    this.metallic = 0.0;
    this.customBaseColor = null;
    this.customRoughness = null;
    this.customMetallic = null;

    // Geometría cargada y buffers GPU multi-primitiva
    this.meshData = null;
    this.primitiveBuffers = [];
    this.positionBuffer = null;
    this.normalBuffer = null;
    this.uvBuffer = null;
    this.indexBuffer = null;
    this.wireframeIndexBuffer = null;
    this.wireframeIndexCount = 0;

    // Compilar Shaders
    this.initShaders();
    this.initGrid();
    this.initInteraction();

    // Iniciar bucle de render
    this.lastTime = performance.now();
    this.renderLoop = this.renderLoop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  initShaders() {
    const gl = this.gl;

    // 1. Shader Principal de Malla Textil
    this.meshProgram = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.meshLocations = {
      aPosition: gl.getAttribLocation(this.meshProgram, 'aPosition'),
      aNormal: gl.getAttribLocation(this.meshProgram, 'aNormal'),
      aUv: gl.getAttribLocation(this.meshProgram, 'aUv'),
      uProjectionMatrix: gl.getUniformLocation(this.meshProgram, 'uProjectionMatrix'),
      uViewMatrix: gl.getUniformLocation(this.meshProgram, 'uViewMatrix'),
      uModelMatrix: gl.getUniformLocation(this.meshProgram, 'uModelMatrix'),
      uNormalMatrix: gl.getUniformLocation(this.meshProgram, 'uNormalMatrix'),
      uCameraPosition: gl.getUniformLocation(this.meshProgram, 'uCameraPosition'),
      uBaseColor: gl.getUniformLocation(this.meshProgram, 'uBaseColor'),
      uRoughness: gl.getUniformLocation(this.meshProgram, 'uRoughness'),
      uMetallic: gl.getUniformLocation(this.meshProgram, 'uMetallic'),
      uIsWireframe: gl.getUniformLocation(this.meshProgram, 'uIsWireframe'),
      uKeyLightDir: gl.getUniformLocation(this.meshProgram, 'uKeyLightDir'),
      uKeyLightColor: gl.getUniformLocation(this.meshProgram, 'uKeyLightColor'),
      uFillLightDir: gl.getUniformLocation(this.meshProgram, 'uFillLightDir'),
      uFillLightColor: gl.getUniformLocation(this.meshProgram, 'uFillLightColor'),
      uRimLightDir: gl.getUniformLocation(this.meshProgram, 'uRimLightDir'),
      uRimLightColor: gl.getUniformLocation(this.meshProgram, 'uRimLightColor'),
      uAmbientColor: gl.getUniformLocation(this.meshProgram, 'uAmbientColor'),
    };

    // 2. Shader de Cuadrícula de Suelo
    this.gridProgram = this.createProgram(GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER);
    this.gridLocations = {
      aPosition: gl.getAttribLocation(this.gridProgram, 'aPosition'),
      uProjectionMatrix: gl.getUniformLocation(this.gridProgram, 'uProjectionMatrix'),
      uViewMatrix: gl.getUniformLocation(this.gridProgram, 'uViewMatrix'),
      uGridColor: gl.getUniformLocation(this.gridProgram, 'uGridColor'),
      uGridAlpha: gl.getUniformLocation(this.gridProgram, 'uGridAlpha'),
    };
  }

  createProgram(vertSrc, fragSrc) {
    const gl = this.gl;
    const vertShader = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const fragShader = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(prog);
      gl.deleteProgram(prog);
      throw new Error(`Error linkeando shader WebGL: ${info}`);
    }
    return prog;
  }

  compileShader(type, src) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Error compilando shader WebGL (${type}): ${info}`);
    }
    return shader;
  }

  initGrid() {
    const gl = this.gl;
    const lines = [];
    const size = 1.4;
    const divisions = 20;
    const step = (size * 2) / divisions;

    for (let i = -size; i <= size + 0.001; i += step) {
      lines.push(-size, 0, i, size, 0, i);
      lines.push(i, 0, -size, i, 0, size);
    }

    this.gridVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
    this.gridVertexCount = lines.length / 3;
  }

  initInteraction() {
    const canvas = this.canvas;
    let isDragging = false;
    let dragMode = 'rotate'; // 'rotate' | 'pan'
    let lastX = 0, lastY = 0;
    let touchDistanceStart = 0;

    const onPointerDown = (e) => {
      canvas.parentElement?.classList.add('dragging');
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dragMode = e.button === 2 || e.shiftKey || e.button === 1 ? 'pan' : 'rotate';
      this.autoRotate = false;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      if (dragMode === 'rotate') {
        this.azimuth += dx * 0.008;
        this.polar = Math.max(0.05, Math.min(Math.PI / 2 + 0.15, this.polar - dy * 0.008));
      } else if (dragMode === 'pan') {
        const factor = this.distance * 0.0015;
        this.panOffset[0] -= (Math.cos(this.azimuth) * dx - Math.sin(this.azimuth) * 0) * factor;
        this.panOffset[1] += dy * factor;
      }
    };

    const onPointerUp = () => {
      canvas.parentElement?.classList.remove('dragging');
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = 1.0 + Math.sign(e.deltaY) * 0.08;
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * zoomFactor));
    };

    const onContextMenu = (e) => e.preventDefault();

    // Touch support (1 dedo rotar, 2 dedos zoom y pan)
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        dragMode = 'rotate';
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        this.autoRotate = false;
      } else if (e.touches.length === 2) {
        isDragging = true;
        dragMode = 'pinch';
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchDistanceStart = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      if (e.touches.length === 1 && dragMode === 'rotate') {
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        this.azimuth += dx * 0.008;
        this.polar = Math.max(0.05, Math.min(Math.PI / 2 + 0.15, this.polar - dy * 0.008));
      } else if (e.touches.length === 2 && dragMode === 'pinch') {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        if (touchDistanceStart > 0) {
          const ratio = touchDistanceStart / currentDist;
          this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * ratio));
          touchDistanceStart = currentDist;
        }
      }
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    canvas.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  disposeBuffers() {
    const gl = this.gl;
    if (this.primitiveBuffers && this.primitiveBuffers.length > 0) {
      for (const pBuf of this.primitiveBuffers) {
        if (pBuf.positionBuffer) gl.deleteBuffer(pBuf.positionBuffer);
        if (pBuf.normalBuffer) gl.deleteBuffer(pBuf.normalBuffer);
        if (pBuf.uvBuffer) gl.deleteBuffer(pBuf.uvBuffer);
        if (pBuf.indexBuffer) gl.deleteBuffer(pBuf.indexBuffer);
        if (pBuf.wireframeIndexBuffer) gl.deleteBuffer(pBuf.wireframeIndexBuffer);
      }
      this.primitiveBuffers = [];
    }
    if (this.positionBuffer) { gl.deleteBuffer(this.positionBuffer); this.positionBuffer = null; }
    if (this.normalBuffer) { gl.deleteBuffer(this.normalBuffer); this.normalBuffer = null; }
    if (this.uvBuffer) { gl.deleteBuffer(this.uvBuffer); this.uvBuffer = null; }
    if (this.indexBuffer) { gl.deleteBuffer(this.indexBuffer); this.indexBuffer = null; }
    if (this.wireframeIndexBuffer) { gl.deleteBuffer(this.wireframeIndexBuffer); this.wireframeIndexBuffer = null; }
  }

  setModel(meshData) {
    const gl = this.gl;
    this.meshData = meshData;

    // Destruir buffers GPU anteriores
    this.disposeBuffers();

    // Crear buffers GPU por primitiva (soporte multi-material y multi-panel)
    this.primitiveBuffers = [];

    if (meshData.primitives && meshData.primitives.length > 0) {
      for (const prim of meshData.primitives) {
        const primBuf = {
          positionBuffer: null,
          normalBuffer: null,
          uvBuffer: null,
          indexBuffer: null,
          wireframeIndexBuffer: null,
          wireframeIndexCount: 0,
          vertexCount: prim.vertexCount,
          indexCount: prim.indices ? prim.indices.length : 0,
          indexType: prim.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
          material: prim.material || { baseColor: [0.82, 0.78, 0.70], roughness: 0.75, metallic: 0.0 },
        };

        if (prim.positions) {
          primBuf.positionBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, prim.positions, gl.STATIC_DRAW);
        }

        if (prim.normals) {
          primBuf.normalBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.normalBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, prim.normals, gl.STATIC_DRAW);
        }

        if (prim.uvs) {
          primBuf.uvBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.uvBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, prim.uvs, gl.STATIC_DRAW);
        }

        if (prim.indices) {
          primBuf.indexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primBuf.indexBuffer);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, prim.indices, gl.STATIC_DRAW);

          // Generar líneas de alambre (Wireframe)
          const wireIndices = [];
          for (let i = 0; i < prim.indices.length; i += 3) {
            const a = prim.indices[i], b = prim.indices[i + 1], c = prim.indices[i + 2];
            wireIndices.push(a, b, b, c, c, a);
          }
          primBuf.wireframeIndexCount = wireIndices.length;
          primBuf.wireframeIndexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primBuf.wireframeIndexBuffer);
          const wireArr = prim.indices instanceof Uint32Array ? new Uint32Array(wireIndices) : new Uint16Array(wireIndices);
          gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireArr, gl.STATIC_DRAW);
        }

        this.primitiveBuffers.push(primBuf);
      }
    } else if (meshData.positions) {
      // Fallback para malla simple
      const fallbackBuf = {
        positionBuffer: gl.createBuffer(),
        normalBuffer: null,
        uvBuffer: null,
        indexBuffer: null,
        wireframeIndexBuffer: null,
        wireframeIndexCount: 0,
        vertexCount: meshData.vertexCount,
        indexCount: meshData.indices ? meshData.indices.length : 0,
        indexType: meshData.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
        material: meshData.material || { baseColor: [0.82, 0.78, 0.70], roughness: 0.75, metallic: 0.0 },
      };

      gl.bindBuffer(gl.ARRAY_BUFFER, fallbackBuf.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, meshData.positions, gl.STATIC_DRAW);

      if (meshData.normals) {
        fallbackBuf.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fallbackBuf.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, meshData.normals, gl.STATIC_DRAW);
      }

      if (meshData.uvs) {
        fallbackBuf.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, fallbackBuf.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, meshData.uvs, gl.STATIC_DRAW);
      }

      if (meshData.indices) {
        fallbackBuf.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fallbackBuf.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, meshData.indices, gl.STATIC_DRAW);

        const wireIndices = [];
        for (let i = 0; i < meshData.indices.length; i += 3) {
          const a = meshData.indices[i], b = meshData.indices[i + 1], c = meshData.indices[i + 2];
          wireIndices.push(a, b, b, c, c, a);
        }
        fallbackBuf.wireframeIndexCount = wireIndices.length;
        fallbackBuf.wireframeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, fallbackBuf.wireframeIndexBuffer);
        const wireArr = meshData.indices instanceof Uint32Array ? new Uint32Array(wireIndices) : new Uint16Array(wireIndices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireArr, gl.STATIC_DRAW);
      }

      this.primitiveBuffers.push(fallbackBuf);
    }

    // Configurar Material PBR por defecto
    if (meshData.material) {
      this.baseColor = meshData.material.baseColor || [0.82, 0.78, 0.70];
      this.roughness = meshData.material.roughness ?? 0.75;
      this.metallic = meshData.material.metallic ?? 0.0;
    }

    // Resetear anulaciones personalizadas de toolbar
    this.customBaseColor = null;
    this.customRoughness = null;
    this.customMetallic = null;

    // Auto-ajustar cámara al modelo
    this.fitToScreen();
  }

  fitToScreen() {
    if (this.meshData && this.meshData.center) {
      this.target = [this.meshData.center[0], this.meshData.center[1], this.meshData.center[2]];
      const rad = this.meshData.radius || 0.6;
      this.distance = Math.max(1.2, rad * 2.6);
      this.panOffset = [0, 0, 0];
    }
  }

  resize(width, height) {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayWidth = Math.round(width * dpr);
    const displayHeight = Math.round(height * dpr);

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  renderLoop(now) {
    if (this.isDisposed) return;
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.autoRotate) {
      this.azimuth += this.autoRotateSpeed * dt;
    }

    this.render();
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  render() {
    const gl = this.gl;
    const w = this.canvas.width || 600;
    const h = this.canvas.height || 500;
    const aspect = w / h;

    // Configuración de Estados WebGL
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Color de Fondo de Estudio Fotográfico
    if (this.theme === 'light') {
      gl.clearColor(0.95, 0.96, 0.98, 1.0);
    } else {
      gl.clearColor(0.04, 0.06, 0.11, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 1. Matrices de Cámara y Proyección
    const pMatrix = mat4.create();
    mat4.perspective(pMatrix, 45 * Math.PI / 180, aspect, 0.05, 50.0);

    // Posición esférica de la cámara
    const camX = this.target[0] + this.panOffset[0] + this.distance * Math.sin(this.polar) * Math.sin(this.azimuth);
    const camY = this.target[1] + this.panOffset[1] + this.distance * Math.cos(this.polar);
    const camZ = this.target[2] + this.panOffset[2] + this.distance * Math.sin(this.polar) * Math.cos(this.azimuth);
    const eye = [camX, camY, camZ];
    const center = [this.target[0] + this.panOffset[0], this.target[1] + this.panOffset[1], this.target[2] + this.panOffset[2]];
    const up = [0, 1, 0];

    const vMatrix = mat4.create();
    mat4.lookAt(vMatrix, eye, center, up);

    // 2. Renderizar Cuadrícula de Suelo
    if (this.gridVbo && this.gridProgram) {
      gl.useProgram(this.gridProgram);
      gl.uniformMatrix4fv(this.gridLocations.uProjectionMatrix, false, pMatrix);
      gl.uniformMatrix4fv(this.gridLocations.uViewMatrix, false, vMatrix);

      const gridColor = this.theme === 'light' ? [0.65, 0.72, 0.80] : [0.20, 0.35, 0.55];
      gl.uniform3fv(this.gridLocations.uGridColor, gridColor);
      gl.uniform1f(this.gridLocations.uGridAlpha, 0.35);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVbo);
      gl.enableVertexAttribArray(this.gridLocations.aPosition);
      gl.vertexAttribPointer(this.gridLocations.aPosition, 3, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.LINES, 0, this.gridVertexCount);
    }

    // 3. Renderizar Mallas de Prenda 3D con soporte Multi-Material y Multi-Primitiva
    if (this.meshData && this.primitiveBuffers && this.primitiveBuffers.length > 0 && this.meshProgram) {
      gl.useProgram(this.meshProgram);

      const mMatrix = mat4.create();
      mat4.identity(mMatrix);

      const nMatrix = mat4.create();
      mat4.invert(nMatrix, mMatrix);
      mat4.transpose(nMatrix, nMatrix);

      gl.uniformMatrix4fv(this.meshLocations.uProjectionMatrix, false, pMatrix);
      gl.uniformMatrix4fv(this.meshLocations.uViewMatrix, false, vMatrix);
      gl.uniformMatrix4fv(this.meshLocations.uModelMatrix, false, mMatrix);
      gl.uniformMatrix4fv(this.meshLocations.uNormalMatrix, false, nMatrix);
      gl.uniform3fv(this.meshLocations.uCameraPosition, eye);

      // Iluminación de Estudio PBR
      gl.uniform3fv(this.meshLocations.uKeyLightDir, [1.5, 3.0, 2.5]);
      gl.uniform3fv(this.meshLocations.uKeyLightColor, [1.2, 1.2, 1.2]);
      gl.uniform3fv(this.meshLocations.uFillLightDir, [-2.0, 1.5, 1.5]);
      gl.uniform3fv(this.meshLocations.uFillLightColor, [0.55, 0.70, 0.95]);
      gl.uniform3fv(this.meshLocations.uRimLightDir, [0.0, 2.5, -2.5]);
      gl.uniform3fv(this.meshLocations.uRimLightColor, [0.4, 0.75, 1.0]);
      const amb = this.theme === 'light' ? [0.65, 0.65, 0.65] : [0.35, 0.38, 0.45];
      gl.uniform3fv(this.meshLocations.uAmbientColor, amb);

      for (const primBuf of this.primitiveBuffers) {
        if (!primBuf.positionBuffer) continue;

        // Material PBR (usar color de la primitiva o anulación de toolbar)
        const primColor = this.customBaseColor || primBuf.material.baseColor || this.baseColor;
        const primRoughness = this.customRoughness !== null && this.customRoughness !== undefined
          ? this.customRoughness
          : (primBuf.material.roughness ?? this.roughness);
        const primMetallic = this.customMetallic !== null && this.customMetallic !== undefined
          ? this.customMetallic
          : (primBuf.material.metallic ?? this.metallic);

        gl.uniform3fv(this.meshLocations.uBaseColor, primColor);
        gl.uniform1f(this.meshLocations.uRoughness, primRoughness);
        gl.uniform1f(this.meshLocations.uMetallic, primMetallic);
        gl.uniform1i(this.meshLocations.uIsWireframe, 0);

        // Bind Buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.positionBuffer);
        gl.enableVertexAttribArray(this.meshLocations.aPosition);
        gl.vertexAttribPointer(this.meshLocations.aPosition, 3, gl.FLOAT, false, 0, 0);

        if (primBuf.normalBuffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.normalBuffer);
          gl.enableVertexAttribArray(this.meshLocations.aNormal);
          gl.vertexAttribPointer(this.meshLocations.aNormal, 3, gl.FLOAT, false, 0, 0);
        } else {
          gl.disableVertexAttribArray(this.meshLocations.aNormal);
        }

        if (primBuf.uvBuffer && this.meshLocations.aUv !== -1) {
          gl.bindBuffer(gl.ARRAY_BUFFER, primBuf.uvBuffer);
          gl.enableVertexAttribArray(this.meshLocations.aUv);
          gl.vertexAttribPointer(this.meshLocations.aUv, 2, gl.FLOAT, false, 0, 0);
        } else if (this.meshLocations.aUv !== -1) {
          gl.disableVertexAttribArray(this.meshLocations.aUv);
        }

        // Dibujar Triángulos Superficie
        if (primBuf.indexBuffer && primBuf.indexCount > 0) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primBuf.indexBuffer);
          gl.drawElements(gl.TRIANGLES, primBuf.indexCount, primBuf.indexType, 0);
        } else if (primBuf.vertexCount > 0) {
          gl.drawArrays(gl.TRIANGLES, 0, primBuf.vertexCount);
        }

        // Dibujar Wireframe si está habilitado
        if (this.showWireframe && primBuf.wireframeIndexBuffer && primBuf.wireframeIndexCount > 0) {
          gl.uniform1i(this.meshLocations.uIsWireframe, 1);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, primBuf.wireframeIndexBuffer);
          gl.drawElements(gl.LINES, primBuf.wireframeIndexCount, primBuf.indexType, 0);
        }
      }
    }
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    const gl = this.gl;
    this.disposeBuffers();
    if (this.gridVbo) gl.deleteBuffer(this.gridVbo);
    if (this.meshProgram) gl.deleteProgram(this.meshProgram);
    if (this.gridProgram) gl.deleteProgram(this.gridProgram);
  }
}

// =========================================================================
// CLASE PRINCIPAL EXPORTADA: GarmentViewer3D
// =========================================================================
export class GarmentViewer3D {
  constructor(container, options = {}) {
    if (!container) throw new Error('[GarmentViewer3D] Se requiere un elemento contenedor DOM válido.');
    this.container = container;
    this.theme = options.theme || 'dark';
    this.autoRotate = options.autoRotate ?? true;
    this.showWireframe = false;
    this.currentModelUrl = null;
    this.currentGlbData = null;

    // Metadatos del modelo cargado
    this.stats = {
      vertexCount: 0,
      triangleCount: 0,
      meshCount: 0,
      materialName: 'PBR Fabric',
    };

    // Inicializar DOM e interfaz
    this.initDom();
    this.initEngine();
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

    // Canvas WebGL
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.className = 'viewer3d-canvas';
    this.viewportEl.appendChild(this.canvasEl);

    // Toolbar flotante superior
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'viewer3d-floating-toolbar';
    this.toolbarEl.innerHTML = `
      <button type="button" class="viewer3d-btn ${this.autoRotate ? 'active' : ''}" id="v3dBtnRotate" title="Rotación Automática 360°">
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
    this.helpBadgeEl.innerHTML = '🖱️ Arrastrar: Rotar 360° | Rueda: Zoom | Clic Der / Shift: Paneo';
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

    this.btnRotate?.addEventListener('click', () => this.toggleAutoRotate());
    this.btnWireframe?.addEventListener('click', () => this.toggleWireframe());
    this.btnReset?.addEventListener('click', () => this.resetView());
    this.selectFabric?.addEventListener('change', (e) => this.applyFabricPreset(e.target.value));
    this.inputColor?.addEventListener('input', (e) => {
      this.applyCustomColor(e.target.value);
      if (this.btnColor) this.btnColor.style.backgroundColor = e.target.value;
    });
  }

  /**
   * Inicializa el motor de render WebGL nativo
   */
  initEngine() {
    try {
      this.nativeEngine = new NativeWebGlEngine(this.canvasEl, {
        theme: this.theme,
        autoRotate: this.autoRotate,
      });

      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.viewportEl);

      this.handleResize();
      this.hideLoader();
    } catch (err) {
      console.error('[GarmentViewer3D] Error inicializando WebGL nativo:', err);
      this.showError(`Error inicializando aceleración WebGL: ${err.message}`);
    }
  }

  /**
   * Carga un modelo 3D (.glb) desde una URL o un ArrayBuffer y lo renderiza de inmediato
   */
  async loadModel(urlOrBuffer) {
    this.showLoader();

    if (!urlOrBuffer) {
      this.showError('No se especificó la ruta del modelo 3D.');
      return;
    }

    this.currentModelUrl = typeof urlOrBuffer === 'string' ? urlOrBuffer : null;

    try {
      let arrayBuf = null;

      if (typeof urlOrBuffer === 'string') {
        const res = await fetch(urlOrBuffer);
        if (!res.ok) {
          throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
        }
        arrayBuf = await res.arrayBuffer();
      } else if (urlOrBuffer instanceof ArrayBuffer) {
        arrayBuf = urlOrBuffer;
      }

      this.currentGlbData = arrayBuf;
      const meshData = await parseGlbBuffer(arrayBuf);

      if (this.nativeEngine) {
        this.nativeEngine.setModel(meshData);
      }

      // Actualizar estadísticas HUD
      this.stats = {
        vertexCount: meshData.vertexCount,
        triangleCount: meshData.triangleCount,
        meshCount: meshData.primitives?.length || 1,
        materialName:
          meshData.materials && meshData.materials.length > 1
            ? meshData.materials.map((m) => m.name).join(', ')
            : meshData.material?.name || 'PBR Fabric',
      };
      this.updateHud();
      this.hideLoader();
    } catch (err) {
      console.error('[GarmentViewer3D] Falló la carga del modelo 3D:', err);
      this.showError(`No se pudo cargar el modelo 3D (.glb): ${err.message}`);
    }
  }

  /**
   * Parser autónomo expuesto como método de instancia
   */
  async parseGlbBuffer(buffer) {
    return parseGlbBuffer(buffer);
  }

  /**
   * Centra y enmarca el modelo en la vista
   */
  fitToScreen() {
    if (this.nativeEngine) {
      this.nativeEngine.fitToScreen();
    }
  }

  /**
   * Restablece la posición y orientación de la cámara
   */
  resetView() {
    if (this.nativeEngine) {
      this.nativeEngine.fitToScreen();
      this.nativeEngine.azimuth = 0.4;
      this.nativeEngine.polar = 1.35;
    }
  }

  /**
   * Alterna la rotación automática 360°
   */
  toggleAutoRotate(enable) {
    this.autoRotate = enable !== undefined ? enable : !this.autoRotate;
    if (this.nativeEngine) {
      this.nativeEngine.autoRotate = this.autoRotate;
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
    if (this.nativeEngine) {
      this.nativeEngine.showWireframe = this.showWireframe;
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
      if (this.nativeEngine) {
        this.nativeEngine.customBaseColor = null;
        this.nativeEngine.customRoughness = null;
        this.nativeEngine.customMetallic = null;
        if (this.nativeEngine.meshData?.material) {
          this.nativeEngine.baseColor = this.nativeEngine.meshData.material.baseColor || [0.82, 0.78, 0.70];
          this.nativeEngine.roughness = this.nativeEngine.meshData.material.roughness ?? 0.75;
          this.nativeEngine.metallic = this.nativeEngine.meshData.material.metallic ?? 0.0;
        }
      }
      if (this.valMaterial && this.stats) {
        this.valMaterial.textContent = this.stats.materialName;
      }
      return;
    }

    const preset = FABRIC_PRESETS[fabricKey];
    if (!preset) return;

    const rgb = hexToRgb(preset.color);
    if (this.nativeEngine) {
      this.nativeEngine.customBaseColor = rgb;
      this.nativeEngine.customRoughness = preset.roughness;
      this.nativeEngine.customMetallic = preset.metallic;
      this.nativeEngine.baseColor = rgb;
      this.nativeEngine.roughness = preset.roughness;
      this.nativeEngine.metallic = preset.metallic;
    }

    if (this.valMaterial) this.valMaterial.textContent = preset.name;
    if (this.btnColor) this.btnColor.style.backgroundColor = preset.color;
    if (this.inputColor) this.inputColor.value = preset.color;
  }

  /**
   * Aplica un color personalizado en tiempo real
   */
  applyCustomColor(hexColor) {
    const rgb = hexToRgb(hexColor);
    if (this.nativeEngine) {
      this.nativeEngine.customBaseColor = rgb;
      this.nativeEngine.baseColor = rgb;
    }
  }

  /**
   * Actualiza el tema del visor (Dark / Light)
   */
  setTheme(theme) {
    this.theme = theme;
    this.container.classList.toggle('theme-light', theme === 'light');
    if (this.nativeEngine) {
      this.nativeEngine.theme = theme;
    }
  }

  /**
   * Ajusta las dimensiones del renderizador al redimensionar la ventana o pestaña
   */
  handleResize() {
    if (!this.viewportEl || !this.nativeEngine) return;
    const width = this.viewportEl.clientWidth || 600;
    const height = this.viewportEl.clientHeight || 500;
    this.nativeEngine.resize(width, height);
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
   * Libera recursos y memoria WebGL
   */
  dispose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.nativeEngine) {
      this.nativeEngine.dispose();
    }
  }
}
