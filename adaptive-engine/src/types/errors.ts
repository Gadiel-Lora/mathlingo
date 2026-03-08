// TIPOS DE ERROR - Taxonomía

export enum ErrorCategory {
  ARITHMETIC = "ARITHMETIC",      // Cálculo incorrecto
  CONCEPTUAL = "CONCEPTUAL",      // No entiende el concepto
  PROCEDURAL = "PROCEDURAL",      // Pasos mal ordenados
  NOTATIONAL = "NOTATIONAL",      // Símbolos incorrectos
  READING = "READING",            // Malinterpretó el problema
  UNKNOWN = "UNKNOWN"             // No clasificado
}

export enum ErrorSeverity {
  MINOR = "minor",
  MEDIUM = "medium",
  CRITICAL = "critical"
}

export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  confidence: number;              // 0-100
  reasoning: string;
  remediation: string;             // Recomendación de refuerzo
  detectedPatterns?: string[];     // Patrones específicos detectados
}

export type ErrorTaxonomy = Record<ErrorCategory, {
  id: string;
  name: string;
  description: string;
  examples: ErrorExample[];
  remediation: string;
  severity: ErrorSeverity;
}>;

export interface ErrorExample {
  problem: string;
  wrong: string;
  correct: string;
  concept?: string;
  missing?: string;
}
