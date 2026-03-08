import { ErrorTaxonomy, ErrorCategory, ErrorSeverity } from '../types/errors';

export const ERROR_TAXONOMY: ErrorTaxonomy = {
  [ErrorCategory.ARITHMETIC]: {
    id: "arithmetic",
    name: "Error Aritmético",
    description: "Cálculo incorrecto en operaciones básicas",
    examples: [
      {
        problem: "Calcula: 7 × 8",
        wrong: "54",
        correct: "56",
        concept: "Multiplicación"
      },
      {
        problem: "Suma: 15 + 23",
        wrong: "37",
        correct: "38"
      }
    ],
    remediation: "práctica_adicional_cálculo",
    severity: ErrorSeverity.MINOR
  },

  [ErrorCategory.CONCEPTUAL]: {
    id: "conceptual",
    name: "Error Conceptual",
    description: "No entiende el concepto subyacente",
    examples: [
      {
        problem: "Resuelve: 2x + 5 = 13",
        wrong: "2x + 5 = 13 → 2x = 8 → x = 16",
        correct: "2x + 5 = 13 → 2x = 8 → x = 4",
        concept: "Regla de división en ecuaciones",
        missing: "División de ambos lados"
      }
    ],
    remediation: "reexplicación_conceptual",
    severity: ErrorSeverity.CRITICAL
  },

  [ErrorCategory.PROCEDURAL]: {
    id: "procedural",
    name: "Error Procedimental",
    description: "Pasos mal ordenados o incompletos",
    examples: [
      {
        problem: "Factoriza: x² + 5x + 6",
        wrong: "x(x + 5 + 6)",
        correct: "(x + 2)(x + 3)",
        missing: "Patrón de factorización"
      }
    ],
    remediation: "revisión_pasos",
    severity: ErrorSeverity.MEDIUM
  },

  [ErrorCategory.NOTATIONAL]: {
    id: "notational",
    name: "Error Notacional",
    description: "Uso incorrecto de símbolos o notación",
    examples: [
      {
        problem: "Escribe: 1/2 + 1/4",
        wrong: "2/6",
        correct: "3/4",
        concept: "Suma de fracciones"
      }
    ],
    remediation: "revisión_notación",
    severity: ErrorSeverity.MINOR
  },

  [ErrorCategory.READING]: {
    id: "reading",
    name: "Error de Lectura",
    description: "Malinterpretó el enunciado",
    examples: [
      {
        problem: "Si compras 3 items a $5 cada uno, ¿cuánto gastas?",
        wrong: "$5",
        correct: "$15",
        concept: "Multiplicación en contexto"
      }
    ],
    remediation: "lectura_activa",
    severity: ErrorSeverity.MEDIUM
  },

  [ErrorCategory.UNKNOWN]: {
    id: "unknown",
    name: "Error Desconocido",
    description: "No se pudo clasificar el error",
    examples: [],
    remediation: "revisión_general",
    severity: ErrorSeverity.MEDIUM
  }
};
