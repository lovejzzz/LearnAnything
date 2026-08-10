import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { KnowledgeGraph } from "@learn-anything/contracts";
import { buildResearchProposal, createResearchBrief } from "@learn-anything/researcher";

const fixtures = [
  {
    name: "quantum physics",
    domainId: "quantum-physics-foundations",
    targetId: "q.cap.two-path-interference",
    diagnosticCapabilityId: "q.cap.probability-models",
    diagnosticAnswers: ["1/2", "The model remains 1/2; 14/20 describes this observed sample."],
    remainingCapabilities: ["q.cap.complex-amplitudes", "q.cap.wave-behavior", "q.cap.two-path-interference"],
  },
  {
    name: "philosophy",
    domainId: "philosophy-argument-paths",
    targetId: "p.cap.defend-revision",
    diagnosticCapabilityId: "p.cap.reconstruct-argument",
    diagnosticAnswers: ["This policy deserves consideration.", "Protected lanes can make routes safer; safer routes can increase cycling; increased cycling can reduce car trips; fewer car trips can reduce congestion; therefore the city has a congestion-related reason to add protected lanes."],
    remainingCapabilities: ["p.cap.compare-positions", "p.cap.defend-revision"],
  },
  {
    name: "Minecraft Redstone",
    domainId: "minecraft-redstone-engineering",
    targetId: "m.cap.debug-build",
    diagnosticCapabilityId: "m.cap.power-components",
    diagnosticAnswers: ["14", "Full strength 15 after its configured delay."],
    remainingCapabilities: ["m.cap.timing", "m.cap.logic-circuits", "m.cap.debug-build"],
  },
];

for (const fixture of fixtures) {
  test(`${fixture.name}: plan, demonstrate, and deterministically replan`, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Choose a destination", { exact: false })).toBeVisible();
    await page.getByTestId("domain-select").selectOption(fixture.domainId);
    await page.getByTestId("target-select").selectOption(fixture.targetId);
    await page.getByLabel("Hours available this week").fill("30");

    const priorCapabilities = page.getByTestId("prior-capabilities").locator('input[type="checkbox"]');
    for (let index = 0; index < await priorCapabilities.count(); index += 1) await priorCapabilities.nth(index).check();

    await page.getByTestId("build-path").click();
    await expect(page.getByTestId("journey-steps")).toContainText("Stage 1");
    await expect(page.getByTestId("plan-summary")).toContainText("estimated hours");
    await expect(page.getByTestId("horizon-summary")).toContainText("scheduled this week");
    await expect(page.getByText("Frontier ·", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("supported", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId(`horizon-action-learn-${fixture.diagnosticCapabilityId}`)).toBeVisible();
    await expect(page.getByTestId(`horizon-action-practice-${fixture.diagnosticCapabilityId}`)).toBeVisible();
    await expect(page.getByTestId(`horizon-action-demonstrate-${fixture.diagnosticCapabilityId}`)).toBeVisible();

    for (const answer of fixture.diagnosticAnswers) await page.getByLabel(answer, { exact: true }).check();
    await page.getByTestId(`submit-diagnostic-${fixture.diagnosticCapabilityId}`).click();
    await expect(page.getByRole("status")).toContainText("Diagnostic passed");

    for (const [index, capabilityId] of fixture.remainingCapabilities.entries()) {
      const masteryButton = page.getByTestId(`record-mastery-${capabilityId}`);
      await expect(masteryButton).toBeVisible();
      await expect(masteryButton).toBeDisabled();
      await page.getByTestId(`artifact-${capabilityId}`).fill(`local-artifacts/${capabilityId}.md`);
      const evaluator = page.getByTestId(`evaluator-${capabilityId}`);
      if (await evaluator.count()) await evaluator.fill(`review-note-${capabilityId}`);
      await page.getByTestId(`attestation-${capabilityId}`).check();
      await expect(masteryButton).toBeEnabled();
      await masteryButton.click();
      await expect(page.getByText(`${index + 3} versions preserved`)).toBeVisible();
    }

    await expect(page.getByTestId("journey-complete")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("path was replanned");
  });
}

test("project export, clear, and import restores browser state", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("domain-select").selectOption("quantum-physics-foundations");
  await page.getByLabel("Hours available this week").fill("10");
  await page.getByTestId("build-path").click();
  await expect(page.getByText("Plan identity", { exact: false })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Path planned");

  await page.reload();
  await expect(page.getByRole("status")).toContainText("Restored 1 saved plan.");
  await expect(page.getByText("1 version preserved")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("status")).toContainText("unchanged");
  await expect(page.getByText("Plan identity", { exact: false })).toBeVisible();

  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("status")).toContainText("cleared");
  await page.getByLabel("Import", { exact: true }).setInputFiles(downloadPath!);
  await expect(page.getByRole("status")).toContainText("restored");
  await expect(page.getByText("Plan identity", { exact: false })).toBeVisible();
});

test("an unsupported-domain import is rejected without replacing the saved project", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("domain-select").selectOption("philosophy-argument-paths");
  await page.getByTestId("build-path").click();
  await expect(page.getByRole("status")).toContainText("Path planned");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  const exported = JSON.parse(await readFile(downloadPath!, "utf8"));
  exported.activeGraphId = "unsupported-domain";
  await page.getByLabel("Import", { exact: true }).setInputFiles({
    name: "unsupported-domain.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });

  await expect(page.getByRole("status")).toContainText("does not include the imported domain");
  await expect(page.getByTestId("domain-select")).toHaveValue("philosophy-argument-paths");
  await page.reload();
  await expect(page.getByTestId("domain-select")).toHaveValue("philosophy-argument-paths");
  await expect(page.getByRole("status")).toContainText("Restored 1 saved plan.");
});

test("an AI research proposal stays visibly unreviewed and does not mutate the map", async ({ page }) => {
  const graph = JSON.parse(await readFile(new URL("../examples/quantum-physics.graph.json", import.meta.url), "utf8")) as KnowledgeGraph;
  const brief = createResearchBrief(graph, "q.cap.two-path-interference", "2026-08-10T07:00:00.000Z");
  const signals = {
    authority: "strong",
    relevance: "strong",
    pedagogicalFit: "strong",
    accessibility: "strong",
    freshness: "moderate",
    transparency: "strong",
    licenseClarity: "unknown",
    versionMatch: "moderate",
    learnerUsefulness: "unknown",
  } as const;
  const proposal = buildResearchProposal(brief, {
    schemaVersion: "0.1.0",
    warnings: [],
    candidates: [{
      title: "Candidate two-path simulation",
      url: "https://example.org/two-path",
      publisher: "Example Lab",
      sourceType: "official",
      format: "simulation",
      access: "free",
      description: "A focused candidate simulation.",
      rationale: "It directly exercises the selected capability.",
      signals,
    }],
  }, { provider: "codex-cli", model: "test-model" }, "2026-08-10T07:01:00.000Z");

  await page.goto("/");
  await expect(page.getByText("Target · unseen")).toBeVisible();
  await page.getByTestId("research-proposal-input").setInputFiles({
    name: "research-proposal.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(proposal)),
  });

  await expect(page.getByTestId("research-status")).toContainText("1 unreviewed candidate");
  await expect(page.getByTestId("research-proposal")).toContainText("ai-proposed-unreviewed");
  await expect(page.getByTestId("research-proposal")).toContainText("unknown · link-only");
  await expect(page.getByText("Target · unseen")).toBeVisible();
  await expect(page.getByText("No graph changes were applied.")).toBeVisible();

  await page.getByTestId("domain-select").selectOption("philosophy-argument-paths");
  await expect(page.getByTestId("research-proposal")).toHaveCount(0);
  await expect(page.getByTestId("research-status")).toContainText("Run the local researcher");

  await page.getByTestId("research-proposal-input").setInputFiles({
    name: "wrong-graph-proposal.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(proposal)),
  });
  await expect(page.getByTestId("research-status")).toContainText("not the active philosophy-argument-paths");
  await expect(page.getByTestId("research-proposal")).toHaveCount(0);
});

test("oversized research proposals are rejected before parsing", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("research-proposal-input").setInputFiles({
    name: "oversized-proposal.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(64_001, 32),
  });
  await expect(page.getByTestId("research-status")).toContainText("too large to review safely");
  await expect(page.getByTestId("research-proposal")).toHaveCount(0);
});

test("semantic surfaces, named status, branches, keyboard use, and reduced motion remain accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Journey" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible();
  await expect(page.getByText("Target · unseen")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.reload();

  for (let index = 0; index < 8; index += 1) {
    if (await page.getByTestId("domain-select").evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(page.getByTestId("domain-select")).toBeFocused();
  await page.keyboard.type("Philosophy");
  await expect(page.getByTestId("domain-select")).toHaveValue("philosophy-argument-paths");
  await expect(page.getByText("Branches and contrasts")).toBeVisible();
  await expect(page.getByText("alternative-to")).toBeVisible();
});

test("phone layout has no horizontal overflow and keeps primary touch targets usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const dimensions = await page.locator("html").evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  for (const target of await page.locator(".wordmark, .check-option").all()) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await page.getByTestId("build-path").click();
  await expect(page.locator("code")).toHaveCSS("color", "rgb(32, 37, 31)");
});

test("production surface exposes health and browser security policy", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toEqual({ status: "ok", service: "learn-anything" });

  const home = await request.get("/");
  expect(home.ok()).toBe(true);
  expect(await home.text()).toContain('<link rel="icon" href="/og.png" type="image/png"');
  expect(home.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");

  const icon = await request.get("/og.png");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toBe("image/png");
});
