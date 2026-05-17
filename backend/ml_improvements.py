"""
MEJORAS AL MODELO PREDICTIVO PYTHON
====================================

Reemplaza funciones simples en academic.py con modelos más sofisticados.
"""

from typing import Any
from math import exp, sqrt, log


class BayesianPredictiveModel:
    """
    Modelo predictivo mejorado basado en actualización Bayesiana.
    Reemplaza: _predictive_payload() en academic.py
    """

    @staticmethod
    def estimate_success_probability(
        mastery_level: float,      # 0-1
        problem_difficulty: float, # 0-1
        discrimination: float = 1.7
    ) -> float:
        """
        Utiliza Item Response Theory para estimar P(éxito).
        
        Modelo logístico:
        P(θ) = 1 / (1 + e^(-a(θ-b)))
        
        Args:
            mastery_level: estimación de habilidad del estudiante
            problem_difficulty: dificultad del problema
            discrimination: parámetro IRT (cuán bien discrimina)
        
        Returns:
            Probabilidad de éxito en [0, 1]
        """
        theta = mastery_level - problem_difficulty
        exponent = -discrimination * theta
        probability = 1.0 / (1.0 + exp(exponent))
        return round(probability, 4)

    @staticmethod
    def bayesian_risk_assessment(
        accuracy: float,          # 0-100
        stability: float,         # 0-100
        retention_index: float,   # 0-100
        confidence_level: float = 0.95
    ) -> dict[str, Any]:
        """
        Calcula riesgo de fallo combinando múltiples factores.
        
        Usa combinación ponderada Bayesiana con intervalos de confianza.
        
        Returns:
            {
                'riskScore': float,        # 0-1
                'riskLevel': str,          # 'low', 'medium', 'high'
                'confidenceInterval': (lower, upper),
                'confidence': float        # 0-100
            }
        """
        # Convertir a escala 0-1
        acc_normalized = accuracy / 100.0
        stab_normalized = stability / 100.0
        ret_normalized = retention_index / 100.0

        # Componentes de riesgo (inverso de factores positivos)
        accuracy_risk = (1.0 - acc_normalized) * 0.40
        stability_risk = (1.0 - stab_normalized) * 0.35
        retention_risk = (1.0 - ret_normalized) * 0.25

        # Riesgo combinado
        base_risk = accuracy_risk + stability_risk + retention_risk

        # Varianza del riesgo (incertidumbre)
        variance = (
            (0.40 ** 2) * acc_normalized * (1 - acc_normalized) +
            (0.35 ** 2) * stab_normalized * (1 - stab_normalized) +
            (0.25 ** 2) * ret_normalized * (1 - ret_normalized)
        )
        std_error = sqrt(variance)

        # Intervalo de confianza
        z_score = 1.96 if confidence_level == 0.95 else 2.576 if confidence_level == 0.99 else 1.645
        margin_of_error = z_score * std_error

        lower = max(0.0, base_risk - margin_of_error)
        upper = min(1.0, base_risk + margin_of_error)

        # Clasificar nivel de riesgo
        if base_risk >= 0.7:
            risk_level = "high"
        elif base_risk >= 0.4:
            risk_level = "medium"
        else:
            risk_level = "low"

        return {
            "riskScore": round(base_risk, 4),
            "riskLevel": risk_level,
            "confidenceInterval": (round(lower, 4), round(upper, 4)),
            "confidence": round((1 - std_error) * 100, 1),
            "expectedMastery": round(stab_normalized * 0.7 + acc_normalized * 0.3, 4),
            "recommendedAction": "review" if base_risk >= 0.4 else "advance"
        }

    @staticmethod
    def calculate_forgetting_probability(
        days_since_practice: int,
        mastery_level: float,
        criticality: float = 1.0,
        strength_of_memory: int = 14  # días (Ebbinghaus default)
    ) -> float:
        """
        Estima probabilidad de olvidar usando curva de Ebbinghaus.
        
        R(t) = e^(-t/S)
        
        Args:
            days_since_practice: días desde última práctica
            mastery_level: nivel de maestría (0-1)
            criticality: factor de importancia (1.0 = normal, 2.0 = crítico)
            strength_of_memory: parámetro Ebbinghaus (días)
        
        Returns:
            Probabilidad de olvidar en [0, 1]
        """
        # Ajustar força de memoria por maestría
        # Mayor maestría = mejor retención
        adjusted_strength = strength_of_memory * (1 + mastery_level)

        # Ebbinghaus: R(t) = e^(-t/S)
        retention_prob = exp(-days_since_practice / adjusted_strength)

        # Probabilidad de olvido
        forget_prob = 1.0 - retention_prob

        # Ajustar por criticidad
        adjusted_forget = forget_prob * criticality

        return round(min(1.0, adjusted_forget), 4)

    @staticmethod
    def predict_next_attempt_outcome(
        student_accuracy: float,      # 0-100
        student_consistency: float,   # 0-100
        problem_difficulty: float,    # 0-1
        attempts_on_problem: int,
        previous_attempts_success: list[bool]
    ) -> dict[str, Any]:
        """
        Predice probabilidad de éxito en próximo intento.
        
        Basado en:
        - Accuracy/consistency históricos
        - Dificultad del problema
        - Patrón de intentos previos (learning momentum)
        """
        # P(éxito) base
        base_prob = (student_accuracy / 100.0) * 0.6 + 0.4

        # Ajuste por dificultad (IRT simple)
        difficulty_adjustment = 1.0 - (problem_difficulty * 0.5)

        # Ajuste por consistencia
        consistency_multiplier = (student_consistency / 100.0) * 0.5 + 0.5

        # Learning momentum: si últimos intentos fueron correctos, aumenta P(éxito)
        if previous_attempts_success:
            recent_successes = sum(previous_attempts_success[-3:])
            momentum_boost = (recent_successes / 3.0) * 0.2
        else:
            momentum_boost = 0

        # Combinado
        predicted_prob = (
            base_prob *
            difficulty_adjustment *
            consistency_multiplier +
            momentum_boost
        )

        return {
            "predictedSuccessProbability": round(min(1.0, max(0.0, predicted_prob)), 4),
            "attempt": attempts_on_problem + 1,
            "momentum": "positive" if momentum_boost > 0 else "neutral",
            "recommendation": (
                "Pasar al siguiente" if predicted_prob > 0.8
                else "Solicitar ayuda" if predicted_prob < 0.4
                else "Intentar de nuevo"
            )
        }

    @staticmethod
    def estimate_time_to_mastery(
        current_mastery: float,      # 0-1
        learning_velocity: str,      # 'slow', 'normal', 'fast'
        recent_improvement_rate: float  # (new_mastery - old_mastery) per day
    ) -> dict[str, Any]:
        """
        Estima cuántos días hasta alcanzar 80% de maestría.
        """
        mastery_target = 0.8
        mastery_gap = mastery_target - current_mastery

        # Si ya pasó el target
        if mastery_gap <= 0:
            return {
                "daysToMastery": 0,
                "alreadyMastered": True,
                "currentMastery": round(current_mastery, 2)
            }

        # Rate de mejora esperada según velocidad
        if learning_velocity == 'fast':
            expected_rate = max(0.05, recent_improvement_rate * 1.5)  # 5% mínimo
        elif learning_velocity == 'slow':
            expected_rate = min(0.02, recent_improvement_rate * 0.5)  # 2% máximo
        else:
            expected_rate = recent_improvement_rate or 0.03  # 3% default

        # Evitar división por cero
        if expected_rate <= 0:
            expected_rate = 0.02

        days_to_mastery = mastery_gap / expected_rate

        return {
            "daysToMastery": max(1, round(days_to_mastery)),
            "estimatedMasteryDate": (
                # Seria: adicionar days_to_mastery a fecha actual
                None  # Implementar con datetime en aplicación real
            ),
            "confidence": (
                0.95 if recent_improvement_rate > 0
                else 0.60  # Baja confianza si no hay datos históricos
            )
        }


class AdaptiveDifficultyAdjuster:
    """
    Ajusta dificultad de ejercicios dinámicamente.
    Reemplaza: _level_update logic en academic.py
    """

    @staticmethod
    def calculate_difficulty_adjustment(
        current_difficulty: float,     # 0-1
        accuracy_rate: float,          # 0-1
        consistency_score: float,      # 0-100
        average_time_ms: float,
        streak_length: int = 0
    ) -> dict[str, Any]:
        """
        Calcula nueva dificultad usando "Desirable Difficulty" (Bjork & Bjork).
        
        Objetivo: mantener ~75% de aciertos.
        """
        # Factores de decisión
        accuracy_too_high = accuracy_rate > 0.85
        accuracy_too_low = accuracy_rate < 0.65
        consistency_good = consistency_score > 75

        # Ajuste base
        difficulty_delta = 0.0

        if accuracy_too_high and consistency_good and streak_length >= 3:
            # Aumentar dificultad
            difficulty_delta = 0.15
        elif accuracy_too_low or (consistency_score < 50):
            # Disminuir dificultad
            difficulty_delta = -0.10
        elif streak_length >= 5:
            # Streak largo: aumentar un poco
            difficulty_delta = 0.08

        # Aplicar límites
        new_difficulty = max(0.1, min(1.0, current_difficulty + difficulty_delta))

        return {
            "currentDifficulty": round(current_difficulty, 2),
            "nextDifficulty": round(new_difficulty, 2),
            "delta": round(difficulty_delta, 2),
            "reason": (
                "increase" if difficulty_delta > 0
                else "decrease" if difficulty_delta < 0
                else "maintain"
            ),
            "desiredAccuracy": 0.75,
            "currentAccuracy": round(accuracy_rate, 2)
        }


# FUNCIONES DE INTEGRACIÓN PARA academic.py
# ==========================================

def improved_predictive_payload(analytics: dict, retention: dict) -> dict[str, Any]:
    """
    Reemplaza _predictive_payload() en academic.py:L1459
    """
    accuracy = float(analytics.get("rates", {}).get("accuracyRate") or 0.0)
    stability = float(analytics.get("rates", {}).get("stabilityRate") or 0.0)
    retention_idx = float(retention.get("averageForgetIndex") or 0.0) * 100

    return BayesianPredictiveModel.bayesian_risk_assessment(
        accuracy=accuracy * 100,
        stability=stability * 100,
        retention_index=100 - retention_idx  # Invertir forget index
    )


def improved_student_analytics_predictive(
    db_session: Any,
    user_id: int,
    analytics: dict,
    retention: dict
) -> dict[str, Any]:
    """
    Reemplaza la sección predictive en get_student_analytics()
    """
    return {
        "success": True,
        "userId": user_id,
        "analytics": analytics,
        "retention": retention,
        "predictive": improved_predictive_payload(analytics, retention),
        "data": {
            "analytics": analytics,
            "retention": retention,
            "predictive": improved_predictive_payload(analytics, retention)
        }
    }


def improved_level_update(
    current_difficulty: float,
    accuracy_rate: float,
    average_time_ms: float,
    streak: int
) -> dict[str, Any]:
    """
    Reemplaza update_level() en academic.py:L1543
    """
    consistency_score = min(100, (accuracy_rate * 100) + (streak * 5))

    adjustment = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
        current_difficulty=current_difficulty,
        accuracy_rate=accuracy_rate,
        consistency_score=consistency_score,
        average_time_ms=average_time_ms,
        streak_length=streak
    )

    return {
        **adjustment,
        "level": int(adjustment["nextDifficulty"] * 10),  # Escala 1-10
        "streak": streak,
        "data": adjustment
    }
