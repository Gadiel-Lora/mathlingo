export interface FraudCheckRequest {
  studentId: string
  problemId: string
  attempt: string
  attemptHistory: string[]
  expectedAnswer: string
}

export interface FraudCheckResponse {
  isFraud: boolean
  confidence: number
  reason: string
}

const normalize = (value: string) => value.replace(/\s+/g, '').trim().toLowerCase()

export const detectFraud = async (req: FraudCheckRequest): Promise<FraudCheckResponse> => {
  console.log('Validating attempt for fraud:', req.attempt)
  
  // Rule 1: Idéntica a previo
  if (req.attemptHistory.includes(normalize(req.attempt))) {
    return {
      isFraud: true,
      confidence: 1.0,
      reason: "Estás intentando enviar exactamente la misma respuesta incorrecta anterior."
    }
  }
  
  // Rule 2: Es la respuesta esperada literal (copiada de la DB de alguna forma rápida)
  // This rule is tricky because if it is correct, it's correct. 
  // But a real anti-fraud system checks time taken or copy-paste events.
  // We'll mock that the AI detects "suspiciously fast" correct answers if attempt history is completely empty 
  // and time taken is < 2s. We'll handle time in the store instead.

  // Rule 3: Respuestas estilo "Calculadora"
  const suspiciousKeywords = ['respuesta:', 'paso 1:', 'wolfram', 'pasos']
  if (suspiciousKeywords.some(kw => req.attempt.toLowerCase().includes(kw))) {
    return {
      isFraud: true,
      confidence: 0.9,
      reason: "La respuesta fue copiada de otra plataforma."
    }
  }

  // Else, all good
  return {
    isFraud: false,
    confidence: 0,
    reason: ""
  }
}
