import { useState, type ChangeEvent } from "react";
import type { KnowledgeGraph } from "@learn-anything/contracts";
import { parseResearchProposal, type ResourceResearchProposal, type ResearchSignals } from "@learn-anything/researcher";

const signalLabels: Array<[keyof ResearchSignals, string]> = [
  ["relevance", "Relevance"],
  ["authority", "Authority"],
  ["pedagogicalFit", "Teaching fit"],
  ["accessibility", "Accessibility"],
  ["freshness", "Freshness"],
  ["licenseClarity", "License clarity"],
  ["transparency", "Transparency"],
  ["versionMatch", "Version match"],
  ["learnerUsefulness", "Learner evidence"],
];
const MAX_PROPOSAL_FILE_BYTES = 64_000;

export function ResearchReview({ graph }: { graph: KnowledgeGraph }) {
  const [proposal, setProposal] = useState<ResourceResearchProposal>();
  const [notice, setNotice] = useState("Run the local researcher, then import its JSON proposal here for review.");

  async function importProposal(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    try {
      if (file.size > MAX_PROPOSAL_FILE_BYTES) throw new Error("Research proposal is too large to review safely.");
      const next = parseResearchProposal(await file.text());
      if (next.brief.graphId !== graph.id || next.brief.graphVersion !== graph.version) {
        throw new Error(`This proposal targets ${next.brief.graphId} ${next.brief.graphVersion}, not the active ${graph.id} ${graph.version} graph.`);
      }
      if (!graph.nodes.some((node) => node.id === next.brief.capabilityId && node.kind === "capability")) {
        throw new Error(`This graph does not include the proposed capability: ${next.brief.capabilityId}`);
      }
      setProposal(next);
      setNotice(`Loaded ${next.candidates.length} unreviewed candidate${next.candidates.length === 1 ? "" : "s"}. No graph changes were applied.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import this research proposal.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <aside className="research-review" aria-labelledby="research-review-title">
      <div className="research-review-heading">
        <div>
          <p className="eyebrow">Optional intelligence · review only</p>
          <h2 id="research-review-title">Research proposals stay separate from the map.</h2>
        </div>
        <label className="file-button">Import proposal<input data-testid="research-proposal-input" type="file" accept="application/json,.json" onChange={(event) => void importProposal(event)} /></label>
      </div>
      <p className="research-notice" data-testid="research-status" aria-live="polite">{notice}</p>
      {proposal !== undefined && (
        <div data-testid="research-proposal">
          <p className="proposal-meta">
            <strong>{proposal.brief.capabilityTitle}</strong> · {proposal.trust} · {proposal.method.provider} / {proposal.method.model} · {proposal.method.reportedTokenUsage === null ? "usage unavailable" : `${proposal.method.reportedTokenUsage.toLocaleString()} CLI-reported tokens`}
          </p>
          <p><strong>Disclosed query:</strong> {proposal.brief.disclosedQuery}</p>
          <ol className="candidate-list">
            {proposal.candidates.map((candidate) => (
              <li key={candidate.id}>
                <div className="candidate-heading">
                  <span className="candidate-rank">#{candidate.rank}</span>
                  <div>
                    <h3><a href={candidate.url} target="_blank" rel="noreferrer">{candidate.title} <span aria-hidden="true">↗</span></a></h3>
                    <p>{candidate.publisher} · {candidate.sourceType} · {candidate.format} · {candidate.access}</p>
                  </div>
                </div>
                <p>{candidate.description}</p>
                <p><strong>Why it may fit:</strong> {candidate.rationale}</p>
                <dl className="signal-list">
                  {signalLabels.map(([key, label]) => <div key={key}><dt>{label}</dt><dd data-signal={candidate.signals[key]}>{candidate.signals[key]}</dd></div>)}
                </dl>
                <p className="rights-warning"><strong>Rights:</strong> unknown · link-only until the exact resource and edition are reviewed.</p>
              </li>
            ))}
          </ol>
          <details className="receipt-list">
            <summary>Pipeline receipts</summary>
            <ol>{proposal.receipts.map((receipt) => <li key={receipt.stage}><strong>{receipt.stage}</strong> · {receipt.status} — {receipt.detail}</li>)}</ol>
          </details>
        </div>
      )}
    </aside>
  );
}
