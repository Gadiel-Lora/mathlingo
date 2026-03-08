# EliteMath AI Tutor Layer

Capa conversacional y de tutoría inteligente para la plataforma EliteMath. Utiliza Ollama para proporcionar una experiencia de aprendizaje adaptativa, socrática y en español.

## Características Principales

1.  **Tutoría Conversacional (Chat):** Respuestas no deterministas siguiendo el método socrático (guía al estudiante con preguntas en lugar de dar la respuesta).
2.  **Explicaciones Personalizadas:** Adaptadas al nivel de dominio (mu, sigma) y al tipo de error detectado (Conceptual, Aritmético, Procedimental, etc.).
3.  **Sistema de Pistas Progresivas:** 3 niveles de ayuda (Sutil -> Dirección clara -> Casi solución).
4.  **Generador de Ejercicios:** Crea problemas matemáticos dinámicos y únicos basados en las debilidades del estudiante.
5.  **Estrategia Adaptativa:** Decide el tono, la profundidad y el enfoque de la tutoría basándose en señales (accuracy, consistency, velocity).

## Estructura del Proyecto

```
src/
├── types/           # Definiciones estrictas para AI, Contexto y Respuestas
├── config/          # Configuración de Ollama y Templates de Prompts
├── services/        # Cliente HTTP para Ollama
├── modules/         # Lógica de negocio segmentada
│   ├── ai-tutor.ts             # Orquestador principal
│   ├── prompt-builder.ts       # Ingeniería de prompts dinámicos
│   ├── explanation-engine.ts   # Generación de explicaciones
│   ├── hint-generator.ts       # Generación de pistas progresivas
│   ├── exercise-generator.ts   # Generación de ejercicios dinámicos
│   ├── strategy-engine.ts      # Selección de estrategia de tutoría
│   └── context-builder.ts      # Construcción del contexto del tutor
├── controllers/     # Controladores Express (REST API)
└── index.ts         # Punto de entrada del servidor
```

## Requisitos

- **Node.js** v18+
- **Ollama** instalado y corriendo localmente.
- Modelo **mistral** (o similar) descargado en Ollama.

## Configuración

1.  Instalar dependencias:
    ```bash
    npm install
    ```
2.  Configurar variables de entorno:
    ```bash
    cp .env.example .env
    ```
3.  Asegurarse de que Ollama esté corriendo:
    ```bash
    ollama serve
    ollama pull mistral
    ```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker
```bash
docker-compose up --build
```

## API Endpoints

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/ai-tutor/chat` | Chat conversacional con el tutor |
| `POST` | `/api/ai-tutor/explain` | Solicitar explicación de un problema |
| `POST` | `/api/ai-tutor/hint` | Solicitar pista progresiva |
| `POST` | `/api/ai-tutor/exercise` | Generar nuevo ejercicio de práctica |
| `POST` | `/api/ai-tutor/strategy` | Obtener estrategia de tutoría recomendada |

## Tests

El proyecto incluye una suite completa de pruebas unitarias con Jest.

```bash
npm test
npm run test:coverage
```

Cobertura actual: **>90%**
