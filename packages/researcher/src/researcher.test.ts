import { describe, expect, test } from "vitest";
import quantumFixture from "../../../examples/quantum-physics.graph.json";
import type { KnowledgeGraph } from "@learn-anything/contracts";
import {
  buildResearchProposal,
  createResearchBrief,
  parseResearchDiscovery,
  parseResearchProposal,
  serializeResearchProposal,
  type ResearchDiscovery,
  type ResearchSignals,
} from "./index";

const graph = quantumFixture as KnowledgeGraph;
const strongSignals: ResearchSignals = {
  authority: "strong",
  relevance: "strong",
  pedagogicalFit: "strong",
  accessibility: "strong",
  freshness: "moderate",
  transparency: "strong",
  licenseClarity: "moderate",
  versionMatch: "moderate",
  learnerUsefulness: "unknown",
};

function discovery(): ResearchDiscovery {
  return {
    schemaVersion: "0.1.0",
    candidates: [
      {
        title: "Less relevant duplicate",
        url: "https://example.edu/physics/?utm_source=test",
        publisher: "Example University",
        sourceType: "open-education",
        format: "course",
        access: "free",
        description: "A broad course.",
        rationale: "Potential orientation material.",
        signals: { ...strongSignals, relevance: "moderate" },
      },
      {
        title: "Focused simulation",
        url: "https://example.org/interference",
        publisher: "Example Lab",
        sourceType: "official",
        format: "simulation",
        access: "free",
        description: "A focused two-path simulation.",
        rationale: "Directly supports the capability.",
        signals: strongSignals,
      },
      {
        title: "Duplicate canonical URL",
        url: "https://example.edu/physics#lesson",
        publisher: "Example University",
        sourceType: "open-education",
        format: "course",
        access: "free",
        description: "The same broad course.",
        rationale: "Duplicate discovery route.",
        signals: { ...strongSignals, relevance: "weak" },
      },
    ],
    warnings: [],
  };
}

describe("research proposals", () => {
  test("ranks by visible signals, canonicalizes URLs, and removes duplicates deterministically", () => {
    const brief = createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z");
    const proposal = buildResearchProposal(brief, discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    expect(proposal.candidates.map((candidate) => candidate.title)).toEqual(["Focused simulation", "Less relevant duplicate"]);
    expect(proposal.candidates.map((candidate) => candidate.rank)).toEqual([1, 2]);
    expect(proposal.warnings).toContain("Removed 1 duplicate candidate URL.");
  });

  test("forces every AI-discovered candidate to unknown-rights link-only use", () => {
    const proposal = buildResearchProposal(createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z"), discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    for (const candidate of proposal.candidates) {
      expect(candidate.contentUse).toBe("link-only");
      expect(candidate.license).toMatchObject({ status: "unknown", redistributionAllowed: false, derivativesAllowed: false });
    }
  });

  test("round trips a reviewable proposal", () => {
    const proposal = buildResearchProposal(createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z"), discovery(), { provider: "codex-cli", model: "test-model", reportedTokenUsage: 1234 }, "2026-08-10T07:01:00.000Z");
    expect(parseResearchProposal(serializeResearchProposal(proposal))).toEqual(proposal);
    expect(proposal.method.reportedTokenUsage).toBe(1234);
  });

  test("rejects proposals that claim review or redistribution", () => {
    const proposal = buildResearchProposal(createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z"), discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    expect(() => parseResearchProposal(JSON.stringify({ ...proposal, reviewStatus: "approved" }))).toThrow("Only pending");
    const unsafe = structuredClone(proposal);
    unsafe.candidates[0]!.contentUse = "redistributable" as "link-only";
    expect(() => parseResearchProposal(JSON.stringify(unsafe))).toThrow("must remain link-only");
  });

  test("rejects forged rights metadata and incomplete pipeline receipts", () => {
    const proposal = buildResearchProposal(createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z"), discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    const forgedRights = structuredClone(proposal);
    (forgedRights.candidates[0]!.license as unknown as { attributionRequired: boolean }).attributionRequired = true;
    expect(() => parseResearchProposal(JSON.stringify(forgedRights))).toThrow("unsafe license claims");

    const forgedReceipts = structuredClone(proposal);
    forgedReceipts.receipts[4]!.stage = "brief";
    expect(() => parseResearchProposal(JSON.stringify(forgedReceipts))).toThrow("receipt 5 is invalid");
  });

  test("enforces the explicit candidate budget", () => {
    const brief = createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z");
    brief.budget.maxCandidates = 1;
    const proposal = buildResearchProposal(brief, discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    expect(proposal.candidates).toHaveLength(1);
    expect(proposal.warnings).toContain("Kept the top 1 candidates to respect the research budget.");
  });

  test("rejects unsafe candidate URLs and malformed discovery signals", () => {
    const brief = createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z");
    const unsafe = discovery();
    unsafe.candidates[0]!.url = "javascript:alert(1)";
    expect(() => buildResearchProposal(brief, unsafe, { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z")).toThrow("Unsupported candidate URL protocol");

    const invalidSignals = discovery();
    invalidSignals.candidates[0]!.signals.authority = "excellent" as "strong";
    expect(() => buildResearchProposal(brief, invalidSignals, { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z")).toThrow("signals.authority is invalid");
  });

  test("rejects imported proposals with an absurd budget", () => {
    const proposal = buildResearchProposal(createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z"), discovery(), { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");
    proposal.brief.budget.maxCandidates = 10_000;
    expect(() => parseResearchProposal(JSON.stringify(proposal))).toThrow("must be between 1 and 20");
  });

  test("parses model discovery JSON before applying the same runtime validation", () => {
    const parsed = parseResearchDiscovery(JSON.stringify(discovery()));
    expect(parsed.candidates).toHaveLength(3);
    expect(() => parseResearchDiscovery("not-json")).toThrow("not valid JSON");
  });
});
