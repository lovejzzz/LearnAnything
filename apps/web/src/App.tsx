import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { GraphNode, HorizonAction, LearningGoal, LearningProject, PathStep } from "@learn-anything/contracts";
import { resolveLearningIntake, type LearningIntakeResolution } from "@learn-anything/goal-model";
import { createGraphIndex, directPrerequisites } from "@learn-anything/knowledge-graph";
import { deriveCapabilityStatus } from "@learn-anything/learner-model";
import type { DiagnosticAnswers } from "@learn-anything/mastery";
import { appendActivity, parseProjectExport, ProjectStore } from "@learn-anything/project-store";
import { domainById, domains } from "./domain-data";
import { IndexedDbStorage } from "./indexed-db-storage";
import { DiagnosticForm } from "./DiagnosticForm";
import { EvidenceForm } from "./EvidenceForm";
import { ResearchReview } from "./ResearchReview";
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

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function App() {
  const initialDomain = domains[0]!;
  const [domainId, setDomainId] = useState(initialDomain.graph.id);
  const [targetId, setTargetId] = useState(initialDomain.defaultTargetId);
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [priorIds, setPriorIds] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [intakeResolution, setIntakeResolution] = useState<LearningIntakeResolution>();
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
      const savedGoal = saved.goals.at(-1);
      setProject(saved);
      setDomainId(savedDomain.graph.id);
      setTargetId(savedGoal?.targetCapabilityIds[0] ?? savedDomain.defaultTargetId);
      setHoursPerWeek(saved.learnerState.preferences.hoursPerWeek);
      setTopic(savedDomain.graph.title);
      setDesiredOutcome(savedGoal?.description ?? "");
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

  function submitIntake(event: FormEvent) {
    event.preventDefault();
    try {
      const resolution = resolveLearningIntake({ topic, currentPosition, desiredOutcome, hoursPerWeek }, domains);
      setIntakeResolution(resolution);
      setPriorIds([]);
      if (resolution.status === "unmapped") {
        setNotice("This topic does not have a reviewed map yet. No course was generated from guesses.");
        return;
      }
      const nextDomain = domainById(resolution.graphId);
      setDomainId(nextDomain.graph.id);
      setTargetId(resolution.targetCapabilityId);
      setNotice(`Matched ${resolution.graphTitle}. Confirm the destination and your starting evidence before planning.`);
    } catch (error) {
      setIntakeResolution(undefined);
      setNotice(error instanceof Error ? error.message : "Could not interpret this learning request.");
    }
  }

  async function submitGoal(event: FormEvent) {
    event.preventDefault();
    if (project === undefined || target === undefined) return;
    setBusy(true);
    const goal: LearningGoal = {
      description: desiredOutcome.trim() || target.title,
      targetCapabilityIds: [target.id],
      desiredDepth: target.depth,
      purpose: `Reach ${target.title} in ${graph.title} through demonstrated prerequisite mastery.`,
      hoursPerWeek,
    };
    try {
      const next = buildPlan(project, graph, goal, priorIds, timestamp());
      await persist(next, `Path planned. This week includes ${countLabel(next.planHistory.at(-1)?.horizon.items.length ?? 0, "action")}.`);
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
      const restored = parseProjectExport(await file.text());
      const restoredDomain = domainById(restored.activeGraphId);
      if (restoredDomain.graph.id !== restored.activeGraphId) {
        throw new Error(`This build does not include the imported domain: ${restored.activeGraphId}`);
      }
      await store.save(restored);
      setProject(restored);
      setDomainId(restoredDomain.graph.id);
      const restoredGoal = restored.goals.at(-1);
      setTargetId(restoredGoal?.targetCapabilityIds[0] ?? restoredDomain.defaultTargetId);
      setHoursPerWeek(restored.learnerState.preferences.hoursPerWeek);
      setPriorIds([]);
      setTopic(restoredDomain.graph.title);
      setCurrentPosition("");
      setDesiredOutcome(restoredGoal?.description ?? "");
      setIntakeResolution(undefined);
      setNotice(`Project restored with ${countLabel(restored.learnerState.evidence.length, "evidence record")}.`);
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
    setTopic("");
    setCurrentPosition("");
    setDesiredOutcome("");
    setIntakeResolution(undefined);
    setNotice("Browser project cleared. Import an export to restore it.");
  }

  const stages = new Map<number, PathStep[]>();
  for (const step of currentPlan?.steps ?? []) stages.set(step.stage, [...(stages.get(step.stage) ?? []), step]);
  const horizonItems = currentPlan?.horizon.items ?? [];
  const pathHours = currentPlan?.steps.reduce((total, step) => total + step.estimatedHours, 0) ?? 0;
  const horizonHours = horizonItems.reduce((total, item) => total + item.estimatedHours, 0);
  const suggestedPriorIds = new Set(intakeResolution?.status === "resolved" && intakeResolution.graphId === graph.id
    ? intakeResolution.suggestedPriorCapabilityIds
    : []);
  const showLearningSurfaces = intakeResolution === undefined ? currentPlan !== undefined : intakeResolution.status === "resolved";

  if (project === undefined) return <main className="loading"><p aria-live="polite">{notice}</p></main>;

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <a className="wordmark" href="#main-content">LearnAnything</a>
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
            <p className="eyebrow">Your destination, your starting point</p>
            <h1 id="orientation-title">Tell us what you want to become capable of doing.</h1>
            <p className="orientation-lede">We match your words to a reviewed knowledge map, locate the gap without mistaking self-report for mastery, and build a prerequisite-correct course around your available time.</p>
          </div>
          <div className="intake-column">
            <form className="intake-form" data-testid="learning-intake" onSubmit={submitIntake}>
              <label>What do you want to learn?
                <input data-testid="topic-input" type="text" required maxLength={120} placeholder="e.g. quantum physics, philosophical arguments, or Redstone" value={topic} onChange={(event) => { setTopic(event.target.value); setIntakeResolution(undefined); }} />
              </label>
              <label>Where are you right now?
                <textarea data-testid="current-position-input" required maxLength={1_000} rows={3} placeholder="Describe what you can already explain, solve, build, or perform." value={currentPosition} onChange={(event) => { setCurrentPosition(event.target.value); setIntakeResolution(undefined); }} />
              </label>
              <label>What is your goal?
                <textarea data-testid="goal-input" required maxLength={500} rows={3} placeholder="Describe what you want to be able to do—not only what you want to read." value={desiredOutcome} onChange={(event) => { setDesiredOutcome(event.target.value); setIntakeResolution(undefined); }} />
              </label>
              <label>Hours available each week
                <input type="number" min="1" max="40" step="1" value={hoursPerWeek} onChange={(event) => setHoursPerWeek(Number(event.target.value))} />
              </label>
              <button data-testid="resolve-intake" className="primary" type="submit">Find my learning gap</button>
            </form>

            {intakeResolution?.status === "unmapped" && (
              <section className="intake-result unmapped-result" data-testid="unmapped-topic" aria-labelledby="unmapped-title">
                <p className="eyebrow">Topic not mapped yet</p>
                <h2 id="unmapped-title">We will not invent a course and call it authoritative.</h2>
                <p>{intakeResolution.reason}</p>
                <p><strong>Reviewed maps available now:</strong> {intakeResolution.availableGraphTitles.join(", ")}.</p>
                <p className="boundary-note">A future researcher milestone can turn this intake into a cited draft map for review. Your free text has not left this browser.</p>
              </section>
            )}

            {intakeResolution?.status === "resolved" && (
              <section className="intake-result resolved-result" data-testid="intake-resolution" aria-labelledby="resolved-title">
                <p className="eyebrow">Reviewed map matched · {intakeResolution.confidence}</p>
                <h2 id="resolved-title">Now confirm the destination and starting evidence.</h2>
                <dl className="intake-summary">
                  <div><dt>Topic map</dt><dd>{intakeResolution.graphTitle}</dd></div>
                  <div><dt>Your stated position</dt><dd>{currentPosition}</dd></div>
                  <div><dt>Interpreted destination</dt><dd>{target?.title ?? intakeResolution.targetCapabilityTitle}</dd></div>
                </dl>
                {intakeResolution.clarification && <p className="boundary-note">{intakeResolution.clarification}</p>}
                <form className="placement-form" onSubmit={(event) => void submitGoal(event)}>
                  <label>Approved destination capability
                    <select data-testid="target-select" value={targetId} onChange={(event) => { setTargetId(event.target.value); setPriorIds([]); }}>
                      {capabilities.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}
                    </select>
                  </label>
                  <fieldset data-testid="prior-capabilities">
                    <legend>Confirm your starting point</legend>
                    <p>Your description can suggest placement questions, but nothing is selected automatically. Checked items become visible self-reported support; only diagnostics or completed mastery checks establish independence.</p>
                    {capabilities.filter((node) => node.id !== targetId).map((node) => (
                      <label className="check-option" key={node.id}>
                        <input type="checkbox" value={node.id} checked={priorIds.includes(node.id)} onChange={(event) => setPriorIds(event.target.checked ? [...priorIds, node.id] : priorIds.filter((id) => id !== node.id))} />
                        <span>{node.title}{suggestedPriorIds.has(node.id) && <small className="suggestion">Suggested from your description</small>}</span>
                      </label>
                    ))}
                  </fieldset>
                  <button data-testid="build-path" className="primary" type="submit" disabled={busy}>Build my structured course</button>
                </form>
              </section>
            )}
          </div>
          <p className="notice" role="status" aria-live="polite">{notice}</p>
        </section>

        {showLearningSurfaces && <>
        {currentPlan && (
          <section className="gap-summary" data-testid="learning-gap" aria-labelledby="gap-title">
            <p className="eyebrow">Your learning gap</p>
            <h2 id="gap-title">From {currentPosition || "your recorded evidence"} to {target?.title ?? "the approved destination"}.</h2>
            <p>{currentPlan.steps.length === 0
              ? "Your evidence currently demonstrates the destination."
              : `${countLabel(currentPlan.steps.length, "capability", "capabilities")} remain in the prerequisite-closed route. The first unfinished stage becomes this week's horizon.`}</p>
          </section>
        )}

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
            {currentPlan && <p className="plan-identity">Plan identity <code>{currentPlan.id}</code> · {countLabel(project.planHistory.length, "version")} preserved</p>}
          </section>
        </div>
        <ResearchReview key={`${graph.id}:${graph.version}`} graph={graph} />
        </>}
      </main>
      <footer><p>No account. No API key. Learner evidence stays in IndexedDB and is exportable.</p></footer>
    </>
  );
}

function SurfaceHeading({ number, title, question }: { number: string; title: string; question: string }) {
  return <header className="surface-heading"><span>{number}</span><div><h2 id={`${title.toLowerCase()}-title`}>{title}</h2><p>{question}</p></div></header>;
}

function JourneyStep({ step, node }: { step: PathStep; node: GraphNode | undefined }) {
  return <article><h3>{node?.title ?? step.capabilityId}</h3><p>{step.reason}</p><small>{countLabel(step.estimatedHours, "hour")} · {countLabel(step.resourceIds.length, "resource")} · {countLabel(step.experienceIds.length, "practice experience")} · {countLabel(step.masteryCheckIds.length, "mastery check")}</small></article>;
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
