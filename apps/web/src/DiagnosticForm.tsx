import { useState, type FormEvent } from "react";
import type { GraphNode } from "@learn-anything/contracts";
import type { DiagnosticAnswers } from "@learn-anything/mastery";

export function DiagnosticForm({
  check,
  capabilityId,
  busy,
  onSubmit,
}: {
  check: GraphNode;
  capabilityId: string;
  busy: boolean;
  onSubmit: (answers: DiagnosticAnswers) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const diagnostic = check.mastery?.diagnostic;
  if (diagnostic === undefined) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(answers);
  }

  return (
    <form className="diagnostic" onSubmit={submit}>
      <p><strong>Short offline diagnostic</strong> · {diagnostic.questions.length} questions · {Math.round(diagnostic.passingScore * 100)}% required</p>
      {diagnostic.questions.map((question, questionIndex) => (
        <fieldset key={question.id}>
          <legend>{questionIndex + 1}. {question.prompt}</legend>
          {question.options.map((option) => (
            <label className="check-option" key={option.id}>
              <input
                type="radio"
                name={`${check.id}-${question.id}`}
                value={option.id}
                checked={answers[question.id] === option.id}
                onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <button
        data-testid={`submit-diagnostic-${capabilityId}`}
        className="primary"
        type="submit"
        disabled={busy || diagnostic.questions.some((question) => answers[question.id] === undefined)}
      >
        Check answers & replan
      </button>
    </form>
  );
}
