/**
 * src/server/index.ts
 * Punto de entrada del Servidor API REST Local y CLI Web Server
 * pattern-ai-core
 */

import http from 'node:http';
import { exec } from 'node:child_process';
import { createApp, ServerOptions } from './app.js';
import { getVersion } from '../index.js';

export * from './app.js';
export * from './routes.js';

export interface StartServerOptions extends ServerOptions {
  host?: string;
  open?: boolean;
}

export interface RunningServerInfo {
  server: http.Server;
  url: string;
  port: number;
  host: string;
  close: () => Promise<void>;
}

/**
 * Abre automáticamente la URL en el navegador por defecto del sistema
 */
export function openBrowser(url: string): void {
  const startCmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      // Ignorar silenciosamente si no se puede abrir el navegador en entornos headless/CI
    }
  });
}

/**
 * Inicia el servidor HTTP de pattern-ai-core
 */
export async function startServer(
  options: StartServerOptions = {}
): Promise<RunningServerInfo> {
  const port = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3030);
  const host = options.host || '127.0.0.1';
  const version = options.version || getVersion();

  const server = createApp({
    ...options,
    version,
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err) => {
      reject(err);
    });

    server.listen(port, host, () => {
      const address = server.address();
      const actualPort =
        typeof address === 'object' && address !== null ? address.port : port;
      const actualHost = host === '0.0.0.0' ? '127.0.0.1' : host;
      const url = `http://${actualHost}:${actualPort}`;

      console.log(`\n=============================================================`);
      console.log(`pattern-ai-core v${version} — Servidor API REST Local Activo`);
      console.log(`=============================================================`);
      console.log(`• Web UI Dashboard:   ${url}`);
      console.log(`• API Status:         ${url}/api/status`);
      console.log(`• Presets Disponibles: ${url}/api/presets`);
      console.log(`• Biblioteca Moldería: ${url}/api/patterns`);
      console.log(`• Carpeta de Salida:  ${options.outputDir || 'output'}`);
      console.log(`=============================================================\n`);

      if (options.open) {
        openBrowser(url);
      }

      resolve({
        server,
        url,
        port: actualPort,
        host: actualHost,
        close: () =>
          new Promise<void>((res, rej) => {
            server.close((closeErr) => {
              if (closeErr) rej(closeErr);
              else res();
            });
          }),
      });
    });
  });
}
