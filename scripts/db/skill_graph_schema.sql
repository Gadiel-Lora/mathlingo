-- MathLingo Skill Graph schema (PostgreSQL)
-- Core tables:
--   skills
--   skill_edges
--   user_skill_state
--   lesson_skill_map

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  domain TEXT NOT NULL,
  difficulty_level SMALLINT NOT NULL CHECK (difficulty_level BETWEEN 1 AND 10),
  exercises_pool TEXT NOT NULL DEFAULT '',
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  mastery_threshold NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (mastery_threshold >= 0 AND mastery_threshold <= 100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills (domain);
CREATE INDEX IF NOT EXISTS idx_skills_difficulty ON skills (difficulty_level);

CREATE TABLE IF NOT EXISTS skill_edges (
  source_skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  target_skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'prerequisite',
  required_mastery NUMERIC(5,2) NOT NULL DEFAULT 70 CHECK (required_mastery >= 0 AND required_mastery <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source_skill_id, target_skill_id),
  CHECK (source_skill_id <> target_skill_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_edges_target ON skill_edges (target_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_edges_source ON skill_edges (source_skill_id);

CREATE TABLE IF NOT EXISTS user_skill_state (
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mastery_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct_attempts INTEGER NOT NULL DEFAULT 0 CHECK (correct_attempts >= 0),
  avg_time_ms NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (avg_time_ms >= 0),
  last_performance NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (last_performance >= 0 AND last_performance <= 1),
  last_mode TEXT NOT NULL DEFAULT 'curriculum',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_state_user ON user_skill_state (user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_state_mastery ON user_skill_state (mastery_score DESC);

CREATE TABLE IF NOT EXISTS lesson_skill_map (
  lesson_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'core' CHECK (role IN ('core', 'support')),
  weight NUMERIC(6,4) NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lesson_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_skill_map_lesson ON lesson_skill_map (lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_skill_map_unit ON lesson_skill_map (unit_id);
CREATE INDEX IF NOT EXISTS idx_lesson_skill_map_skill ON lesson_skill_map (skill_id);
