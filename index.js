const express = require("express");
const cors = require("cors");
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
  const { text } = req.body;

  // Validación básica
  if (!text) {
    return res.status(400).json({
      error: "No text provided",
    });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({
      error: "OPENROUTER_API_KEY no está configurada en el servidor",
    });
  }

  const prompt = `
Genera UNA sola pregunta clara, concreta y desafiante para un estudiante universitario,
basada exclusivamente en el siguiente texto.
La pregunta debe fomentar la reflexión y la recuperación activa de la información.

Texto:
${text.slice(0, 1000)}

Pregunta:
`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "moonshotai/kimi-k2:free",
          messages: [
            {
              role: "system",
              content:
                "Eres un profesor universitario experto en aprendizaje activo y práctica de recuperación.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const rawResponse = await response.text();

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      return res.status(500).json({
        error: "La respuesta del modelo no es JSON válido",
        rawResponse,
      });
    }

    const question =
      data?.choices?.[0]?.message?.content ||
      "No se pudo generar la pregunta.";

    res.json({ question });

  } catch (error) {
    res.status(500).json({
      error: "Error generando la pregunta",
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
