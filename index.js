const express = require("express");
const cors = require("cors");

// node-fetch dinámico (como lo tenías)
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   CONFIG
========================= */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/* =========================
   ENDPOINTS
========================= */

// Ping para comprobar que el backend está activo
app.get("/ping", (req, res) => {
  res.json({
    status: "ok",
    message: "Buddy backend activo",
  });
});

// Generar pregunta (retrieval practice)
app.post("/generate-question", async (req, res) => {
  // LOG: qué llega realmente desde la extensión
  console.log("📩 BODY RECIBIDO:", req.body);

  // Acepta distintos nombres de campo por compatibilidad con la extensión
  const textRaw =
    req.body?.text ??
    req.body?.selectedText ??
    req.body?.selection ??
    req.body?.fragment ??
    req.body?.content ??
    "";

  const text = String(textRaw).trim();

  // Validación básica
  if (!text) {
    return res.status(400).json({
      error:
        "No text provided. Expected one of: text | selectedText | selection | fragment | content",
      receivedKeys: Object.keys(req.body || {}),
    });
  }

  // Evitar enviar cosas enormes (por estabilidad/coste)
  const MAX_CHARS = 2500;
  const textForModel = text.slice(0, MAX_CHARS);

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY no está configurada en el servidor",
    });
  }

  console.log("🔑 OPENROUTER_API_KEY existe:", Boolean(OPENROUTER_API_KEY));
  console.log("🧠 TEXTO (primeros 120 chars):", textForModel.slice(0, 120));
  console.log("🧠 LONGITUD TEXTO:", textForModel.length);

  const prompt = `
Read the following text carefully.

First, identify the language of the selected text.

Generate ONE clear, specific, and challenging question for a university student based exclusively on the selected text.

Requirements:
- The question MUST be written in exactly the same language as the selected text.
- Never translate the selected text.
- Never translate the generated question.
- The question should promote reflection and retrieval practice.
- Do not include the answer.
- Do not include lists.
- Return only one question.

Selected text:
${textForModel}

Question:
`.trim();

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          // Recomendados por OpenRouter
          "HTTP-Referer": "https://buddy-backend-ixr8.onrender.com",
          "X-Title": "Buddy Retrieval Practice",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
           {
  role: "system",
  content:
    "You are a university professor specialized in active learning and retrieval practice. Detect the language of the selected text and always generate the question in exactly the same language. Never translate the selected text or the generated question.",
},
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 120,
        }),
      }
    );

    // Leer respuesta como texto para poder diagnosticar JSON inválido
    const rawResponse = await response.text();

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("❌ Respuesta NO JSON de OpenRouter:", rawResponse);
      return res.status(502).json({
        error: "La respuesta del modelo no es JSON válido",
        status: response.status,
        rawResponse,
      });
    }

    // Si OpenRouter responde con error (por ejemplo 401/429/etc.)
    if (!response.ok) {
      console.error("❌ OpenRouter error:", response.status, data);
      return res.status(502).json({
        error: "OpenRouter devolvió un error",
        status: response.status,
        details: data,
      });
    }

    const question =
      data?.choices?.[0]?.message?.content?.trim() ||
      "No se pudo generar la pregunta.";

    return res.json({ question });
  } catch (error) {
    console.error("❌ Error generando la pregunta:", error);

    // Fallback para que la demo/taller NUNCA se caiga
    const fallbackQuestion =
      "¿Cuál es la idea principal del fragmento y qué frase del texto la respalda?";

    return res.json({
      question: fallbackQuestion,
      fallback: true,
      error: "Error generando la pregunta con IA",
      details: String(error),
    });
  }
});

/* =========================
   SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor Buddy escuchando en puerto ${PORT}`);
});

