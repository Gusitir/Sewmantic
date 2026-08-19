/**
 * src/server/app.ts
 * Servidor HTTP Nativo y Despachador de Rutas para pattern-ai-core
 * pattern-ai-core
 */

import http, { IncomingMessage, ServerResponse, Server } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  RouteContext,
  setCorsHeaders,
  sendError,
  handleGetStatus,
  handleGetPresets,
  handleGetPatterns,
  handleGetPatternSvg,
  handleGetPatternTechpack,
  handleGetPatternBundle,
  handlePostGenerate,
  handlePostBundle,
} from './routes.js';

export interface ServerOptions {
  port?: number;
  outputDir?: string;
  publicDir?: string;
  version?: string;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Resuelve el directorio estático público buscando en varias ubicaciones estándar
 */
export function resolvePublicDirectory(customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return path.resolve(customDir);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    path.join(__dirname, 'public'),
    path.join(process.cwd(), 'src', 'server', 'public'),
    path.join(process.cwd(), 'dist', 'server', 'public'),
    path.join(process.cwd(), 'public'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return path.resolve(dir);
    }
  }

  // Si ninguno existe, crear/usar el local relativo
  const defaultDir = path.join(__dirname, 'public');
  return path.resolve(defaultDir);
}

/**
 * Sirve archivos estáticos desde la carpeta pública con protección de Path Traversal
 */
export async function serveStaticFile(
  pathname: string,
  res: ServerResponse,
  publicDir: string
): Promise<boolean> {
  const resolvedPublicDir = path.resolve(publicDir);
  if (!fs.existsSync(resolvedPublicDir)) {
    return false;
  }

  // Normalizar ruta solicitada
  let relativePath = pathname;
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  const targetPath = path.normalize(path.join(resolvedPublicDir, relativePath));

  // Seguridad: Verificación estricta de Path Traversal
  if (!targetPath.startsWith(resolvedPublicDir)) {
    return false;
  }

  let finalPath = targetPath;
  try {
    const stat = await fs.promises.stat(finalPath);
    if (stat.isDirectory()) {
      finalPath = path.join(finalPath, 'index.html');
      if (!fs.existsSync(finalPath)) return false;
    }
  } catch {
    // Si no existe y es una navegación HTML, intentar fallback a index.html
    const fallback = path.join(resolvedPublicDir, 'index.html');
    if (!pathname.startsWith('/api/') && fs.existsSync(fallback)) {
      finalPath = fallback;
    } else {
      return false;
    }
  }

  try {
    const ext = path.extname(finalPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.promises.readFile(finalPath);

    setCorsHeaders(res);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', content.length);
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * Manejador central de peticiones HTTP
 */
export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: RouteContext
): Promise<void> {
  try {
    const host = req.headers.host || 'localhost';
    const parsedUrl = new URL(req.url || '/', `http://${host}`);
    const pathname = parsedUrl.pathname;
    const method = (req.method || 'GET').toUpperCase();

    // 1. Manejo de pre-flight CORS (OPTIONS)
    if (method === 'OPTIONS') {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    // 2. Enrutamiento de API REST (/api/...)
    if (pathname.startsWith('/api/')) {
      // GET /api/status
      if (pathname === '/api/status' && method === 'GET') {
        await handleGetStatus(req, res, ctx);
        return;
      }

      // GET /api/presets
      if (pathname === '/api/presets' && method === 'GET') {
        await handleGetPresets(req, res);
        return;
      }

      // GET /api/patterns
      if (pathname === '/api/patterns' && method === 'GET') {
        await handleGetPatterns(req, res, ctx);
        return;
      }

      // GET /api/patterns/:concept/svg
      const svgMatch = pathname.match(/^\/api\/patterns\/([^/]+)\/svg\/?$/);
      if (svgMatch && method === 'GET') {
        const concept = decodeURIComponent(svgMatch[1]);
        await handleGetPatternSvg(concept, req, res, ctx);
        return;
      }

      // GET /api/patterns/:concept/techpack
      const techpackMatch = pathname.match(/^\/api\/patterns\/([^/]+)\/techpack\/?$/);
      if (techpackMatch && method === 'GET') {
        const concept = decodeURIComponent(techpackMatch[1]);
        await handleGetPatternTechpack(concept, req, res, ctx);
        return;
      }

      // GET /api/patterns/:concept/bundle
      const bundleMatch = pathname.match(/^\/api\/patterns\/([^/]+)\/bundle\/?$/);
      if (bundleMatch && method === 'GET') {
        const concept = decodeURIComponent(bundleMatch[1]);
        await handleGetPatternBundle(concept, req, res, ctx);
        return;
      }

      // POST /api/generate
      if (pathname === '/api/generate' && method === 'POST') {
        await handlePostGenerate(req, res, ctx);
        return;
      }

      // POST /api/bundle
      if (pathname === '/api/bundle' && method === 'POST') {
        await handlePostBundle(req, res, ctx);
        return;
      }

      // Endpoint API desconocido
      sendError(res, 404, `Endpoint de API no encontrado: ${method} ${pathname}`);
      return;
    }

    // 3. Manejo de Archivos Estáticos (Front-end Web UI)
    const served = await serveStaticFile(pathname, res, ctx.publicDir);
    if (!served) {
      sendError(res, 404, `Recurso no encontrado: ${pathname}`);
    }
  } catch (err) {
    sendError(
      res,
      500,
      'Error interno del servidor HTTP',
      err instanceof Error ? err.message : String(err)
    );
  }
}

/**
 * Fábrica para instanciar el servidor HTTP nativo
 */
export function createApp(options: ServerOptions = {}): Server {
  const outputDir = options.outputDir || 'output';
  const publicDir = resolvePublicDirectory(options.publicDir);
  const version = options.version || '0.1.0';

  const ctx: RouteContext = {
    outputDir,
    publicDir,
    version,
  };

  const server = http.createServer((req, res) => {
    handleRequest(req, res, ctx);
  });

  return server;
}
