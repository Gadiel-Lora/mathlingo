import { create } from 'zustand'
import { ChatMessage, StudentProfile, QuestionType } from '../types/ai'

interface AIState {
  sidebarOpen: boolean
  chatHistory: ChatMessage[]
  currentConversationId: string
  studentProfile: StudentProfile | null
  
  // Hint State (P5-P10)
  levelRequested: 0 | 1 | 2
  hasAskedLevel1: boolean
  hasAskedLevel2: boolean
  hasAskedExplanation: boolean

  language: 'es' | 'en'

  // Actions
  toggleSidebar: () => void
  addMessage: (msg: ChatMessage) => void
  loadConversationHistory: (problemId: string) => Promise<void>
  clearHistory: () => void
  loadStudentProfile: (studentId: string) => Promise<void>
  classifyQuestion: (question: string) => QuestionType
  requestHint: (level: 1 | 2) => Promise<void>
  requestExplanation: () => Promise<void>
  requestFollowUpProblem: () => Promise<void>
  requestStrategies: () => Promise<void>
  setLanguage: (lang: 'es' | 'en') => void
}

export const useAIStore = create<AIState>((set, get) => ({
  sidebarOpen: false,
  chatHistory: [],
  currentConversationId: '',
  studentProfile: null,

  levelRequested: 0,
  hasAskedLevel1: false,
  hasAskedLevel2: false,
  hasAskedExplanation: false,

  language: 'es',

  setLanguage: (lang) => set({ language: lang }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  addMessage: (msg: ChatMessage) => {
    set((state) => ({
      chatHistory: [...state.chatHistory, msg]
    }))
  },

  loadConversationHistory: async (problemId: string) => {
    // Mock future DB call
    console.log(`Loading history for ${problemId}`)
    set({ chatHistory: [], currentConversationId: `conv-${problemId}` })
  },

  clearHistory: () => set({ chatHistory: [] }),

  loadStudentProfile: async (studentId: string) => {
    // Mock: P3 AI knows who you are
    const profile: StudentProfile = {
      studentId,
      name: "Juan",
      gradeLevel: 7,
      learningStyle: "visual",
      masteredSkills: [
        { skillId: "add", mastery: 100 },
        { skillId: "subtract", mastery: 95 }
      ],
      inProgressSkills: [
        { skillId: "fractions-basic", mastery: 65, errors: ["común denominador", "simplificar"] }
      ],
      commonErrors: [
        { type: "PROCEDURAL", description: "Olvida cambiar de lado cuando resuelve ecuaciones" }
      ]
    }
    set({ studentProfile: profile })
  },

  classifyQuestion: (question: string): QuestionType => {
    // P4 Scope Classification logic
    if (question.match(/^solve|^calculate|^what is|^dame la respuesta|^cu[áa]l es|^resuelve/i)) {
      return 'direct_request'
    }
    if (question.match(/how do|why|explain|c[óo]mo|por qu[ée]|explica/i)) {
      return 'conceptual'
    }
    if (question.match(/different|alternative|another way|diferente|alternativa|otra forma/i)) {
      return 'strategy'
    }
    return 'general_math'
  },

  requestHint: async (level: 1 | 2) => {
    const { hasAskedLevel1, hasAskedLevel2, addMessage } = get()
    
    if (level === 1 && !hasAskedLevel1) {
      addMessage({
        id: Math.random().toString(36).substring(7),
        studentId: get().studentProfile?.studentId || 'unknown',
        problemId: 'prob',
        role: 'ai',
        content: '¿Qué operación necesitas hacer primero? Piensa en los denominadores.',
        timestamp: new Date(),
        messageType: 'hint_l1'
      })
      set({ levelRequested: 1, hasAskedLevel1: true })
      return
    }

    if (level === 2) {
      if (!hasAskedLevel1) {
        // Enforce sequential check logic
        console.warn("Lógica secuencial estricta: No se permite saltar de L0 a L2 directo")
        return
      }
      
      const hintContent = hasAskedLevel2
        ? 'Pista adicional: Fíjate únicamente en los números de arriba (los numeradores). Si tienes 3 quintos y agregas 1 quinto adicional, ¿cuántos quintos te quedan en total?'
        : 'Primero suma los numeradores. Luego mantén el denominador tal como está. ¿Cuál sería el resultado final?'

      addMessage({
        id: Math.random().toString(36).substring(7),
        studentId: get().studentProfile?.studentId || 'unknown',
        problemId: 'prob',
        role: 'ai',
        content: hintContent,
        timestamp: new Date(),
        messageType: 'hint_l2'
      })
      set({ levelRequested: 2, hasAskedLevel2: true })
      return
    }
  },

  requestExplanation: async () => {
    const { addMessage, studentProfile, language } = get()
    set({ hasAskedExplanation: true })
    const style = studentProfile?.learningStyle || 'visual'
    const grade = studentProfile?.gradeLevel || 7
    
    // P14/P12 Adaptation: vocabulary by grade and style
    const isSimple = grade < 5
    const visualTextEs = isSimple 
      ? 'Mira los dibujitos, están cortados en pedazos distintos.' 
      : 'Fíjate en estos dos gráficos, están divididos distinto.'
    const visualTextEn = isSimple 
      ? 'Look at the pictures, they are cut into different pieces.' 
      : 'Look at these two charts, they are divided differently.'

    const steps = [
      {
        title: language === 'en' ? "Identify denominators" : "Identifica denominadores",
        description: style === 'visual' 
          ? (language === 'en' ? visualTextEn : visualTextEs)
          : (language === 'en' ? "Listen: thirds and fifths are different." : "Escucha la palabra: ter-cios y quin-tos son diferentes familiares.")
      },
      {
        title: language === 'en' ? "Find the LCM" : "Encuentra el MCM",
        description: language === 'en' ? "Choose the least common multiple to convert them." : "Elige el mínimo común múltiplo para convertirlos a la misma unidad base."
      },
      {
        title: language === 'en' ? "Add the numerators" : "Suma los numeradores",
        description: language === 'en' ? "Now that they are cut equally, just add them directly." : "Ahora que están cortados igual, es tan simple como sumar directamente.",
        equation: "\\frac{3}{15} + \\frac{5}{15} = \\frac{8}{15}"
      }
    ]

    addMessage({
      id: Math.random().toString(36).substring(7),
      studentId: studentProfile?.studentId || 'unknown',
      problemId: 'prob',
      role: 'ai',
      content: steps,
      timestamp: new Date(),
      messageType: 'explanation'
    })
  },

  requestFollowUpProblem: async () => {
    const { addMessage, studentProfile, language } = get()
    
    // P18: Trigger 10% chance of generating a brand new custom problem 
    // tailored to student's weaknesses and gradeLevel
    const isCustom = Math.random() < 0.1
    
    const similarProblem = isCustom ? {
      id: "prob-custom-1",
      title: language === 'en' ? "Custom Challenge ✨" : "Desafío Especial ✨",
      content: [
        { type: "text", value: language === 'en' ? "Let's try a tricky one based on your profile!" : "¡Intentemos uno diseñado especialmente para ti!" },
        { type: "equation", value: "\\frac{2}{7} + \\frac{4}{7}" }
      ],
      expectedAnswer: "6/7",
      skillId: "fractions-advanced"
    } : {
      id: "prob-sim-1",
      title: language === 'en' ? "Similar Practice" : "Práctica similar",
      content: [
        { type: "text", value: language === 'en' ? "Try solving this based on what we learned:" : "Intenta resolver esta operación basándote en lo que aprendimos:" },
        { type: "equation", value: "\\frac{1}{4} + \\frac{2}{4}" }
      ],
      expectedAnswer: "3/4",
      skillId: "fractions-basic"
    }

    addMessage({
      id: Math.random().toString(36).substring(7),
      studentId: studentProfile?.studentId || 'unknown',
      problemId: similarProblem.id,
      role: 'ai',
      content: similarProblem,
      timestamp: new Date(),
      messageType: 'exercise'
    })
  },

  requestStrategies: async () => {
    const { addMessage, language, studentProfile } = get()
    
    const strategies = language === 'en' 
      ? "Here are 3 distinct strategies to approach this problem:\n\n1. **Visual Method:** Draw rectangles and divide them to represent the fractions.\n2. **Algebraic Method:** Use the Least Common Multiple (LCM) on the denominators.\n3. **Decimal Method:** Convert the fractions to decimals, add them, and convert back if needed."
      : "Aquí tienes 3 estrategias distintas para resolver este problema:\n\n1. **Método Visual:** Dibuja rectángulos, divídelos en las partes del denominador y pinta los numeradores.\n2. **Método Algebraico:** Busca el Mínimo Común Múltiplo (MCM) de los denominadores para unificarlos.\n3. **Método Decimal:** Convierte las fracciones a números decimales dividiendo, súmalos y conviértelo de vuelta a fracción."

    addMessage({
      id: Math.random().toString(36).substring(7),
      studentId: studentProfile?.studentId || 'unknown',
      problemId: 'prob-strat',
      role: 'ai',
      content: strategies,
      timestamp: new Date(),
      messageType: 'general'
    })
  }

}))
