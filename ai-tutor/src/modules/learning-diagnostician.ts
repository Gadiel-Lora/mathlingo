
import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import {
  DiagnosticAnalysis,
  StudentLearningProfile,
  ErrorCategory,
  ProblemStatement,
  SkillData,
  ErrorPattern,
  Trend,
  LearningVelocity,
} from '../types';

interface LearningDiagnosticRecord {
  studentId: string;
  createdAt: Date;
  errorType: ErrorCategory;
  analysis: DiagnosticAnalysis;
}

interface DiagnosticStore {
  saveDiagnostic(record: LearningDiagnosticRecord): Promise<void>;
  getRecentDiagnostics(studentId: string, limit: number): Promise<LearningDiagnosticRecord[]>;
}

interface ProfileStore {
  saveProfile(studentId: string, profile: StudentLearningProfile): Promise<void>;
  getProfile(studentId: string): Promise<StudentLearningProfile | null>;
}

class InMemoryDiagnosticStore implements DiagnosticStore {
  private records = new Map<string, LearningDiagnosticRecord[]>();

  async saveDiagnostic(record: LearningDiagnosticRecord): Promise<void> {
    const existing = this.records.get(record.studentId) ?? [];
    const updated = [...existing, record].slice(-100);
    this.records.set(record.studentId, updated);
  }

  async getRecentDiagnostics(studentId: string, limit: number): Promise<LearningDiagnosticRecord[]> {
    const records = this.records.get(studentId) ?? [];
    return records.slice(-limit);
  }
}

class InMemoryProfileStore implements ProfileStore {
  private profiles = new Map<string, StudentLearningProfile>();

  async saveProfile(studentId: string, profile: StudentLearningProfile): Promise<void> {
    this.profiles.set(studentId, profile);
  }

  async getProfile(studentId: string): Promise<StudentLearningProfile | null> {
    return this.profiles.get(studentId) ?? null;
  }
}

export class LearningDiagnostician {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder,
    private diagnosticStore: DiagnosticStore = new InMemoryDiagnosticStore(),
    private profileStore: ProfileStore = new InMemoryProfileStore()
  ) {}

  async analyzeLearningGaps(
    studentResponse: string,
    problem: ProblemStatement,
    correctAnswer: string,
    errorType: ErrorCategory,
    masteryLevel: number,
    recentErrors: ErrorCategory[] = [],
    studentId: string = 'anonymous'
  ): Promise<DiagnosticAnalysis> {
    const prompt = this.promptBuilder.buildDiagnosticPrompt(
      studentResponse,
      problem,
      correctAnswer,
      errorType,
      masteryLevel,
      recentErrors
    );

    const fallback = this.buildFallbackDiagnostic(errorType, masteryLevel, recentErrors);

    try {
      const raw = await this.ollama.generateResponse(prompt);
      const parsed = JSON.parse(this.extractJSON(raw));
      const analysis = this.normalizeDiagnostic(parsed, fallback, errorType);

      await this.diagnosticStore.saveDiagnostic({
        studentId,
        createdAt: new Date(),
        errorType,
        analysis,
      });

      return analysis;
    } catch {
      await this.diagnosticStore.saveDiagnostic({
        studentId,
        createdAt: new Date(),
        errorType,
        analysis: fallback,
      });
      return fallback;
    }
  }

  async buildLearningProfile(
    studentId: string,
    completedSkills: SkillData[],
    errorPatterns: ErrorPattern[],
    improvementTrends: Trend[]
  ): Promise<StudentLearningProfile> {
    const aggregated = {
      completedSkills,
      errorPatterns,
      improvementTrends,
    };

    const prompt = this.promptBuilder.buildLearningProfilePrompt(aggregated);
    const fallback = this.buildFallbackProfile(studentId, completedSkills, errorPatterns, improvementTrends);

    try {
      const raw = await this.ollama.generateResponse(prompt);
      const parsed = JSON.parse(this.extractJSON(raw));
      const profile = this.normalizeProfile(parsed, fallback, studentId);
      await this.profileStore.saveProfile(studentId, profile);
      return profile;
    } catch {
      await this.profileStore.saveProfile(studentId, fallback);
      return fallback;
    }
  }

  async identifyErrorPatterns(studentId: string, lastN: number = 20): Promise<ErrorPattern[]> {
    const records = await this.diagnosticStore.getRecentDiagnostics(studentId, lastN);
    const counts = new Map<string, number>();

    for (const record of records) {
      const key = record.analysis.errorPattern || record.errorType.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([patternType, count]) => ({
      patternType,
      count,
    }));
  }

  private buildFallbackDiagnostic(
    errorType: ErrorCategory,
    masteryLevel: number,
    recentErrors: ErrorCategory[]
  ): DiagnosticAnalysis {
    const isRecurring = recentErrors.filter((e) => e === errorType).length >= 2;
    const baseRecommendation = masteryLevel < 40
      ? 'Revisar el concepto base con ejemplos simples.'
      : 'Practicar el concepto con ejercicios guiados.';

    return {
      conceptsGrasped: [],
      conceptsMissing: [],
      rootCause: isRecurring ? 'Patron de error recurrente' : 'Evidencia insuficiente',
      procedureStrength: this.clamp(masteryLevel, 0, 100, 50),
      conceptualDepth: this.clamp(masteryLevel - 10, 0, 100, 40),
      transferability: this.clamp(masteryLevel - 20, 0, 100, 30),
      isRecurring,
      errorPattern: errorType.toLowerCase(),
      primaryWeakness: errorType.toLowerCase(),
      secondaryWeaknesses: [],
      strengths: [],
      recommendation: baseRecommendation,
    };
  }

  private buildFallbackProfile(
    studentId: string,
    completedSkills: SkillData[],
    errorPatterns: ErrorPattern[],
    improvementTrends: Trend[]
  ): StudentLearningProfile {
    const sorted = [...completedSkills].sort((a, b) => b.masteryLevel - a.masteryLevel);
    const strengths = sorted.slice(0, 3).map((s) => ({
      skill: s.skillName ?? s.skillId,
      masteryLevel: s.masteryLevel,
      confidence: s.confidence ?? 0,
      evidence: 'Derivado de dominio reciente',
    }));
    const challenges = sorted.slice(-3).map((s) => ({
      skill: s.skillName ?? s.skillId,
      masteryLevel: s.masteryLevel,
      primaryIssue: 'Dominio bajo reciente',
      evidence: 'Necesita refuerzo',
    }));

    const improvingAreas = improvementTrends.filter((t) => t.direction === 'improving').map((t) => t.area);
    const stuckAreas = improvementTrends.filter((t) => t.direction === 'declining').map((t) => t.area);
    const avgMastery = completedSkills.length > 0
      ? completedSkills.reduce((acc, s) => acc + s.masteryLevel, 0) / completedSkills.length
      : 0;

    const confidenceLevel = avgMastery >= 75 ? 'high' : avgMastery < 50 ? 'low' : 'medium';

    const learningProfile = {
      preferredExplanationStyle: 'mixed',
      learningSpeed: avgMastery < 40 ? 'slow' : avgMastery > 75 ? 'fast' : 'normal',
      confidenceLevel,
      strengths,
      challenges,
      patterns: {
        improvingAreas,
        stuckAreas,
        errorTrend: stuckAreas.length > improvingAreas.length ? 'empeorando'
          : improvingAreas.length > 0 ? 'mejorando'
            : 'estable',
        consistencyScore: 60,
        mostCommonErrorType: errorPatterns[0]?.patternType ?? 'conceptual',
      },
    } as const;

    return {
      studentId,
      preferredExplanationStyle: learningProfile.preferredExplanationStyle,
      learningSpeed: learningProfile.learningSpeed as LearningVelocity,
      confidenceLevel,
      learningProfile,
      recommendations: {
        immediate: {
          skill: challenges[0]?.skill ?? strengths[0]?.skill ?? 'fundamentos',
          reason: 'Refuerzo inmediato para mejorar estabilidad',
          urgency: challenges.length > 0 ? 'high' : 'medium',
        },
        shortTerm: {
          focusArea: challenges[0]?.skill ?? 'fundamentos',
          skills: challenges.map((c) => c.skill),
          estimatedWeeks: 2,
        },
        learningPath: {
          phase1_foundation: challenges.map((c) => c.skill),
          phase2_intermediate: improvingAreas,
          phase3_advanced: strengths.map((s) => s.skill),
        },
      },
    };
  }

  private normalizeDiagnostic(
    parsed: any,
    fallback: DiagnosticAnalysis,
    errorType: ErrorCategory
  ): DiagnosticAnalysis {
    return {
      problemId: parsed.problemId ?? fallback.problemId,
      studentAnswer: parsed.studentAnswer ?? fallback.studentAnswer,
      errorType,
      conceptsGrasped: Array.isArray(parsed.conceptsGrasped) ? parsed.conceptsGrasped : fallback.conceptsGrasped,
      conceptsMissing: Array.isArray(parsed.conceptsMissing) ? parsed.conceptsMissing : fallback.conceptsMissing,
      rootCause: typeof parsed.rootCause === 'string' ? parsed.rootCause : fallback.rootCause,
      procedureStrength: this.clamp(parsed.procedureStrength, 0, 100, fallback.procedureStrength),
      conceptualDepth: this.clamp(parsed.conceptualDepth, 0, 100, fallback.conceptualDepth),
      transferability: this.clamp(parsed.transferability, 0, 100, fallback.transferability),
      isRecurring: typeof parsed.isRecurring === 'boolean' ? parsed.isRecurring : fallback.isRecurring,
      errorPattern: typeof parsed.errorPattern === 'string' ? parsed.errorPattern : fallback.errorPattern,
      primaryWeakness: typeof parsed.primaryWeakness === 'string' ? parsed.primaryWeakness : fallback.primaryWeakness,
      secondaryWeaknesses: Array.isArray(parsed.secondaryWeaknesses) ? parsed.secondaryWeaknesses : fallback.secondaryWeaknesses,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : fallback.strengths,
      recommendation: typeof parsed.recommendation === 'string' ? parsed.recommendation : fallback.recommendation,
    };
  }

  private normalizeProfile(
    parsed: any,
    fallback: StudentLearningProfile,
    studentId: string
  ): StudentLearningProfile {
    const learningProfile = parsed.learningProfile ?? parsed;
    const recommendations = parsed.recommendations ?? parsed.recommendedPath ?? fallback.recommendations;

    const preferredExplanationStyle = learningProfile?.preferredExplanationStyle
      ?? fallback.preferredExplanationStyle
      ?? 'mixed';
    const learningSpeed = learningProfile?.learningSpeed
      ?? fallback.learningSpeed
      ?? 'normal';
    const confidenceLevel = learningProfile?.confidenceLevel
      ?? fallback.confidenceLevel
      ?? 'medium';

    return {
      ...fallback,
      studentId,
      preferredExplanationStyle,
      learningSpeed,
      confidenceLevel,
      learningProfile: learningProfile ?? fallback.learningProfile,
      recommendations,
    };
  }

  private clamp(value: any, min: number, max: number, fallback: number): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
  }

  private extractJSON(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}

