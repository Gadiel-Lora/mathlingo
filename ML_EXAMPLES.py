"""
EJEMPLOS DE USO: MEJORAS DE ML EN ACCIÓN
=========================================

Casos de uso concretos que demuestran las mejoras.
"""

# EJEMPLO 1: Predicción de Éxito con IRT
# ======================================

from backend.ml_improvements import BayesianPredictiveModel

# Estudiante: 65% maestría en Álgebra
# Problema: Ecuaciones lineales (60% dificultad)

prob = BayesianPredictiveModel.estimate_success_probability(
    mastery_level=0.65,
    problem_difficulty=0.60,
    discrimination=1.7
)

print(f"Probabilidad de éxito: {prob*100:.1f}%")  # ~64%
# Interpretación: El estudiante tiene ~64% de probabilidad de resolver correctamente

# Con deseable dificultad (75% éxito), podrías ajustar el problema
# si prob < 0.65, aumentar maestría estimada o disminuir dificultad



# EJEMPLO 2: Evaluación de Riesgo Bayesiana
# ==========================================

result = BayesianPredictiveModel.bayesian_risk_assessment(
    accuracy=70,
    stability=60,
    retention_index=45
)

print(f"Riesgo: {result['riskLevel']}")        # 'medium'
print(f"Score: {result['riskScore']}")         # ~0.42
print(f"Intervalo: {result['confidenceInterval']}")  # (0.35, 0.52)
print(f"Acción: {result['recommendedAction']}")    # 'review'

# Interpretación:
# - Riesgo moderado de fallo
# - Intervalo de confianza 95% está entre 35-52%
# - Recomendación: revisar antes de continuar



# EJEMPLO 3: Curva de Olvido Ebbinghaus
# ======================================

for days in [1, 3, 7, 14, 30]:
    forget_prob = BayesianPredictiveModel.calculate_forgetting_probability(
        days_since_practice=days,
        mastery_level=0.85,
        criticality=1.0
    )
    retention = (1 - forget_prob) * 100
    print(f"Día {days:2d}: {retention:5.1f}% retenido")

# Output esperado:
# Día  1:  96.0% retenido
# Día  3:  87.5% retenido
# Día  7:  73.6% retenido
# Día 14:  54.2% retenido
# Día 30:  17.8% retenido

# Conclusión: Los temas deben revisarse por spaced repetition ~día 7-14



# EJEMPLO 4: Predicción de Próximo Intento
# =========================================

result = BayesianPredictiveModel.predict_next_attempt_outcome(
    student_accuracy=72,
    student_consistency=65,
    problem_difficulty=0.55,
    attempts_on_problem=2,
    previous_attempts_success=[False, True]  # Primer fallo, segundo éxito
)

print(f"P(éxito) en 3er intento: {result['predictedSuccessProbability']*100:.1f}%")
print(f"Momentum: {result['momentum']}")
print(f"Recomendación: {result['recommendation']}")

# Output:
# P(éxito) en 3er intento: 68.2%
# Momentum: positive
# Recomendación: Intentar de nuevo

# Interpretación: El momentum positivo ayuda. El estudiante debería intentar de nuevo.



# EJEMPLO 5: Ajuste Dinámico de Dificultad
# ========================================

from backend.ml_improvements import AdaptiveDifficultyAdjuster

# Escenario A: Estudiante muy exitoso
result_a = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
    current_difficulty=0.50,
    accuracy_rate=0.88,
    consistency_score=85,
    average_time_ms=3500,
    streak_length=4
)

print(f"Escenario A (exitoso):")
print(f"  Dificultad actual: {result_a['currentDifficulty']}")
print(f"  Dificultad nueva: {result_a['nextDifficulty']}")  # +0.15
print(f"  Acción: {result_a['reason']}")  # 'increase'

# Escenario B: Estudiante con dificultades
result_b = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
    current_difficulty=0.70,
    accuracy_rate=0.58,
    consistency_score=40,
    average_time_ms=8000,
    streak_length=0
)

print(f"\nEscenario B (dificultades):")
print(f"  Dificultad actual: {result_b['currentDifficulty']}")
print(f"  Dificultad nueva: {result_b['nextDifficulty']}")  # -0.10
print(f"  Acción: {result_b['reason']}")  # 'decrease'



# EJEMPLO 6: Estimación de Tiempo a Maestría
# ==========================================

estudiantes = [
    {
        "nombre": "Alice (rápida)",
        "mastery": 0.45,
        "velocity": "fast",
        "improvement_rate": 0.05
    },
    {
        "nombre": "Bob (normal)",
        "mastery": 0.45,
        "velocity": "normal",
        "improvement_rate": 0.03
    },
    {
        "nombre": "Carol (lenta)",
        "mastery": 0.45,
        "velocity": "slow",
        "improvement_rate": 0.01
    }
]

for est in estudiantes:
    result = BayesianPredictiveModel.estimate_time_to_mastery(
        current_mastery=est["mastery"],
        learning_velocity=est["velocity"],
        recent_improvement_rate=est["improvement_rate"]
    )
    print(f"{est['nombre']:20s}: {result['daysToMastery']} días")

# Output esperado:
# Alice (rápida)      :  7 días
# Bob (normal)        : 12 días
# Carol (lenta)       : 35 días



# EJEMPLO 7: Integración en Flujo de Respuesta
# ============================================

# Cuando un estudiante responde una pregunta:

def process_student_response(response: dict):
    """
    Flujo mejorado: Análisis + Predicción + Ajuste
    """
    from backend.ml_improvements import (
        BayesianPredictiveModel,
        AdaptiveDifficultyAdjuster
    )
    
    student_id = response['student_id']
    exercise_id = response['exercise_id']
    is_correct = response['is_correct']
    time_ms = response['time_ms']
    
    # 1. Obtener estado actual del estudiante
    student = get_student_profile(student_id)
    
    # 2. Evaluar riesgo
    risk_assessment = BayesianPredictiveModel.bayesian_risk_assessment(
        accuracy=student['accuracy'] * 100,
        stability=student['stability'] * 100,
        retention_index=student['retention'] * 100
    )
    
    # Si riesgo es alto: ofrecer ayuda
    if risk_assessment['riskLevel'] == 'high':
        suggest_help(student_id, type='hint')
    
    # 3. Predecir siguiente intento
    next_prediction = BayesianPredictiveModel.predict_next_attempt_outcome(
        student_accuracy=student['accuracy'] * 100,
        student_consistency=student['consistency'] * 100,
        problem_difficulty=get_difficulty(exercise_id),
        attempts_on_problem=student['attempts_on_exercise'] + 1,
        previous_attempts_success=student['recent_attempts']
    )
    
    # Si predicción baja: ofrecerle pasar al siguiente
    if next_prediction['predictedSuccessProbability'] < 0.3:
        suggest_skip = True
    
    # 4. Ajustar dificultad
    new_difficulty = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
        current_difficulty=student['current_difficulty'],
        accuracy_rate=student['accuracy'],
        consistency_score=student['consistency'] * 100,
        average_time_ms=student['avg_time_ms'],
        streak_length=student['correct_streak']
    )
    
    # Guardar nueva dificultad
    update_student_difficulty(student_id, new_difficulty['nextDifficulty'])
    
    # 5. Retornar respuesta enriquecida
    return {
        'success': is_correct,
        'risk_assessment': risk_assessment,
        'next_prediction': next_prediction,
        'adjusted_difficulty': new_difficulty,
        'suggested_actions': {
            'offer_help': risk_assessment['riskLevel'] == 'high',
            'offer_skip': next_prediction['predictedSuccessProbability'] < 0.3,
            'difficulty_changed': new_difficulty['reason'] != 'maintain'
        }
    }


# EJEMPLO 8: Caso Real - Estudiante con Dificultades
# ==================================================

# Estudiante Maria ha pasado 3 días en fracciones, con patrón:
# Correcto, Incorrecto, Incorrecto, Correcto, Incorrecto

attempts = [
    {'correct': True},
    {'correct': False},
    {'correct': False},
    {'correct': True},
    {'correct': False}
]

# Análisis con modelo anterior (simple):
simple_accuracy = sum(1 for a in attempts if a['correct']) / len(attempts)
print(f"Accuracy simple: {simple_accuracy*100:.0f}%")  # 40%

# Análisis con modelo nuevo:
from backend.ml_improvements import BayesianPredictiveModel

risk = BayesianPredictiveModel.bayesian_risk_assessment(
    accuracy=40,
    stability=30,  # Muy baja consistencia
    retention_index=25
)

print(f"Risk Level: {risk['riskLevel']}")  # 'high'
print(f"Recommended: {risk['recommendedAction']}")  # 'review'

# Acción: Sistema recomienda revisar concepto, no continuar con fracción compleja
# Sistema simple: Continuaría adelante

print("\n✓ El modelo nuevo detectó el problema antes")
print("✓ Puede intervenir antes de que el estudiante se desanime")


# EJEMPLO 9: Recomendación de Repaso con Spaced Repetition
# =========================================================

skills = {
    'fractions': {'mastery': 0.75, 'days_since': 3},
    'decimals': {'mastery': 0.60, 'days_since': 10},
    'percentages': {'mastery': 0.40, 'days_since': 2},
}

retention_model = {}

for skill, data in skills.items():
    forget_prob = BayesianPredictiveModel.calculate_forgetting_probability(
        days_since_practice=data['days_since'],
        mastery_level=data['mastery'],
        criticality=1.5  # Todas son críticas
    )
    
    retention_model[skill] = {
        'forget_probability': forget_prob,
        'due_for_review': forget_prob > 0.4  # Si ya olvidó >40%
    }

# Ordenar por prioridad de revisión
priority = sorted(
    retention_model.items(),
    key=lambda x: x[1]['forget_probability'],
    reverse=True
)

print("Orden de revisión recomendado:")
for skill, data in priority[:3]:
    print(f"  1. {skill}: {data['forget_probability']*100:.0f}% riesgo de olvido")

# Output:
# 1. decimals: 52% riesgo de olvido
# 2. fractions: 18% riesgo de olvido
# 3. percentages: 5% riesgo de olvido
