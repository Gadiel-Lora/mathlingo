"""
TEST: MEJORAS DE MACHINE LEARNING
==================================

Pruebas para validar que las nuevas funciones ML funcionan correctamente.
"""

import unittest
from math import exp, sqrt
from backend.ml_improvements import (
    BayesianPredictiveModel,
    AdaptiveDifficultyAdjuster
)


class TestBayesianPredictiveModel(unittest.TestCase):
    """Test del modelo predictivo Bayesiano"""

    def test_irt_success_probability(self):
        """Test: P(éxito) usando IRT"""
        # Estudiante con 70% maestría, problema 50% dificultad = ~73% éxito
        prob = BayesianPredictiveModel.estimate_success_probability(
            mastery_level=0.7,
            problem_difficulty=0.5,
            discrimination=1.7
        )

        self.assertGreater(prob, 0.6)
        self.assertLess(prob, 0.9)
        self.assertEqual(round(prob, 4), prob)

    def test_bayesian_risk_low(self):
        """Test: Bajo riesgo cuando accuracy/stability altos"""
        result = BayesianPredictiveModel.bayesian_risk_assessment(
            accuracy=85,
            stability=80,
            retention_index=80
        )

        self.assertEqual(result["riskLevel"], "low")
        self.assertLess(result["riskScore"], 0.4)
        self.assertEqual(result["recommendedAction"], "advance")

    def test_bayesian_risk_high(self):
        """Test: Alto riesgo cuando accuracy/stability bajos"""
        result = BayesianPredictiveModel.bayesian_risk_assessment(
            accuracy=40,
            stability=35,
            retention_index=30
        )

        self.assertEqual(result["riskLevel"], "high")
        self.assertGreater(result["riskScore"], 0.6)
        self.assertEqual(result["recommendedAction"], "review")

    def test_forgetting_probability_ebbinghaus(self):
        """Test: Curva de olvido Ebbinghaus"""
        # Después de 14 días con maestría 0.8, debe olvidar ~37%
        forget_prob = BayesianPredictiveModel.calculate_forgetting_probability(
            days_since_practice=14,
            mastery_level=0.8,
            criticality=1.0,
            strength_of_memory=14
        )

        # R(14) = e^(-14/22.4) ≈ 0.53 → forget ≈ 0.47
        expected_approximate = 0.35  # Margen de tolerancia
        self.assertLess(abs(forget_prob - expected_approximate), 0.15)

    def test_predict_next_attempt(self):
        """Test: Predicción de próximo intento"""
        result = BayesianPredictiveModel.predict_next_attempt_outcome(
            student_accuracy=75,
            student_consistency=70,
            problem_difficulty=0.5,
            attempts_on_problem=2,
            previous_attempts_success=[True, True]
        )

        self.assertGreater(result["predictedSuccessProbability"], 0.5)
        self.assertLessEqual(result["predictedSuccessProbability"], 1.0)
        self.assertEqual(result["attempt"], 3)
        self.assertEqual(result["momentum"], "positive")

    def test_time_to_mastery(self):
        """Test: Estimación de tiempo a maestría"""
        result = BayesianPredictiveModel.estimate_time_to_mastery(
            current_mastery=0.5,
            learning_velocity="normal",
            recent_improvement_rate=0.03
        )

        # Gap: 0.3, Rate: 0.03 → Days: 10
        self.assertGreater(result["daysToMastery"], 5)
        self.assertLess(result["daysToMastery"], 15)

    def test_already_mastered(self):
        """Test: Cuando ya alcanzó maestría"""
        result = BayesianPredictiveModel.estimate_time_to_mastery(
            current_mastery=0.85,
            learning_velocity="normal",
            recent_improvement_rate=0.01
        )

        self.assertTrue(result["alreadyMastered"])
        self.assertEqual(result["daysToMastery"], 0)


class TestAdaptiveDifficultyAdjuster(unittest.TestCase):
    """Test del ajustador de dificultad adaptativa"""

    def test_increase_difficulty_when_doing_well(self):
        """Test: Aumentar dificultad cuando va bien"""
        result = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
            current_difficulty=0.5,
            accuracy_rate=0.88,  # 88% correcta
            consistency_score=85,
            average_time_ms=3000,
            streak_length=4
        )

        self.assertEqual(result["reason"], "increase")
        self.assertGreater(result["nextDifficulty"], result["currentDifficulty"])

    def test_decrease_difficulty_when_accuracy_low(self):
        """Test: Disminuir dificultad cuando accuracy baja"""
        result = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
            current_difficulty=0.7,
            accuracy_rate=0.60,  # 60% correcta (por debajo de 65%)
            consistency_score=40,
            average_time_ms=8000,
            streak_length=0
        )

        self.assertEqual(result["reason"], "decrease")
        self.assertLess(result["nextDifficulty"], result["currentDifficulty"])

    def test_maintain_difficulty_balanced(self):
        """Test: Mantener dificultad cuando está balanceada"""
        result = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
            current_difficulty=0.6,
            accuracy_rate=0.75,  # Ideal: 75% correcta
            consistency_score=70,
            average_time_ms=4000,
            streak_length=1
        )

        self.assertEqual(result["reason"], "maintain")
        self.assertAlmostEqual(
            result["nextDifficulty"],
            result["currentDifficulty"],
            places=1
        )

    def test_respects_bounds(self):
        """Test: Dificultad siempre en [0.1, 1.0]"""
        # Intenta bajar de 0.1
        result = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
            current_difficulty=0.15,
            accuracy_rate=0.30,
            consistency_score=20,
            average_time_ms=10000,
            streak_length=0
        )

        self.assertGreaterEqual(result["nextDifficulty"], 0.1)

        # Intenta subir de 1.0
        result = AdaptiveDifficultyAdjuster.calculate_difficulty_adjustment(
            current_difficulty=0.95,
            accuracy_rate=0.95,
            consistency_score=99,
            average_time_ms=1000,
            streak_length=10
        )

        self.assertLessEqual(result["nextDifficulty"], 1.0)


class TestEdgeCases(unittest.TestCase):
    """Test casos extremos"""

    def test_zero_improvement_rate(self):
        """Test: Sin datos históricos de mejora"""
        result = BayesianPredictiveModel.estimate_time_to_mastery(
            current_mastery=0.5,
            learning_velocity="normal",
            recent_improvement_rate=0  # Sin datos
        )

        # Debe usar valor por defecto 0.02
        self.assertGreater(result["daysToMastery"], 0)

    def test_confidence_interval_width(self):
        """Test: Intervalo de confianza más estrecho con más datos"""
        result_low_conf = BayesianPredictiveModel.bayesian_risk_assessment(
            accuracy=50,
            stability=50,
            retention_index=50,
            confidence_level=0.95
        )

        result_high_conf = BayesianPredictiveModel.bayesian_risk_assessment(
            accuracy=50,
            stability=50,
            retention_index=50,
            confidence_level=0.99
        )

        low_width = result_low_conf["confidenceInterval"][1] - result_low_conf["confidenceInterval"][0]
        high_width = result_high_conf["confidenceInterval"][1] - result_high_conf["confidenceInterval"][0]

        # Conf 99% debe tener intervalo más ancho que 95%
        self.assertGreater(high_width, low_width)


if __name__ == '__main__':
    unittest.main()
