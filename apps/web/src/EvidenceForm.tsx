import { useState, type FormEvent } from "react";
import type { Evaluator } from "@learn-anything/contracts";
import type { MasterySubmission } from "./project-actions";

export function EvidenceForm({
  capabilityId,
  evaluation,
  busy,
  onSubmit,
}: {
  capabilityId: string;
  evaluation: Evaluator;
  busy: boolean;
  onSubmit: (submission: MasterySubmission) => void;
}) {
  const [artifactRef, setArtifactRef] = useState("");
  const [evaluatorRef, setEvaluatorRef] = useState("");
  const [attested, setAttested] = useState(false);
  const needsEvaluator = evaluation === "peer" || evaluation === "expert";
  const ready = artifactRef.trim().length > 0 && attested && (!needsEvaluator || evaluatorRef.trim().length > 0);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) return;
    onSubmit({ artifactRef, ...(needsEvaluator ? { evaluatorRef } : {}), attested });
  }

  return (
    <form className="evidence-form" onSubmit={submit}>
      <label>
        Evidence reference
        <textarea
          data-testid={`artifact-${capabilityId}`}
          value={artifactRef}
          onChange={(event) => setArtifactRef(event.target.value)}
          placeholder="A local filename, project URL, notebook page, or concise artifact description"
          rows={3}
          required
        />
      </label>
      {needsEvaluator && (
        <label>
          {evaluation === "peer" ? "Peer" : "Expert"} evaluator reference
          <input
            data-testid={`evaluator-${capabilityId}`}
            type="text"
            value={evaluatorRef}
            onChange={(event) => setEvaluatorRef(event.target.value)}
            placeholder="Name, handle, review note, or other auditable reference"
            required
          />
        </label>
      )}
      <label className="attestation">
        <input
          data-testid={`attestation-${capabilityId}`}
          type="checkbox"
          checked={attested}
          onChange={(event) => setAttested(event.target.checked)}
        />
        <span>I completed the evidence instructions and recorded the evaluator honestly.</span>
      </label>
      <button data-testid={`record-mastery-${capabilityId}`} type="submit" className="primary" disabled={busy || !ready}>
        Record evidence &amp; replan
      </button>
    </form>
  );
}
