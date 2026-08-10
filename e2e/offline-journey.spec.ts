import { expect, test } from "@playwright/test";

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
      await expect(page.getByText(`${index + 3} version(s) preserved`)).toBeVisible();
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

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("status")).toContainText("cleared");
  await page.getByLabel("Import").setInputFiles(downloadPath!);
  await expect(page.getByRole("status")).toContainText("restored");
  await expect(page.getByText("Plan identity", { exact: false })).toBeVisible();
});

test("semantic surfaces, named status, branches, keyboard use, and reduced motion remain accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Map" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Journey" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Now" })).toBeVisible();
  await expect(page.getByText("Target · unseen")).toBeVisible();
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");

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

test("production surface exposes health and browser security policy", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toEqual({ status: "ok", service: "learn-anything" });

  const home = await request.get("/");
  expect(home.ok()).toBe(true);
  expect(home.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(home.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});
