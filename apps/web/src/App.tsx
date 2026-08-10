import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { GraphNode, HorizonAction, LearningGoal, LearningProject, PathStep } from "@learn-anything/contracts";
import { createGraphIndex, directPrerequisites } from "@learn-anything/knowledge-graph";
import { deriveCapabilityStatus } from "@learn-anything/learner-model";
import type { DiagnosticAnswers } from "@learn-anything/mastery";
import { appendActivity, ProjectStore } from "@learn-anything/project-store";
import { domainById, domains } from "./domain-data";
import { IndexedDbStorage } from "./indexed-db-storage";
import { DiagnosticForm } from "./DiagnosticForm";
import { EvidenceForm } from "./EvidenceForm";
import {
  buildPlan,
  createProject,
  recordDiagnosticAndReplan,
  recordMasteryAndReplan,
  type MasterySubmission,
} from "./project-actions";

const store = new ProjectStore(new IndexedDbStorage());

function timestamp(): string {
  return new Date().toISOString();
}

function capabilityNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((node) => node.kind === "capability");
}

export function App() {
  const initialDomain = domains[0]!;
  const [domainId, setDomainId] = useState(initialDomain.graph.id);
  const [targetId, setTargetId] = useState(initialDomain.defaultTargetId);
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [priorIds, setPriorIds] = useState<string[]>([]);
  const [project, setProject] = useState<LearningProject>();
  const [notice, setNotice] = useState("Loading your local project…");
  const [busy, setBusy] = useState(false);

  const domain = domainById(domainId);
  const graph = domain.graph;
  const index = useMemo(() => createGraphIndex(graph), [graph]);
  const capabilities = useMemo(() => capabilityNodes(graph.nodes), [graph]);
  const branchEdges = graph.edges.filter((edge) => edge.relation === "alternative-to" || edge.relation === "contrasts-with");
  const currentPlan = project?.planHistory.at(-1)?.graphId === graph.id ? project.planHistory.at(-1) : undefined;
  const frontierStage = currentPlan?.steps[0]?.stage;
  const frontierIds = new Set(currentPlan?.steps.filter((step) => step.stage === frontierStage).map((step) => step.capabilityId) ?? []);
  const target = index.nodes.get(targetId);

  useEffect(() => {
    void store.load().then((saved) => {
      if (saved === undefined) {
        setProject(createProject(initialDomain.graph, timestamp()));
        setNotice("Everything stays in this browser unless you export it.");
        return;
      }
      const savedDomain = domainById(saved.activeGraphId);
      setProject(saved);
      setDomainId(savedDomain.graph.id);
      setTargetId(saved.goals.at(-1)?.targetCapabilityIds[0] ?? savedDomain.defaultTargetId);
      setHoursPerWeek(saved.learnerState.preferences.hoursPerWeek);
      setNotice(`Restored ${saved.planHistory.length} saved plan${saved.planHistory.length === 1 ? "" : "s"}.`);
    }).catch((error: unknown) => {
      setProject(createProject(initialDomain.graph, timestamp()));
      setNotice(error instanceof Error ? error.message : "Local storage could not be opened.");
    });
  }, []);

  async function persist(next: LearningProject, message: string) {
    setProject(next);
    try {
      await store.save(next);
      setNotice(message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save locally.");
    }
  }

  function selectDomain(nextDomainId: string) {
    const nextDomain = domainById(nextDomainId);
    setDomainId(nextDomain.graph.id);
    setTargetId(nextDomain.defaultTargetId);
    setPriorIds([]);
    setNotice(`Showing the complete ${nextDomain.graph.title} fixture.`);
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    if (project === undefined || target === undefined) return;
    setBusy(true);
    const goal: LearningGoal = {
      description: target.title,
      targetCapabilityIds: [target.id],
      desiredDepth: target.depth,
      purpose: "Reach the selected capability through demonstrated prerequisite mastery.",
      hoursPerWeek,
    };
    try {
      const next = buildPlan(project, graph, goal, priorIds, timestamp());
      await persist(next, `Path planned. ${next.planHistory.at(-1)?.horizon.items.length ?? 0} action(s) fit this week.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not build the path.");
    } finally {
      setBusy(false);
    }
  }

  async function recordMastery(step: PathStep, submission: MasterySubmission) {
    if (project === undefined) return;
    setBusy(true);
    try {
      const next = recordMasteryAndReplan(project, graph, step, submission, timestamp());
      await persist(next, "Mastery evidence recorded. The path was replanned without changing its history.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not record mastery.");
    } finally {
      setBusy(false);
    }
  }

  async function recordDiagnostic(step: PathStep, checkId: string, answers: DiagnosticAnswers) {
    if (project === undefined) return;
    setBusy(true);
    try {
      const result = recordDiagnosticAndReplan(project, graph, step, checkId, answers, timestamp());
      const message = result.evaluation.passed
        ? `Diagnostic passed (${result.evaluation.correctAnswers}/${result.evaluation.totalQuestions}). Independent evidence recorded and path replanned.`
        : `Diagnostic result: ${result.evaluation.correctAnswers}/${result.evaluation.totalQuestions}. The capability remains in the path.`;
      await persist(result.project, message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not evaluate the diagnostic.");
    } finally {
      setBusy(false);
    }
  }

  async function recordResourceOpen(resourceId: string) {
    if (project === undefined) return;
    const recordedAt = timestamp();
    const next = appendActivity(project, {
      id: `activity.${resourceId}.${recordedAt}`,
      type: "resource-open",
      resourceId,
      recordedAt,
    });
    await persist(next, "Resource open recorded as activity—not mastery evidence.");
  }

  function exportProject() {
    if (project === undefined) return;
    const blob = new Blob([store.export(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "learn-anything-project.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Project exported with learner evidence and plan history.");
  }

  async function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    try {
      const restored = await store.import(await file.text());
      const restoredDomain = domainById(restored.activeGraphId);
      setProject(restored);
      setDomainId(restoredDomain.graph.id);
      setTargetId(restored.goals.at(-1)?.targetCapabilityIds[0] ?? restoredDomain.defaultTargetId);
      setHoursPerWeek(restored.learnerState.preferences.hoursPerWeek);
      setPriorIds([]);
      setNotice(`Project restored with ${restored.learnerState.evidence.length} evidence record(s).`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import this project.");
    } finally {
      event.target.value = "";
    }
  }

  async function clearProject() {
    if (!window.confirm("Clear this browser project? Export it first if you may want to restore it.")) {
      setNotice("Clear cancelled. Your browser project is unchanged.");
      return;
    }
    await store.clear();
    setProject(createProject(graph, timestamp(), hoursPerWeek));
    setPriorIds([]);
    setNotice("Browser project cleared. Import an export to restore it.");
  }

  const stages = new Map<number, PathStep[]>();
  for (const step of currentPlan?.steps ?? []) stages.set(step.stage, [...(stages.get(step.stage) ?? []), step]);
  const horizonItems = currentPlan?.horizon.items ?? [];
  const pathHours = currentPlan?.steps.reduce((total, step) => total + step.estimatedHours, 0) ?? 0;
  const horizonHours = horizonItems.reduce((total, item) => total + item.estimatedHours, 0);

  if (project === undefined) return <main className="loading"><p aria-live="polite">{notice}</p></main>;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <a className="wordmark" href="#map">LearnAnything</a>
        <p>Map the territory. Demonstrate progress. Replan locally.</p>
        <div className="project-actions" aria-label="Local project actions">
          <button type="button" className="quiet" onClick={exportProject}>Export</button>
          <label className="file-button">Import<input type="file" accept="application/json,.json" onChange={(event) => void importProject(event)} /></label>
          <button type="button" className="quiet danger" onClick={() => void clearProject()}>Clear</button>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="orientation" aria-labelledby="orientation-title">
          <div>
            <p className="eyebrow">Offline learning project</p>
            <h1 id="orientation-title">Choose a destination, then see why each step belongs.</h1>
          </div>
          <form onSubmit={(event) => void submitGoal(event)}>
            <label>Seed domain
              <select data-testid="domain-select" value={domainId} onChange={(event) => selectDomain(event.target.value)}>
                {domains.map((item) => <option key={item.graph.id} value={item.graph.id}>{item.graph.title}</option>)}
              </select>
            </label>
            <label>Target capability
              <select data-testid="target-select" value={targetId} onChange={(event) => { setTargetId(event.target.value); setPriorIds([]); }}>
                {capabilities.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
              </select>
            </label>
            <label>Hours available this week
              <input type="number" min="1" max="40" step="1" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(Number(event.target.value))} />
            </label>
            <fieldset data-testid="prior-capabilities">
              <legend>Prior capability familiarity</legend>
              <p>Select capabilities that feel familiar. This records visible self-reported supported evidence; only a passed diagnostic or completed mastery check can establish independence.</p>
              {capabilities.filter((node) => node.id !== targetId).map((node) => (
                <label className="check-option" key={node.id}>
                  <input
                    type="checkbox"
                    value={node.id}
                    checked={priorIds.includes(node.id)}
                    onChange={(event) => setPriorIds(event.target.checked ? [...priorIds, node.id] : priorIds.filter((id) => id !== node.id))}
                  />
                  <span>{node.title}</span>
                </label>
              ))}
            </fieldset>
            <button data-testid="build-path" className="primary" type="submit" disabled={busy}>Compute my path</button>
          </form>
          <p className="notice" role="status" aria-live="polite">{notice}</p>
        </section>

        <div className="surface-flow">
          <section id="map" className="surface" aria-labelledby="map-title">
            <SurfaceHeading number="01" title="Map" question="Where am I, and where am I going?" />
            <p>{graph.description}</p>
            <ol className="map-list">
              {capabilities.map((node) => {
                const prerequisites = directPrerequisites(index, node.id);
                const status = deriveCapabilityStatus(project.learnerState, node.id, { currentDate: timestamp(), graphVersion: graph.version });
                return (
                  <li
                    key={node.id}
                    data-status={status}
                    className={[node.id === targetId ? "is-target" : "", frontierIds.has(node.id) ? "is-frontier" : ""].filter(Boolean).join(" ") || undefined}
                  >
                    <div className="map-node-line"><span className="status-mark" aria-hidden="true" /><strong>{node.title}</strong></div>
                    <span className="status-text">
                      {node.id === targetId ? "Target · " : ""}{frontierIds.has(node.id) ? "Frontier · " : ""}{status}
                    </span>
                    {prerequisites.length > 0 && <small>Requires {prerequisites.map((id) => index.nodes.get(id)?.title ?? id).join(" + ")}</small>}
                  </li>
                );
              })}
            </ol>
            {branchEdges.length > 0 && (
              <div className="branch-note">
                <h3>Branches and contrasts</h3>
                <p>These relationships remain visible without becoming false prerequisites.</p>
                <ul className="relationship-list">
                  {branchEdges.map((edge) => (
                    <li key={`${edge.from}-${edge.relation}-${edge.to}`}>
                      <strong>{index.nodes.get(edge.from)?.title ?? edge.from}</strong>
                      <span>{edge.relation}</span>
                      <strong>{index.nodes.get(edge.to)?.title ?? edge.to}</strong>
                      <small>{edge.rationale}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section id="journey" className="surface" aria-labelledby="journey-title">
            <SurfaceHeading number="02" title="Journey" question="Why does each stage exist?" />
            {currentPlan === undefined ? <p className="empty">Compute a path to turn the map into an ordered, prerequisite-closed journey.</p> : currentPlan.steps.length === 0 ? (
              <p className="success" data-testid="journey-complete">The target is currently demonstrated. Your prior plans remain in local history.</p>
            ) : (
              <>
                <p className="plan-summary" data-testid="plan-summary">
                  {currentPlan.steps.length} {currentPlan.steps.length === 1 ? "capability" : "capabilities"} · {pathHours} estimated hours · {stages.size} {stages.size === 1 ? "stage" : "stages"}
                </p>
                <ol className="stage-list" data-testid="journey-steps">
                  {[...stages.entries()].sort(([a], [b]) => a - b).map(([stage, steps]) => (
                    <li key={stage}>
                      <span className="stage-number">Stage {stage}</span>
                      <div className="stage-steps">
                        {steps.map((step) => <JourneyStep key={step.capabilityId} step={step} node={index.nodes.get(step.capabilityId)} />)}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>

          <section id="now" className="surface" aria-labelledby="now-title">
            <SurfaceHeading number="03" title="Now" question="What would count as progress this week?" />
            {currentPlan === undefined ? <p className="empty">Your seven-day horizon will appear after planning.</p> : horizonItems.length === 0 ? (
              <p className="empty" data-testid="empty-horizon">No remaining capability fits the current budget—or the target is already demonstrated.</p>
            ) : (
              <>
                <p className="plan-summary" data-testid="horizon-summary">
                  {horizonItems.length} {horizonItems.length === 1 ? "action" : "actions"} · {horizonHours} estimated hours scheduled this week
                </p>
                <ol className="now-list" data-testid="horizon-items">
                  {horizonItems.map((item) => {
                    const step = currentPlan.steps.find((candidate) => candidate.capabilityId === item.capabilityId);
                    if (step === undefined) return null;
                    return <HorizonItemView
                      key={item.id}
                      item={item}
                      step={step}
                      capability={index.nodes.get(item.capabilityId)}
                      actionNode={index.nodes.get(item.nodeId)}
                      busy={busy}
                      onResourceOpen={(resourceId) => void recordResourceOpen(resourceId)}
                      onMastery={(submission) => void recordMastery(step, submission)}
                      onDiagnostic={(checkId, answers) => void recordDiagnostic(step, checkId, answers)}
                    />;
                  })}
                </ol>
              </>
            )}
            {currentPlan && <p className="plan-identity">Plan identity <code>{currentPlan.id}</code> · {project.planHistory.length} version(s) preserved</p>}
          </section>
        </div>
      </main>
      <footer><p>No account. No API key. Learner evidence stays in IndexedDB and is exportable.</p></footer>
    </>
  );
}

function SurfaceHeading({ number, title, question }: { number: string; title: string; question: string }) {
  return <header className="surface-heading"><span>{number}</span><div><h2 id={`${title.toLowerCase()}-title`}>{title}</h2><p>{question}</p></div></header>;
}

function JourneyStep({ step, node }: { step: PathStep; node: GraphNode | undefined }) {
  return <article><h3>{node?.title ?? step.capabilityId}</h3><p>{step.reason}</p><small>{step.estimatedHours} hours · {step.resourceIds.length} resource(s) · {step.experienceIds.length} practice experience(s) · {step.masteryCheckIds.length} mastery check(s)</small></article>;
}

function HorizonItemView({
  item,
  step,
  capability,
  actionNode,
  busy,
  onResourceOpen,
  onMastery,
  onDiagnostic,
}: {
  item: HorizonAction;
  step: PathStep;
  capability: GraphNode | undefined;
  actionNode: GraphNode | undefined;
  busy: boolean;
  onResourceOpen: (resourceId: string) => void;
  onMastery: (submission: MasterySubmission) => void;
  onDiagnostic: (checkId: string, answers: DiagnosticAnswers) => void;
}) {
  return (
    <li data-testid={`horizon-action-${item.kind}-${item.capabilityId}`}>
      <p className="eyebrow">{item.kind} · {item.estimatedHours} estimated hours{item.partial ? " · partial" : ""}</p>
      <h3>{capability?.title}</h3>
      <p><strong>{actionNode?.title}</strong></p>
      <p>{actionNode?.summary}</p>
      <p className="action-reason">{item.reason}</p>
      {item.kind === "learn" && actionNode?.resource && (
        <a href={actionNode.resource.url} target="_blank" rel="noreferrer" onClick={() => onResourceOpen(actionNode.id)}>
          Open free resource <span aria-hidden="true">↗</span>
        </a>
      )}
      {item.kind === "practice" && <p className="practice-note">Complete this experience before attempting the evidence check.</p>}
      {item.kind === "demonstrate" && actionNode?.mastery && (
        <div className="mastery-check">
          <h4>Evidence instructions</h4>
          <p>{actionNode.mastery.instructions}</p>
          <p><small>Evaluation: {actionNode.mastery.evaluation}</small></p>
          {actionNode.mastery.diagnostic ? (
            <DiagnosticForm check={actionNode} capabilityId={step.capabilityId} busy={busy} onSubmit={(answers) => onDiagnostic(actionNode.id, answers)} />
          ) : (
            <EvidenceForm
              capabilityId={step.capabilityId}
              evaluation={actionNode.mastery.evaluation}
              busy={busy}
              onSubmit={onMastery}
            />
          )}
        </div>
      )}
    </li>
  );
}
