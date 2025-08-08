# Buddy Backend

Este es el servidor backend para la extensión Buddy, que genera preguntas automáticamente a partir de texto seleccionado por el usuario.

Tecnologías:
- Node.js
- Express
- API de OpenRouter

## Endpoint principal
`POST /generate-question`  
Envía un fragmento de texto y recibe una pregunta generada con IA.

## Ping
`GET /ping`  
Devuelve un mensaje para verificar que el servidor está activo.

Este backend está preparado para ser desplegado fácilmente en Render.com