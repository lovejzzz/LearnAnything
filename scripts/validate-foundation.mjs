import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const expectedDomains = new Set([
  'minecraft-redstone.graph.json',
  'philosophy.graph.json',
  'quantum-physics.graph.json',
]);
const nodeKinds = new Set([
  'concept',
  'capability',
  'resource',
  'experience',
  'mastery-check',
  'milestone',
]);
const relations = new Set([
  'requires',
  'supports',
  'teaches',
  'assesses',
  'contains',
  'applies-in',
  'contrasts-with',
  'alternative-to',
]);
const depths = new Set(['orientation', 'foundation', 'working', 'advanced']);
const contentUses = new Set([
  'link-only',
  'metadata',
  'excerpt',
  'redistributable',
  'repository-authored',
]);
const idPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(relativePath) {
  const text = await readFile(join(root, relativePath), 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} contains duplicate IDs`);
}

function assertKnownRefs(refs, known, label) {
  for (const ref of refs ?? []) {
    assert(known.has(ref), `${label} references unknown ID ${ref}`);
  }
}

function assertRequiresAcyclic(graph, fileName) {
  const adjacency = new Map();
  for (const node of graph.nodes) adjacency.set(node.id, []);
  for (const edge of graph.edges) {
    if (edge.relation === 'requires') adjacency.get(edge.from).push(edge.to);
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(id, trail) {
    if (visiting.has(id)) {
      throw new Error(`${fileName} contains a requires cycle: ${[...trail, id].join(' -> ')}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of adjacency.get(id)) visit(next, [...trail, id]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of adjacency.keys()) visit(id, []);
}

function validateGraph(graph, fileName) {
  assert(graph.schemaVersion === '0.1.0', `${fileName} has an unsupported schemaVersion`);
  assert(idPattern.test(graph.id), `${fileName} has an invalid graph ID`);
  assert(typeof graph.version === 'string' && graph.version, `${fileName} needs a version`);
  assert(typeof graph.title === 'string' && graph.title, `${fileName} needs a title`);
  assert(Array.isArray(graph.nodes) && graph.nodes.length > 0, `${fileName} needs nodes`);
  assert(Array.isArray(graph.edges), `${fileName} needs edges`);
  assert(Array.isArray(graph.sources) && graph.sources.length > 0, `${fileName} needs sources`);

  const nodeIds = graph.nodes.map((node) => node.id);
  const sourceIds = graph.sources.map((source) => source.id);
  assertUnique(nodeIds, `${fileName} nodes`);
  assertUnique(sourceIds, `${fileName} sources`);

  const knownNodes = new Set(nodeIds);
  const knownSources = new Set(sourceIds);
  const kindsPresent = new Set();

  for (const node of graph.nodes) {
    assert(idPattern.test(node.id), `${fileName} node ${node.id} has an invalid ID`);
    assert(nodeKinds.has(node.kind), `${fileName} node ${node.id} has unknown kind ${node.kind}`);
    assert(depths.has(node.depth), `${fileName} node ${node.id} has unknown depth ${node.depth}`);
    assert(typeof node.title === 'string' && node.title, `${fileName} node ${node.id} needs a title`);
    assert(typeof node.summary === 'string' && node.summary, `${fileName} node ${node.id} needs a summary`);
    assert(Number.isFinite(node.estimatedHours) && node.estimatedHours >= 0, `${fileName} node ${node.id} has invalid estimatedHours`);
    assertKnownRefs(node.sourceRefs, knownSources, `${fileName} node ${node.id}`);
    if (node.kind === 'resource') {
      assert(node.resource?.url, `${fileName} resource ${node.id} needs resource metadata`);
    }
    if (node.kind === 'mastery-check') {
      assert(node.mastery?.instructions, `${fileName} mastery check ${node.id} needs instructions`);
      if (node.mastery?.diagnostic) {
        assert(node.mastery.evaluation === 'deterministic', `${fileName} diagnostic ${node.id} must use deterministic evaluation`);
        assert(node.mastery.diagnostic.questions.length > 0, `${fileName} diagnostic ${node.id} needs questions`);
        for (const question of node.mastery.diagnostic.questions) {
          assert(question.options.some((option) => option.id === question.correctOptionId), `${fileName} diagnostic ${node.id} has an unknown correct option`);
        }
      }
    }
    kindsPresent.add(node.kind);
  }

  for (const requiredKind of ['capability', 'resource', 'mastery-check']) {
    assert(kindsPresent.has(requiredKind), `${fileName} must exercise the ${requiredKind} kind`);
  }

  for (const source of graph.sources) {
    assert(idPattern.test(source.id), `${fileName} source ${source.id} has an invalid ID`);
    assert(contentUses.has(source.contentUse), `${fileName} source ${source.id} has unknown contentUse`);
    assert(source.license && typeof source.license.status === 'string', `${fileName} source ${source.id} needs a license record`);
    if (source.license.status === 'unknown' || source.license.status === 'restricted') {
      assert(source.contentUse === 'link-only', `${fileName} source ${source.id} must remain link-only with ${source.license.status} rights`);
      assert(!source.license.redistributionAllowed, `${fileName} source ${source.id} cannot allow redistribution`);
    }
    if (source.contentUse === 'redistributable') {
      assert(source.license.status === 'verified', `${fileName} source ${source.id} must have a verified license before redistribution`);
      assert(source.license.redistributionAllowed, `${fileName} source ${source.id} must explicitly allow redistribution`);
    }
    if (source.contentUse === 'repository-authored') {
      assert(source.license.status === 'repository-owned', `${fileName} source ${source.id} must be repository-owned`);
    }
  }

  for (const edge of graph.edges) {
    assert(knownNodes.has(edge.from), `${fileName} edge starts at unknown node ${edge.from}`);
    assert(knownNodes.has(edge.to), `${fileName} edge ends at unknown node ${edge.to}`);
    assert(edge.from !== edge.to, `${fileName} edge cannot refer to the same node twice`);
    assert(relations.has(edge.relation), `${fileName} edge has unknown relation ${edge.relation}`);
    assert(typeof edge.rationale === 'string' && edge.rationale, `${fileName} edge needs a rationale`);
    assertKnownRefs(edge.sourceRefs, knownSources, `${fileName} edge ${edge.from} -> ${edge.to}`);
  }

  assertRequiresAcyclic(graph, fileName);
  return { graph, knownNodes };
}

function transitivePrerequisites(graph, targets) {
  const incoming = new Map(graph.nodes.map((node) => [node.id, []]));
  for (const edge of graph.edges) {
    if (edge.relation === 'requires') incoming.get(edge.to).push(edge.from);
  }
  const closure = new Set();
  const stack = [...targets];
  while (stack.length) {
    const id = stack.pop();
    for (const prerequisite of incoming.get(id) ?? []) {
      if (!closure.has(prerequisite)) {
        closure.add(prerequisite);
        stack.push(prerequisite);
      }
    }
  }
  return closure;
}

async function validateSchemas() {
  const schemaFiles = (await readdir(join(root, 'schemas'))).filter((name) => name.endsWith('.schema.json'));
  assert(schemaFiles.length === 4, `expected 4 JSON schemas, found ${schemaFiles.length}`);
  for (const fileName of schemaFiles) {
    const schema = await readJson(join('schemas', fileName));
    assert(schema.$schema === 'https://json-schema.org/draft/2020-12/schema', `${fileName} must use JSON Schema 2020-12`);
    const expectedVersion = fileName === 'learning-path.schema.json' ? '0.2.0' : '0.1.0';
    assert(schema.properties?.schemaVersion?.const === expectedVersion, `${fileName} must freeze schemaVersion ${expectedVersion}`);
  }
}

async function validateDocs() {
  const required = [
    'AGENTS.md',
    'README.md',
    'docs/ARCHITECTURE.md',
    'docs/BUILD_HANDOFF.md',
    'docs/LEARNING_MODEL.md',
    'docs/MVP.md',
    'docs/PRODUCT.md',
    'docs/RESEARCHER.md',
  ];
  for (const relativePath of required) {
    const text = await readFile(join(root, relativePath), 'utf8');
    assert(text.trim().length >= 400, `${relativePath} is unexpectedly thin`);
  }
}

async function main() {
  await validateDocs();
  await validateSchemas();

  const exampleFiles = await readdir(join(root, 'examples'));
  const graphFiles = exampleFiles.filter((name) => name.endsWith('.graph.json'));
  assert(graphFiles.length === expectedDomains.size, `expected ${expectedDomains.size} domain fixtures, found ${graphFiles.length}`);
  for (const expected of expectedDomains) assert(graphFiles.includes(expected), `missing domain fixture ${expected}`);

  const graphs = new Map();
  for (const fileName of graphFiles) {
    const graph = await readJson(join('examples', fileName));
    const validated = validateGraph(graph, fileName);
    graphs.set(graph.id, validated);
  }

  const learner = await readJson('examples/learner-state.json');
  assert(learner.schemaVersion === '0.1.0', 'learner-state.json has an unsupported schemaVersion');
  assert(Array.isArray(learner.capabilities), 'learner-state.json needs capabilities');
  assert(Array.isArray(learner.evidence), 'learner-state.json needs evidence');

  const path = await readJson('examples/quantum-path.json');
  assert(path.schemaVersion === '0.2.0', 'quantum-path.json has an unsupported schemaVersion');
  const quantum = graphs.get(path.graphId);
  assert(quantum, `quantum-path.json references unknown graph ${path.graphId}`);
  const targets = new Set(path.goal.targetCapabilityIds);
  assertKnownRefs(targets, quantum.knownNodes, 'quantum-path goal');
  const prerequisites = transitivePrerequisites(quantum.graph, targets);
  const demonstrated = new Set(
    learner.capabilities
      .filter((entry) => entry.status === 'independent' || entry.status === 'transfer')
      .map((entry) => entry.capabilityId),
  );
  const expectedSteps = new Set([...targets, ...prerequisites].filter((id) => !demonstrated.has(id)));
  const actualSteps = new Set(path.steps.map((step) => step.capabilityId));
  assertUnique(path.steps.map((step) => step.capabilityId), 'quantum-path steps');
  assert(actualSteps.size === expectedSteps.size && [...expectedSteps].every((id) => actualSteps.has(id)), 'quantum-path steps must equal target prerequisite closure minus demonstrated capabilities');
  assert(path.horizon.capabilityIds.every((id) => actualSteps.has(id)), 'quantum-path horizon must be a subset of remaining steps');
  assert(Array.isArray(path.horizon.items), 'quantum-path horizon needs budgeted action items');
  assert(path.horizon.items.reduce((sum, item) => sum + item.estimatedHours, 0) <= path.horizon.budgetHours, 'quantum-path horizon actions exceed the budget');

  console.log(`Foundation valid: ${graphFiles.length} domain graphs, ${[...graphs.values()].reduce((sum, item) => sum + item.graph.nodes.length, 0)} nodes, ${[...graphs.values()].reduce((sum, item) => sum + item.graph.edges.length, 0)} edges, 4 schemas.`);
}

main().catch((error) => {
  console.error(`Foundation validation failed: ${error.message}`);
  process.exitCode = 1;
});
