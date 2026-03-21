
import { OllamaService } from '../services/ollama-service';
import { PromptBuilder } from './prompt-builder';
import {
  StudentLearningProfile,
  Skill,
  SkillGraph,
  PathRecommendation,
  LearningVelocity,
} from '../types';

export class AdaptivePathRecommender {
  constructor(
    private ollama: OllamaService,
    private promptBuilder: PromptBuilder
  ) {}

  async recommendPersonalizedPath(
    profile: StudentLearningProfile,
    allSkills: Skill[],
    skillGraph: SkillGraph
  ): Promise<PathRecommendation> {
    const fallback = this.buildDeterministicPath(profile, allSkills, skillGraph);
    const prompt = this.promptBuilder.buildPersonalizedPathPrompt(profile, allSkills, skillGraph);

    try {
      const raw = await this.ollama.generateResponse(prompt);
      const parsed = JSON.parse(this.extractJSON(raw));
      return this.normalizePath(parsed, fallback);
    } catch {
      return fallback;
    }
  }

  async generatePathsByStyle(
    profile: StudentLearningProfile,
    styles: string[],
    allSkills: Skill[]
  ): Promise<Map<string, Skill[]>> {
    const strengths = this.extractStrengths(profile, allSkills);
    const weaknesses = this.extractWeaknesses(profile, allSkills);
    const map = new Map<string, Skill[]>();

    for (const style of styles) {
      const pathNames = this.buildPathByStyle(style, allSkills, weaknesses, strengths);
      const skillObjects = pathNames
        .map((name) => allSkills.find((s) => s.name === name || s.id === name))
        .filter((s): s is Skill => Boolean(s));
      map.set(style, skillObjects);
    }

    return map;
  }

  async estimateTimeline(
    learningSpeed: LearningVelocity,
    weaknessCount: number,
    strengths: string[]
  ): Promise<{ readyForNextGrade: string; readyForAdvancedChallenges: string; estimatedMasteryCompletion: string }> {
    const daysPerSkill = learningSpeed === 'fast' ? 3 : learningSpeed === 'slow' ? 7 : 5;
    const now = new Date();

    const addDays = (days: number): string => {
      const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      return target.toISOString().slice(0, 10);
    };

    return {
      readyForNextGrade: addDays(daysPerSkill * (weaknessCount + 8)),
      readyForAdvancedChallenges: addDays(daysPerSkill * Math.max(3, Math.ceil(weaknessCount / 2))),
      estimatedMasteryCompletion: addDays(daysPerSkill * (weaknessCount + strengths.length + 12)),
    };
  }

  private buildDeterministicPath(
    profile: StudentLearningProfile,
    allSkills: Skill[],
    skillGraph: SkillGraph
  ): PathRecommendation {
    const strengths = this.extractStrengths(profile, allSkills);
    const weaknesses = this.extractWeaknesses(profile, allSkills);
    const dependents = this.buildDependentsMap(allSkills, skillGraph);

    const critical = weaknesses.filter((skill) => (dependents.get(skill) ?? []).length > 0).slice(0, 5);
    const important = weaknesses.filter((skill) => !critical.includes(skill)).slice(0, 5);
    const ready = strengths.slice(0, 5);
    const canTeach = strengths.slice(0, 3);

    const learningSpeed = profile.learningSpeed
      ?? profile.learningProfile?.learningSpeed
      ?? 'normal';

    const alternativePaths = {
      ifPreferencesVisual: this.buildPathByStyle('visual', allSkills, weaknesses, strengths),
      ifPreferencesAlgebraic: this.buildPathByStyle('algebraic', allSkills, weaknesses, strengths),
      ifPreferencesContextual: this.buildPathByStyle('contextual', allSkills, weaknesses, strengths),
    };

    const timeline = this.estimateTimelineSync(learningSpeed, weaknesses.length, strengths);

    return {
      personalizedPath: {
        criticalGaps: critical.map((skill) => ({
          skill,
          urgency: 'critical',
          reason: 'Prerequisito clave para avanzar',
        })),
        strengths: {
          readyForAdvanced: ready,
          canTeachOthers: canTeach,
        },
        recommendedSequence: {
          phase1_foundation: critical,
          phase2_consolidation: important,
          phase3_advancement: ready,
        },
        alternativePaths,
        estimatedTimeline: timeline,
        rationale: 'Ruta basada en debilidades criticas, fortalezas y velocidad de aprendizaje.',
      },
    };
  }

  private estimateTimelineSync(
    learningSpeed: LearningVelocity,
    weaknessCount: number,
    strengths: string[]
  ): { readyForNextGrade: string; readyForAdvancedChallenges: string; estimatedMasteryCompletion: string } {
    const daysPerSkill = learningSpeed === 'fast' ? 3 : learningSpeed === 'slow' ? 7 : 5;
    const now = new Date();

    const addDays = (days: number): string => {
      const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      return target.toISOString().slice(0, 10);
    };

    return {
      readyForNextGrade: addDays(daysPerSkill * (weaknessCount + 8)),
      readyForAdvancedChallenges: addDays(daysPerSkill * Math.max(3, Math.ceil(weaknessCount / 2))),
      estimatedMasteryCompletion: addDays(daysPerSkill * (weaknessCount + strengths.length + 12)),
    };
  }

  private buildPathByStyle(
    style: string,
    allSkills: Skill[],
    weaknesses: string[],
    strengths: string[]
  ): string[] {
    const domainMap: Record<string, string[]> = {
      visual: ['geometry', 'trigonometry'],
      algebraic: ['algebra', 'arithmetic'],
      contextual: ['probability', 'statistics', 'modeling', 'applied'],
    };

    const domains = domainMap[style] ?? [];
    const byDomain = allSkills
      .filter((s) => domains.length === 0 || domains.includes(s.domain))
      .map((s) => s.name);

    const combined = [...weaknesses, ...byDomain, ...strengths];
    return combined.filter((v, i, a) => a.indexOf(v) === i).slice(0, 10);
  }

  private extractStrengths(profile: StudentLearningProfile, allSkills: Skill[]): string[] {
    const strengths: string[] = [];

    if (profile.skillAnalysis) {
      for (const [skillId, detail] of Object.entries(profile.skillAnalysis)) {
        if (detail.masteryLevel >= 80) {
          strengths.push(this.resolveSkillName(skillId, allSkills));
        }
      }
    }

    const profileStrengths = profile.learningProfile?.strengths?.map((s) => s.skill) ?? [];
    strengths.push(...profileStrengths);

    return strengths.filter((v, i, a) => a.indexOf(v) === i);
  }

  private extractWeaknesses(profile: StudentLearningProfile, allSkills: Skill[]): string[] {
    const weaknesses: string[] = [];

    if (profile.skillAnalysis) {
      for (const [skillId, detail] of Object.entries(profile.skillAnalysis)) {
        if (detail.masteryLevel < 60) {
          weaknesses.push(this.resolveSkillName(skillId, allSkills));
        }
      }
    }

    const profileWeaknesses = profile.learningProfile?.challenges?.map((c) => c.skill) ?? [];
    weaknesses.push(...profileWeaknesses);

    return weaknesses.filter((v, i, a) => a.indexOf(v) === i);
  }

  private buildDependentsMap(allSkills: Skill[], skillGraph: SkillGraph): Map<string, string[]> {
    const map = new Map<string, string[]>();

    const addEdge = (from: string, to: string): void => {
      const fromKey = this.resolveSkillName(from, allSkills);
      const toKey = this.resolveSkillName(to, allSkills);
      const existing = map.get(fromKey) ?? [];
      map.set(fromKey, [...existing, toKey]);
    };

    if (skillGraph && skillGraph.dependents) {
      for (const [from, tos] of Object.entries(skillGraph.dependents)) {
        for (const to of tos) {
          addEdge(from, to);
        }
      }
      return map;
    }

    if (skillGraph && skillGraph.edges) {
      for (const edge of skillGraph.edges) {
        addEdge(edge.from, edge.to);
      }
      return map;
    }

    for (const skill of allSkills) {
      for (const prereq of skill.prerequisites ?? []) {
        addEdge(prereq, skill.id);
      }
    }

    return map;
  }

  private normalizePath(parsed: any, fallback: PathRecommendation): PathRecommendation {
    const path = parsed.personalizedPath ?? parsed;
    if (!path || typeof path !== 'object') return fallback;

    return {
      personalizedPath: {
        criticalGaps: Array.isArray(path.criticalGaps)
          ? path.criticalGaps
          : fallback.personalizedPath.criticalGaps,
        strengths: path.strengths ?? fallback.personalizedPath.strengths,
        recommendedSequence: path.recommendedSequence ?? fallback.personalizedPath.recommendedSequence,
        alternativePaths: path.alternativePaths ?? fallback.personalizedPath.alternativePaths,
        estimatedTimeline: path.estimatedTimeline ?? fallback.personalizedPath.estimatedTimeline,
        rationale: typeof path.rationale === 'string'
          ? path.rationale
          : fallback.personalizedPath.rationale,
      },
    };
  }

  private resolveSkillName(skillIdOrName: string, allSkills: Skill[]): string {
    const match = allSkills.find((s) => s.id === skillIdOrName || s.name === skillIdOrName);
    return match ? match.name : skillIdOrName;
  }

  private extractJSON(text: string): string {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : '{}';
  }
}

