"""
GUÍA DE APLICACIÓN: Cómo Integrar ML Improvements
==================================================

Paso a paso para aplicar las mejoras ML al código existente.
"""

# PASO 1: MEJORA DE _predictive_payload() EN academic.py
# =======================================================

# UBICACIÓN: backend/routes/academic.py línea 1459

# CÓDIGO ACTUAL:
def _predictive_payload(analytics: dict[str, Any], retention: dict[str, Any]) -> dict[str, Any]:
    accuracy = float(analytics.get("rates", {}).get("accuracyRate") or 0.0)
    stability = float(analytics.get("rates", {}).get("stabilityRate") or 0.0)
    forget = float(retention.get("averageForgetIndex") or 0.0)
    risk = _clamp((1 - accuracy) * 0.45 + (1 - stability) * 0.30 + forget * 0.25, 0.0, 1.0)
    return {
        "riskScore": round(risk, 4),
        "riskLevel": "high" if risk >= 0.7 else "medium" if risk >= 0.4 else "low",
        ...
    }

# CAMBIO A:
from backend.ml_improvements import improved_predictive_payload

def _predictive_payload(analytics: dict[str, Any], retention: dict[str, Any]) -> dict[str, Any]:
    return improved_predictive_payload(analytics, retention)

# BENEFICIO: Bayesian risk assessment con intervalos de confianza
# - Antes: riskScore simple ponderado
# - Después: riskScore Bayesiano con variance computing


# PASO 2: MEJORA DE get_adaptive_recommendation() EN academic.py
# ===============================================================

# UBICACIÓN: backend/routes/academic.py línea 1488

# CÓDIGO ACTUAL:
@router.post("/adaptive/recommendation")
async def get_adaptive_recommendation(payload, db, current_user):
    # ... código ...
    selected = sorted(
        topics,
        key=lambda topic: (mastery_rows.get(topic.id, 0.0), topic.difficulty_level or 0.0)
    )[0]  # ← Selecciona por maestría más baja (greedy)
    
    recommendation = {
        "nextSkill": _topic_skill_payload(selected, mastery),
        ...
    }

# CAMBIO A:
from adaptive_engine.thompson_sampling import ThompsonSamplingRecommender

@router.post("/adaptive/recommendation")
async def get_adaptive_recommendation(payload, db, current_user):
    target_user_id = _resolve_target_user_id(payload, current_user)
    
    # Obtener temas disponibles
    topics = db.scalars(select(Topic).limit(100)).all()
    mastery_rows = {
        row.topic_id: float(row.mastery_score)
        for row in db.scalars(select(UserMastery).where(UserMastery.user_id == target_user_id)).all()
    }
    
    # Usar Thompson Sampling
    recommender = ThompsonSamplingRecommender()
    
    # Cargar histórico de outcomes (debería estar en DB)
    skill_stats = _load_student_skill_history(target_user_id)
    for skill_id, stats in skill_stats.items():
        for _ in range(stats['successes']):
            recommender.recordSkillOutcome(skill_id, True)
        for _ in range(stats['failures']):
            recommender.recordSkillOutcome(skill_id, False)
    
    # Recomendación Thompson Sampling
    available_skills = [
        {
            'id': f"topic_{t.id}",
            'name': t.name,
            'difficulty': t.difficulty_level or 0.5,
            'masteryLevel': mastery_rows.get(t.id, 0.0)
        }
        for t in topics
    ]
    
    signals = {
        'accuracy': sum(1 for s in mastery_rows.values() if s > 0.65) / len(mastery_rows),
        'consistency': 0.7,  # Calcular desde histórico
        'retentionRisk': 0.3,
        'predictedFailure': 0.2,
        'learningVelocity': 'normal'
    }
    
    recommendation = recommender.recommendSkillUsingThompsonSampling(
        availableSkills=available_skills,
        currentSkillId="",
        signals=signals,
        explorationRate=0.15
    )
    
    return {"success": True, "recommendation": recommendation, ...}

# BENEFICIO: Recomendaciones más inteligentes
# - Antes: Siempre el de maestría más baja
# - Después: Balance exploración/explotación, aprende de histórico


# PASO 3: MEJORA DE _retention_profile() EN academic.py
# =======================================================

# UBICACIÓN: backend/routes/academic.py línea 1435

# CÓDIGO ACTUAL:
def _retention_profile(db, user_id):
    rows = db.scalars(select(UserMastery).where(UserMastery.user_id == user_id)).all()
    profile = []
    for row in rows:
        priority = calculate_review_priority(...)  # ← Función simple
        profile.append({...})

# CAMBIO A:
from adaptive_engine.advanced_retention_model import AdvancedRetentionModel

def _retention_profile(db, user_id):
    retention_model = AdvancedRetentionModel()
    rows = db.scalars(select(UserMastery).where(UserMastery.user_id == user_id)).all()
    
    profile = []
    for row in rows:
        now = _utcnow()
        days_since = (now - row.last_updated).days if row.last_updated else 0
        
        # Usar modelo Ebbinghaus
        forget_index = retention_model.calculateForgetIndex(
            daysSincePractice=days_since,
            strengthOfMemory=14,
            confidenceScore=float(row.mastery_score)
        )
        
        # Calcular caja Leitner
        leitner = retention_model.calculateLeitnerBox(
            forgetIndex=forget_index,
            currentBox=row.leitner_box or 1
        )
        
        profile.append({
            "skillId": f"topic_{row.topic_id}",
            "topicId": row.topic_id,
            "skillName": row.topic.name if row.topic else f"Topic {row.topic_id}",
            "mastery": round(float(row.mastery_score) * 100, 1),
            "forgetIndex": round(forget_index * 100, 1),
            "due": forget_index > 0.5,
            "leitnerBox": leitner['nextBox'],
            "nextReviewDays": leitner['reviewIntervalDays'],
            "lastSeenAt": row.last_updated.isoformat() if row.last_updated else None,
        })
    
    return sorted(profile, key=lambda x: x["forgetIndex"], reverse=True)

# BENEFICIO: Retención personalizada
# - Antes: Intervalo fijo, no adapta
# - Después: Ebbinghaus + SM-2 + Leitner, intervalos dinámicos


# PASO 4: MEJORA DE _hint_for_exercise() EN academic.py
# ======================================================

# UBICACIÓN: backend/routes/academic.py línea 781

# CÓDIGO ACTUAL:
async def _hint_for_exercise(
    db: Session,
    current_user: UserOut,
    exercise: Exercise,
    hint_level: int,
    previous_hints: list[str],
) -> dict[str, Any]:
    data = await _post_ai_tutor("/api/ai-tutor/hint", payload, current_user.id)
    # ... fallback genérico

# CAMBIO A:
from adaptive_engine.advanced_error_analysis import AdvancedErrorPatternDetector, CrossSkillErrorAnalysis

async def _hint_for_exercise(
    db: Session,
    current_user: UserOut,
    exercise: Exercise,
    hint_level: int,
    previous_hints: list[str],
) -> dict[str, Any]:
    
    # Analizar patrón de errores del estudiante
    recent_attempts = _get_recent_attempts(db, current_user.id, exercise.topic_id, limit=10)
    
    detector = AdvancedErrorPatternDetector()
    pattern = detector.detectErrorPattern(recent_attempts)
    
    # Si hay patrón sistemático: atienda raíz
    if pattern['pattern'] == 'SYSTEMATIC':
        # Analizar si el error viene de prerequisito débil
        analyzer = CrossSkillErrorAnalysis()
        analysis = analyzer.analyzePrerequisiteContribution(
            errorType="CONCEPTUAL",
            skillInQuestion=f"topic_{exercise.topic_id}",
            prerequisites=_get_prerequisites(db, exercise.topic_id),
            masteryBySkill=_get_mastery_map(db, current_user.id)
        )
        
        if analysis['contributingSkills']:
            # Error está causado por debilidad en prerequisito
            return {
                "hint": f"Este problema requiere dominio de: {', '.join(analysis['contributingSkills'])}",
                "hintLevel": 1,
                "source": "prerequisite_analysis",
                "followUpGuidance": f"Practica {analysis['contributingSkills'][0]} primero",
            }
    
    # Resto del flujo...
    data = await _post_ai_tutor("/api/ai-tutor/hint", payload, current_user.id)

# BENEFICIO: Hints más inteligentes
# - Antes: Hint genérico sin contexto
# - Después: Detecta causa raíz, sugiere prerequisito si es necesario


# PASO 5: MEJORA DE POST /question/generate EN academic.py
# ==========================================================

# UBICACIÓN: backend/routes/academic.py línea 557

# CÓDIGO ACTUAL:
@router.post("/question/generate", response_model=GeneratedExerciseResponse)
async def generate_question(request, db, current_user):
    exercises = db.scalars(select(Exercise).limit(10)).all()
    # ← Selecciona random

# CAMBIO A:
from adaptive_engine.exercise_matching_engine import ExerciseMatchingEngine, Exercise as ExerciseModel

@router.post("/question/generate", response_model=GeneratedExerciseResponse)
async def generate_question(request, db, current_user):
    # Obtener perfil del estudiante
    profile = _get_student_profile(db, current_user.id)
    
    # Obtener ejercicios disponibles
    exercises = db.scalars(select(Exercise).limit(50)).all()
    
    # Convertir a formato interno
    exercise_models = [
        {
            'id': str(ex.id),
            'difficulty': ex.difficulty or 0.5,
            'discriminationIndex': 1.7,  # IRT default
            'guessability': 0.2,         # ~20% acierto al azar
            'concept': ex.topic.name if ex.topic else 'General',
            'relatedConcepts': _get_related_concepts(db, ex.topic_id),
            'estimatedTimeMs': 5000,    # Ajustar según datos reales
        }
        for ex in exercises
    ]
    
    # Matching engine
    matcher = ExerciseMatchingEngine()
    selected_exercise = matcher.matchExercise(
        student=profile,
        availableExercises=exercise_models,
        targetSuccessProbability=0.75
    )
    
    # Obtener ejercicio del DB
    exercise = db.get(Exercise, int(selected_exercise['id']))
    
    # ... resto del flujo con ejercicio seleccionado

# BENEFICIO: Selección inteligente de ejercicios
# - Antes: Random o por topic
# - Después: IRT matching + dificultad personalizada


# PASO 6: MEJORA DE PUT /level/update EN academic.py
# ===================================================

# UBICACIÓN: backend/routes/academic.py línea 1543

# CÓDIGO ACTUAL:
@router.post("/level/update")
async def update_level(payload, db, current_user):
    delta = 0
    if accuracy_rate >= 0.85 and (average_time_ms <= 120000 or streak >= 3):
        delta = 1
    # ...

# CAMBIO A:
from backend.ml_improvements import improved_level_update

@router.post("/level/update")
async def update_level(payload, db, current_user):
    result = improved_level_update(
        current_difficulty=payload.get('currentDifficulty', 1.0),
        accuracy_rate=payload.get('accuracyRate', 0.0),
        average_time_ms=payload.get('averageTimeMs', 5000),
        streak=payload.get('streak', 0)
    )
    
    return {
        "success": True,
        **result,
        "data": result
    }

# BENEFICIO: Ajuste de dificultad robusto
# - Antes: Heurística simple
# - Después: Desirable difficulty + adaptativo


# PASO 7: CREAR TABLA DE ESTADÍSTICAS DE SKILLS (si no existe)
# ==============================================================

# En database.py, añadir:

class SkillStatistics(Base):
    __tablename__ = "skill_statistics"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    skill_id = Column(Integer, nullable=False)  # topic_id
    successes = Column(Integer, default=0)      # Thompson sampling
    failures = Column(Integer, default=0)
    leitner_box = Column(Integer, default=1)    # Leitner system
    last_reviewed = Column(DateTime, default=datetime.utcnow)
    next_review_date = Column(DateTime)         # SM-2 computed
    ease_factor = Column(Float, default=2.5)    # SM-2 parameter
    
    __table_args__ = (
        UniqueConstraint('user_id', 'skill_id', name='uq_user_skill'),
    )


# PASO 8: TESTS
# =============

# Ejecutar suite de tests:
# python -m pytest tests/test_ml_improvements.py -v

# Esperado: 11 tests pasados


# CHECKLIST DE INTEGRACIÓN
# ========================

checklist = {
    "Paso 1 - _predictive_payload": False,
    "Paso 2 - get_adaptive_recommendation": False,
    "Paso 3 - _retention_profile": False,
    "Paso 4 - _hint_for_exercise": False,
    "Paso 5 - POST /question/generate": False,
    "Paso 6 - POST /level/update": False,
    "Paso 7 - SkillStatistics table": False,
    "Paso 8 - Tests pasando": False,
    "Monitoreo de métricas": False,
    "A/B testing": False,
}

# Marcar cada item como completo


# ROLLOUT RECOMENDADO
# ===================

ROLLOUT_PLAN = """
SEMANA 1-2: Integración
- Implementar cambios en Pasos 1-7
- Ejecutar test suite
- Debugging en staging

SEMANA 2-3: Soft launch (10% usuarios nuevos)
- Activar para usuarios nuevos
- Monitorear métricas básicas
- Recolectar feedback

SEMANA 3-4: Ramp up (50% usuarios nuevos)
- Si métricas OK, expandir a 50%
- Continuar monitoreo

SEMANA 4-5: Full rollout (100%)
- Expandir a todos los usuarios nuevos
- Inicio lento de A/B testing

ONGOING: Optimización
- Recolectar data de A/B
- Ajustar parámetros
- Validar hipótesis
"""

print(ROLLOUT_PLAN)
