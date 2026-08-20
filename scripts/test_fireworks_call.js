/**
 * scripts/test_fireworks_call.js
 * Script de diagnóstico aislado para verificar la conectividad con Fireworks AI y Qwen 3.7 Plus
 * pattern-ai-core
 */

import "dotenv/config";

async function runDiagnostics() {
  console.log("===============================================================");
  console.log("pattern-ai-core — Diagnóstico de Conectividad con Fireworks AI");
  console.log("===============================================================\n");

  const apiKey = (process.env.FIREWORKS_API_KEY || "").trim();
  const model = (process.env.FIREWORKS_MODEL || "accounts/fireworks/models/qwen3p7-plus").trim();
  const rawBaseUrl = (process.env.FIREWORKS_BASE_URL || "https://api.fireworks.ai/inference/v1").trim();
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");

  console.log(`[Configuración]`);
  console.log(`• Base URL: ${baseUrl}`);
  console.log(`• Modelo:   ${model}`);
  console.log(`• API Key:  ${apiKey ? apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4) : "(NO CONFIGURADA)"}\n`);

  if (!apiKey || apiKey === "tu_fireworks_api_key_aqui") {
    console.error("[ERROR CRÍTICO] FIREWORKS_API_KEY no está configurada o contiene el placeholder por defecto.");
    console.error("Por favor define una clave válida en tu archivo .env: FIREWORKS_API_KEY=fw_tu_api_key");
    process.exit(1);
  }

  const maxTokens = process.env.FIREWORKS_MAX_TOKENS ? Number(process.env.FIREWORKS_MAX_TOKENS) : 3500;

  const endpoint = `${baseUrl}/chat/completions`;
  const payload = {
    model: model,
    max_tokens: maxTokens,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a master technical fashion designer and pattern maker. Respond ONLY with a valid JSON object containing: concept_name, base_block, ease, modifications, notions, estimated_fabric_meters."
      },
      {
        role: "user",
        content: "Generate parametric pattern DNA for a streetwear boxy crop top with crew neck."
      }
    ]
  };

  console.log(`[1/2] Enviando petición POST a ${endpoint}...`);
  const startTime = performance.now();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`\n[FALLO EN LA RESPUESTA] HTTP ${response.status} ${response.statusText}`);
      console.error(`• Cuerpo del error: ${errorText}`);

      let diagnosis = "Error no especificado por el servidor.";
      if (response.status === 401) {
        diagnosis = "Autenticación fallida. La API Key provista es inválida, expiró o no tiene permisos.";
      } else if (response.status === 404) {
        diagnosis = `El recurso o modelo '${model}' no fue encontrado en el endpoint '${baseUrl}'.`;
      } else if (response.status === 400 || response.status === 422) {
        diagnosis = "Parámetros de solicitud rechazados por la API. Revisa el formato del payload o compatibilidad del modelo.";
      } else if (response.status === 429) {
        diagnosis = "Límite de tasa (Rate limit) o cuota de créditos excedida en la cuenta de Fireworks AI.";
      } else if (response.status >= 500) {
        diagnosis = "Error interno en los servidores de Fireworks AI.";
      }

      console.error(`\n[Diagnóstico Técnico]: ${diagnosis}\n`);
      process.exit(1);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content || choice?.text || "";

    // Limpieza de posibles tags <think> y markdown ```json ... ```
    let cleanContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    const codeBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
    }

    let parsedJson = null;
    try {
      parsedJson = JSON.parse(cleanContent);
    } catch {
      // Si hay texto envolvente, buscar llaves { }
      const firstBrace = cleanContent.indexOf("{");
      const lastBrace = cleanContent.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsedJson = JSON.parse(cleanContent.substring(firstBrace, lastBrace + 1));
        } catch {
          parsedJson = null;
        }
      }
    }

    const usage = data.usage || {};

    console.log("\n[OK] Fireworks API Conectada Exitosamente");
    console.log(`• Modelo Efectivo: ${data.model || model}`);
    console.log(`• Latencia:        ${latencyMs} ms`);
    console.log(`• Consumo Tokens:  Prompt: ${usage.prompt_tokens ?? "N/A"} | Completion: ${usage.completion_tokens ?? "N/A"} | Total: ${usage.total_tokens ?? "N/A"}`);
    console.log(`• Finish Reason:   ${choice?.finish_reason || "unknown"}`);
    console.log("\n[Extracto del JSON Devuelto]:");
    if (parsedJson) {
      console.log(JSON.stringify(parsedJson, null, 2));
    } else {
      console.log(cleanContent.substring(0, 500) + (cleanContent.length > 500 ? "..." : ""));
    }

    console.log("\n===============================================================");
    console.log("Diagnóstico Finalizado con Éxito (Status: PASS)");
    console.log("===============================================================");
  } catch (netErr) {
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);
    console.error(`\n[ERROR DE RED O CONEXIÓN] después de ${latencyMs} ms:`);
    console.error(netErr instanceof Error ? netErr.message : String(netErr));
    console.error("\n[Diagnóstico Técnico]: No se pudo establecer conexión TCP/TLS con el host. Verifica tu conexión a internet o configuración de DNS/Proxy.");
    process.exit(1);
  }
}

runDiagnostics();
