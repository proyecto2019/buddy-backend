const express = require("express");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post("/generate-question", async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  const prompt = `Genera una sola pregunta desafiante y concreta para un estudiante universitario basada en el siguiente texto:\n\n${text.slice(0, 1000)}\n\nPregunta:`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2:free",
        messages: [
          {
            role: "system",
            content: "Eres un profesor universitario que formula preguntas desafiantes basadas en textos para ayudar a los estudiantes a estudiar activamente."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({ error: "Respuesta no válida desde el modelo." });
    }

    const question = data?.choices?.[0]?.message?.content || "No se pudo generar la pregunta.";
    res.json({ question });

  } catch (err) {
    res.status(500).json({ error: "Error generando la pregunta" });
  }
});

app.get("/ping", (_, res) => {
  res.json({ status: "ok", message: "Buddy backend activo" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor Buddy escuchando en puerto " + PORT);
});