-- AI Tutor Enhanced 2.0 schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS student_learning_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  preferred_explanation_style VARCHAR DEFAULT 'mixed',
  learning_speed VARCHAR DEFAULT 'normal',
  confidence_level VARCHAR DEFAULT 'medium',
  strengths JSONB,
  challenges JSONB,
  improvement_areas TEXT[],
  stuck_areas TEXT[],
  error_trend VARCHAR,
  consistency_level FLOAT,
  recommended_path JSONB,
  learning_path_phases JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_learning_profiles_user ON student_learning_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_student_learning_profiles_updated ON student_learning_profiles (updated_at DESC);

CREATE TABLE IF NOT EXISTS learning_diagnostics (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  exercise_id UUID,
  concepts_grasped TEXT[],
  concepts_missing TEXT[],
  procedure_strength FLOAT,
  conceptual_depth FLOAT,
  transferability FLOAT,
  primary_weakness TEXT,
  secondary_weaknesses TEXT[],
  root_cause TEXT,
  is_recurring BOOLEAN,
  pattern_type VARCHAR,
  suggested_intervention TEXT,
  ready_for_next_topic BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_diagnostics_user ON learning_diagnostics (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_diagnostics_created ON learning_diagnostics (created_at DESC);
