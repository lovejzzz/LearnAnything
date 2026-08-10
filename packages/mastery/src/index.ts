import type { EvidenceRecord, GraphNode } from "@learn-anything/contracts";

export type DiagnosticAnswers = Readonly<Record<string, string>>;

export interface DiagnosticEvaluation {
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  unansweredQuestionIds: string[];
}

function diagnosticFor(check: GraphNode) {
  if (check.kind !== "mastery-check" || check.mastery?.diagnostic === undefined) {
    throw new Error(`${check.id} is not a deterministic diagnostic mastery check`);
  }
  return check.mastery.diagnostic;
}

export function evaluateDiagnostic(check: GraphNode, answers: DiagnosticAnswers): DiagnosticEvaluation {
  const diagnostic = diagnosticFor(check);
  const unansweredQuestionIds = diagnostic.questions
    .filter((question) => answers[question.id] === undefined)
    .map((question) => question.id);
  const correctAnswers = diagnostic.questions.filter(
    (question) => answers[question.id] === question.correctOptionId,
  ).length;
  const totalQuestions = diagnostic.questions.length;
  const score = totalQuestions === 0 ? 0 : correctAnswers / totalQuestions;
  return {
    passed: unansweredQuestionIds.length === 0 && score >= diagnostic.passingScore,
    score,
    correctAnswers,
    totalQuestions,
    unansweredQuestionIds,
  };
}

export interface DiagnosticEvidenceInput {
  check: GraphNode;
  capabilityId: string;
  answers: DiagnosticAnswers;
  evidenceId: string;
  recordedAt: string;
  graphVersion: string;
}

export function createDiagnosticEvidence(input: DiagnosticEvidenceInput): {
  evaluation: DiagnosticEvaluation;
  evidence: EvidenceRecord;
} {
  const evaluation = evaluateDiagnostic(input.check, input.answers);
  const evidence: EvidenceRecord = {
    id: input.evidenceId,
    capabilityId: input.capabilityId,
    evidenceType: "diagnostic",
    evaluator: "deterministic",
    result: evaluation.passed ? "independent" : "insufficient",
    confidence: 0.95,
    conditions: `Offline diagnostic: ${evaluation.correctAnswers}/${evaluation.totalQuestions} correct with no hints.`,
    recordedAt: input.recordedAt,
    graphVersion: input.graphVersion,
    masteryCheckId: input.check.id,
  };
  return { evaluation, evidence };
}
