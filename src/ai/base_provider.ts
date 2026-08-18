/**
 * src/ai/base_provider.ts
 * Contrato base y utilidades de ejecución para proveedores de Inteligencia Artificial
 * pattern-ai-core
 */

import { spawn } from "node:child_process";
import type { PatternDna } from "../types/pattern.js";

/**
 * Opciones de configuración comunes para proveedores de IA
 */
export interface AiProviderConfig {
  model?: string;
  timeoutMs?: number;
  apiKey?: string;
  baseUrl?: string;
  executablePath?: string;
}

/**
 * Resultado de la ejecución de un subproceso CLI
 */
export interface ProcessResult {
  stdout: string;
  stderr: string;
}

/**
 * Interfaz unificada para generadores de ADN Paramétrico asistidos por IA
 */
export interface IAiProvider {
  /**
   * Genera el ADN Paramétrico a partir de un prompt descriptivo y una ruta opcional de imagen de referencia
   * @param prompt Instrucciones o descripción de la prenda deseada
   * @param imagePath Ruta absoluta o relativa al archivo de imagen de referencia (opcional)
   * @returns Promesa con el objeto PatternDna validado según el esquema Zod
   */
  generatePatternDna(prompt: string, imagePath?: string): Promise<PatternDna>;

  /**
   * Retorna el nombre identificador único del proveedor
   */
  getProviderName(): string;
}

/**
 * Ejecuta un comando CLI enviando opcionalmente datos por stdin de manera segura ante límites de buffers
 */
export function executeCliProcess(
  executable: string,
  args: string[],
  stdinInput?: string,
  timeoutMs = 60000
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let timedOut = false;

    const child = spawn(executable, args, {
      shell: process.platform === "win32",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGTERM");
        } catch {
          // Ignorar error al matar proceso
        }
        setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {
            // Ignorar
          }
        }, 500);
      }, timeoutMs);
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        return reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }
      return reject(err);
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        return reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }
      if (code !== 0 && stdout.trim().length === 0) {
        return reject(
          new Error(
            `CLI process exited with code ${code}. Stderr: ${stderr.trim() || "none"}`
          )
        );
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });

    if (stdinInput && child.stdin) {
      child.stdin.write(stdinInput, "utf-8");
      child.stdin.end();
    }
  });
}
