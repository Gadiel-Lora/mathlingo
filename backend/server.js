import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

app.use(
  cors({
    origin: frontendOrigin,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)
app.use(express.json())

app.post('/api/ai-help', async (req, res) => {
  try {
    const question = String(req.body?.question ?? '').trim()
    const lessonContext = String(req.body?.lessonContext ?? '').trim()

    if (!question) {
      return res.status(400).json({ error: 'La pregunta es obligatoria.' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY no esta configurada en el backend.' })
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content: 'Eres un tutor experto en matematicas que explica paso a paso.',
        },
        {
          role: 'user',
          content: `Contexto de leccion:\n${lessonContext || 'Sin contexto'}\n\nPregunta:\n${question}`,
        },
      ],
    })

    const answer = completion.choices?.[0]?.message?.content?.trim()
    if (!answer) {
      return res.status(502).json({ error: 'No se recibio respuesta del modelo.' })
    }

    return res.json({ answer })
  } catch (error) {
    console.error('AI help error:', error)
    return res.status(500).json({ error: 'No se pudo generar la ayuda en este momento.' })
  }
})

app.listen(port, () => {
  console.log(`AI server running on port ${port}`)
})
