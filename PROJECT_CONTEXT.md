# CONTEXTO MAESTRO EXPANDIDO
EliteMath App - Sistema Matematico Adaptativo de Alto Rendimiento

Ultima actualizacion: 2026-03-21

## 1) Definicion del producto

Aplicacion digital de matematica con:
- motor adaptativo por dominio,
- sistema de maestria probabilistico,
- evaluacion continua,
- analitica avanzada,
- gamificacion estructural,
- arquitectura API-first.

Comparables estructurales:
- Khan Academy,
- Photomath,
- Duolingo.

Enfoque diferencial:
- rigor matematico formal,
- trazabilidad por habilidad atomica,
- decisiones adaptativas guiadas por datos.

## 2) Arquitectura global del sistema

El sistema se organiza en 4 modulos troncales.

### Modulo A - Motor de Dominio Matematico

Estructura objetivo:
- DAG (grafo dirigido aciclico).
- Nodos = habilidades atomicas.
- Aristas = prerrequisitos.
- Pesos = complejidad estructural.

Estado actual:
- Implementado en `backend/academic/domainGraph.js`.
- Expone mapa de dominio por grado y estado de desbloqueo.
- Endpoint: `POST /api/academic/domain/map`.

Capacidades:
- visualizacion tipo mapa (data model listo para frontend),
- bloqueo por dependencia,
- base para recomendacion inteligente.

### Modulo B - Motor Adaptativo

Entradas objetivo:
- historial de respuestas,
- tiempo de resolucion,
- tipo de error,
- estabilidad,
- frecuencia de practica.

Salidas objetivo:
- proxima habilidad optima,
- tipo de ejercicio,
- dificultad sugerida,
- modo (practica/desafio/evaluacion).

Estado actual:
- Recomendacion adaptativa implementada en controller.
- Endpoint: `POST /api/academic/adaptive/recommendation`.
- Integra:
  - disponibilidad por DAG,
  - skills vencidas por retencion,
  - señales de rendimiento y estabilidad.

### Modulo C - Sistema de Evaluacion

Tipos objetivo:
- micro-evaluacion (5-10),
- evaluacion estandar,
- simulacro completo,
- diagnostico adaptativo.

Estado actual:
- Implementado en `backend/academic/evaluationEngine.js`.
- Endpoint: `POST /api/academic/evaluation/generate`.
- Examen final por grado se mantiene en:
  - `backend/academic/finalExamGenerator.js`
  - `POST /api/academic/final-exam/generate`.

Capacidades:
- blueprint configurable,
- control por mezcla de problemas,
- control por tipo de pregunta (indirecto por dificultad),
- dificultad por rango y por modo.

### Modulo D - Sistema de Analitica

Metricas objetivo:
- dominio global,
- dominio por rama,
- indice de abstraccion,
- tiempo promedio por skill,
- patron de error conceptual,
- curva de aprendizaje.

Estado actual:
- Implementado en `backend/academic/analyticsStore.js`.
- Endpoints:
  - `POST /api/academic/analytics/student`
  - `POST /api/academic/analytics/teacher`
  - `GET /api/academic/analytics/admin`
  - `GET /api/academic/analytics/ranking`

## 3) Capas adicionales (alto rendimiento)

### Capa de Errores Conceptuales

Categorias:
- aritmetico,
- algebraico-estructural,
- interpretacion,
- conceptual-profundo.

Estado actual:
- Implementado en `backend/academic/errorClassifier.js`.
- Se ejecuta en `POST /api/academic/question/submit`.
- Resultado devuelto en `errorClassification`.

### Capa de Gamificacion Estructural

Objetivo:
- XP por dificultad,
- nivel matematico real,
- logros por dominio,
- rachas estables,
- ranking por abstraccion.

Estado actual:
- XP y nivel adaptativo activos (`xpSystem.js`).
- Rachas y ranking de abstraccion integrados en analitica.
- Ranking endpoint disponible.

### Capa de Retencion y Recuperacion

Objetivo:
- spaced repetition,
- reapertura de skills olvidadas,
- indice de olvido temporal.

Modelo:
- decaimiento exponencial de dominio.

Estado actual:
- Implementado en `backend/academic/retentionEngine.js`.
- Endpoints:
  - `POST /api/academic/retention/profile`
  - `POST /api/academic/retention/due`
- Integrado en recomendaciones adaptativas.

### Capa de Modelo Predictivo

Objetivo:
- probabilidad de exito en evaluacion formal,
- probabilidad de dominio completo,
- nivel matematico proyectado.

Modelo base:
- regresion logistica (heuristica calibrable).

Estado actual:
- Implementado en `backend/academic/predictiveModel.js`.
- Endpoints:
  - `POST /api/academic/predictive/outcomes`
  - incluido dentro de `analytics/student`.

### Modulo E - AI Tutor Layer (2026-03-08)

Objetivo:
- Proporcionar tutoría conversacional socrática.
- Generar explicaciones adaptativas y pistas progresivas.
- Generar ejercicios dinámicos basados en debilidades.

Estado actual:
- Microservicio independiente en `ai-tutor/`.
- Integrado con Ollama (Mistral).
- Cobertura de tests: 89.4%.

Capacidades:
- **Tutoría Socrática**: Guía al estudiante mediante preguntas en lugar de respuestas directas.
- **Explicaciones Adaptativas**: Ajusta el lenguaje y profundidad según el dominio (mu, sigma) y el tipo de error.
- **Pistas Progresivas**: Sistema de 3 niveles (Sutil, Dirección, Casi-solución).
- **Generación Dinámica**: Crea problemas únicos alineados con el grafo de habilidades y el historial de errores.
- **Estrategia Adaptativa**: Decide el enfoque (Socrático, Guiado, Directo) basándose en señales de rendimiento.

## 4) Experiencia de usuario (UX funcional)

Pantallas clave objetivo:
- dashboard principal,
- mapa de dominio,
- sesion de practica,
- evaluacion formal,
- reporte de desempeno,
- historial de progreso.

Flujo base:
1. ingreso,
2. recomendacion automatica,
3. sesion adaptativa,
4. retroalimentacion inmediata,
5. actualizacion de dominio,
6. siguiente decision adaptativa.

Estado actual:
- Dashboard, Course, Lesson y Branch implementados.
- Integracion de mapa de dominio y paneles avanzados: pendiente de UI dedicada.

## 5) Modelo tecnico recomendado

Frontend:
- React (actual),
- posible extension a React Native/Flutter.

Backend:
- Node.js (motor academico actual),
- FastAPI (dominio legacy/certificados/migracion).

API:
- REST (actual),
- GraphQL opcional futuro.

Datos:
- Supabase para auth/progreso frontend,
- memoria en backend academico para estado temporal (actual),
- objetivo recomendado: PostgreSQL + Redis.

Grafo:
- Neo4j opcional futuro para trazabilidad avanzada de skills.

Motor adaptativo:
- servicio dedicado (en progreso, hoy esta embebido en backend academico).

## 6) Reglas fundamentales del sistema

1. Toda habilidad debe tener prerrequisitos.
2. Toda pregunta debe mapear a habilidad exacta.
3. No se desbloquea contenido sin maestria.
4. Dominio no es binario.
5. El sistema aprende del estudiante.
6. El estudiante no ve toda la estructura completa sin progreso.

Estado actual:
- reglas 1, 3, 4, 5 parcialmente implementadas,
- regla 2 fortalecida con `skillId` en envio de respuestas,
- regla 6 soportada por visibilidad del mapa.

## 7) Escalabilidad futura

El diseno debe permitir:
- nivel universitario,
- nivel olimpico,
- IA generativa de preguntas,
- tutor virtual ampliado,
- analisis de escritura matematica,
- reconocimiento de pasos.

Estado actual:
- arquitectura modular lista para extender por microservicios,
- pendiente persistencia durable y versionado de modelos adaptativos.

## 8) Objetivo tecnico definitivo

Construir una app matematica adaptativa con:
- motor de dominio estructural,
- evaluacion inteligente,
- analitica predictiva avanzada.

Cualidades exigidas:
- modular,
- escalable,
- API-ready,
- data-driven,
- matematicamente rigurosa,
- lista para produccion.

## 9) Instruccion para Codex (guia operativa)

Codex debe:
1. identificar modulos faltantes,
2. proponer mejoras estructurales,
3. optimizar modelo de datos,
4. sugerir arquitectura escalable,
5. detectar riesgos tecnicos,
6. proponer KPIs clave.

### KPIs propuestos (v1)

- Dominio global promedio (%).
- Dominio por rama (%).
- Precision por skill (rolling window).
- Tiempo promedio por skill (ms).
- Tasa de asistencia IA (% de intentos con ayuda).
- Tasa de retencion (skills con olvido bajo).
- Probabilidad media de exito en evaluacion formal.
- Probabilidad media de dominio completo.
- Indice de abstraccion promedio.
- Racha de estabilidad media.

## 10) Restriccion de IA (obligatoria)

No se usara OpenAI en el runtime academico.

Proveedor de IA habilitado:
- Ollama (local/self-hosted), con fallback local deterministico.

Archivo clave:
- `backend/academic/tutorAI.js`.

## 11) Profesor Virtual (chat unico)

Politica funcional activa:
- Se elimina la logica de dos botones de ayuda ("pista" y "solucion") para la experiencia principal.
- La ayuda se concentra en un chat unico: "Profesor Virtual".
- La IA responde en espanol, estilo conversacional y adaptable al contexto del estudiante.
- Se mantiene control academico deterministico para penalizacion XP y bloqueo.

Reglas academicas de chat:
1. Si el mensaje es de ayuda conceptual (ej.: "no entiendo", "guiame"):
   - no bloquea la pregunta,
   - aplica reduccion acumulada de XP en la pregunta (configurada en 10% por interaccion).
2. Si el estudiante pide respuesta final explicita (ej.: "dame la respuesta", "resuelvelo completo"):
   - la pregunta se bloquea,
   - XP de esa pregunta = 0.

Implementacion tecnica:
- Endpoint principal de chat: `POST /api/academic/question/chat`.
- Clasificacion de intencion: `backend/academic/tutorAI.js`.
- Estado/penalizacion/bloqueo por chat: `backend/academic/attemptManager.js`.
- Ajuste XP por ayuda en chat: `backend/academic/xpSystem.js`.
- UI chat profesor virtual: `frontend/src/pages/Lesson.jsx` y `frontend/src/components/questions/QuestionCard.jsx`.

## 12) Actualizacion UI/UX (2026-03-03)

Objetivo de la iteracion:
- eliminar el problema visual de "pantalla azul" en lecciones,
- modernizar la interfaz con una estetica mas tecnologica,
- aumentar contraste y variedad cromatica manteniendo tono elegante.

Correcciones funcionales aplicadas:
1. Se corrigio el orden de hooks en `frontend/src/pages/Lesson.jsx` para evitar fallas de render en la ruta de lecciones.
2. Se agrego estado de carga visible en `frontend/src/components/ProtectedRoute.jsx` para evitar pantalla vacia durante bootstrap de sesion.
3. Se reforzo el comportamiento de visibilidad base en `frontend/src/index.css` para que el contenido no dependa de animaciones.

Rediseno visual aplicado:
1. Nueva direccion visual global en `frontend/src/index.css` y `frontend/tailwind.config.js`:
   - fondo multicapa con profundidad,
   - tarjetas tipo glass/tech,
   - botones con gradientes y contraste reforzado,
   - acentos cian, coral, violeta, ambar y verde.
2. Rediseno de experiencia de leccion (`frontend/src/pages/Lesson.jsx`):
   - header tecnico de sesion,
   - bloque de progreso y modo,
   - layout principal + panel lateral de telemetria.
3. Rediseno de tarjeta de pregunta (`frontend/src/components/questions/QuestionCard.jsx`):
   - estados mas legibles,
   - visual de intentos con gradiente,
   - chat y feedback con estilos diferenciados.

Estado:
- Build frontend validado con `npm run build`.
- Lint frontend mantiene issues previos en hooks/context no introducidos en esta iteracion.

## 13) Actualizacion Curricular y UI Estatica (2026-03-04)

### Curriculo 2do Secundaria - IV Bimestre integrado

Se incorporo oficialmente en `curriculum/grades/grade2.js`:
- Area: `IV Bimestre - Ecuaciones, Inecuaciones y Modelacion Algebraica`.
- 4 unidades nuevas, cada una con 12 lecciones:
  - `ecuaciones-cuadraticas-metodos-resolucion`,
  - `inecuaciones-lineales-cuadraticas`,
  - `sistemas-ecuaciones-modelacion-avanzada`,
  - `integracion-algebraica-pensamiento-estrategico`.

Tambien se actualizo el objetivo global del grado para reflejar consolidacion algebraica anual.

### Examen final anual 2do (nivel elite)

Blueprint actualizado en `grade2.finalExam`:
- Nuevo id: `grade-2-final-exam-elite-anual`.
- Rango de preguntas: `30-40`.
- Secciones por integracion:
  - Integracion algebraica,
  - Funciones y sistemas,
  - Inecuaciones y dominio,
  - Modelacion avanzada.
- Distribucion por topics de II, III y IV bimestre (40 base para escalado).

Se agrego configuracion de modos:
- `standard` (30),
- `elite` (36),
- `extreme` (40, dificultad minima 10).

### Motor de examen final y API

Cambios en backend:
- `backend/academic/finalExamGenerator.js`:
  - soporte de `examMode`,
  - resolucion de `modeConfig`,
  - mezcla de problemas por modo,
  - ajuste de dificultad minima/boost por modo.
- `backend/controllers/academicController.js`:
  - endpoint `POST /api/academic/final-exam/generate` ahora acepta `examMode`.

### Alineacion de generacion de preguntas

En `backend/academic/questionEngine.js` se agregaron aliases para los nuevos `topicId` de II/III/IV bimestre, para enrutar a generadores canonicos estables y evitar fallback debil por coincidencia textual.

### Rediseño UI (solo visual, sin logica academica)

Se implemento un dashboard estatico modular en React, sin backend ni evaluacion:
- `frontend/src/components/dashboard/MathLingoDashboard.jsx`
- `frontend/src/components/dashboard/mathlingo-dashboard.css`
- vistas:
  - `JourneyView`,
  - `AutonomousView`,
  - `ReviewsView`,
  - `AchievementsView`,
  - `ProgressView`,
  - `ProfileView`.

Layout aplicado:
- sidebar izquierda fija,
- header superior,
- panel central dinamico por vista,
- panel derecho opcional en desktop.

Sidebar con opciones exactas:
- Recorrido, Autonomo, Repasos, Logros, Progreso, Perfil.

Estado:
- Implementacion UI es deliberadamente estatica (sin logica de negocio).

## 14) Generación de Grafo de Habilidades y Mapeo Curricular (2026-03-08)

### Grafo de Habilidades Canónico
Se unificaron y generaron grafos de dominio estructurados para:
- Aritmética, Álgebra, Geometría, Trigonometría, Probabilidad/Estadística, Cálculo, Lógica y Matemática Discreta.

Reglas aplicadas y validadas:
- Total: 355 habilidades, 561 aristas.
- Estructura: Grafo Dirigido Acíclico (DAG) puro, verificado algorítmicamente.
- Restricciones: Máximo 3 prerrequisitos por habilidad.
- Progresión de dificultad validada y dependencias cruzadas explícitas (ej. Fracciones -> Álgebra -> Geometría).

Archivos semilla generados en `scripts/seed`:
- `math_skills_graph.json`, `math_skill_edges.json`
- `skills_seed.sql`, `skill_edges_seed.sql`

### Mapeo Curricular (Lesson -> Skills)
Se generó un mapeo automatizado para conectar las 355 habilidades a los 512 slots de lecciones disponibles (Grados 5-12, 4 Bimestres, 4 Unidades, 4 Lecciones).

Reglas aplicadas y validadas:
- Dificultad escalonada por bloque de grado.
- Suavizado de dificultad inter e intra-unidad.
- Respeto estricto del orden topológico: ningún prerrequisito se enseña después de la habilidad dependiente.
- Repetición espaciada: cada habilidad se presenta entre 2 y 6 veces (1 primaria, resto como repaso/soporte).
- Capacidad: máximo 3 habilidades por lección.

Archivos semilla generados en `scripts/seed`:
- `lesson_skill_map_seed.json`, `lesson_skill_map_seed.sql`



## 15) AI Tutor Enhanced 2.0 y Refactor Lesson (2026-03-21)
- ai-tutor agrega learning-diagnostician, adaptive-coaching-engine y adaptive-path-recommender para diagnostico, coaching y rutas personalizadas.
- ai-controller expone nuevos endpoints para learning gaps, build profile, coaching feedback, tutoring strategy, personalized path y targeted practice.
- prompt-builder y config/prompts amplian prompts para diagnostico, perfiles, coaching, rutas personalizadas y practica focalizada.
- scripts/db/ai_tutor_schema.sql prepara persistencia PostgreSQL con student_learning_profiles y learning_diagnostics; el runtime actual sigue con stores en memoria.
- frontend/src/pages/Lesson.tsx reemplaza Lesson.jsx y la UI se modulariza en frontend/src/components/lesson con LessonView, AISidebar, ProblemArea, EditorModal, Navbar y LessonCompletionView.
- frontend/src/store/lessonStore.ts centraliza problema, respuesta, feedback, intentos, XP y chat IA con zustand, y frontend/src/types/lesson.ts junto a frontend/src/types/ai.ts agregan tipado dedicado.
- Los nuevos modulos del tutor quedan cubiertos por tests dedicados en ai-tutor/tests.
