import { test, expect } from "@playwright/test";
test("visitor registration, Phaser movement, panel input isolation, scoring persistence and cleanup", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/signin");
  await page.locator("input[name=name]").fill("Narin");
  await page.locator("input[name=email]").fill("narin@example.ac.th");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Continue with local profile" })
    .click();
  await page.waitForURL("**/events");
  await page.goto("/events/senior-showcase");
  await page.getByRole("button", { name: "Register for this event" }).click();
  for (const [name, value] of Object.entries({
    organisation: "KMUTT",
    position: "Year 4",
    interests: "Design",
    province: "Bangkok",
  }))
    await page.locator(`input[name=${name}]`).fill(value);
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Register & choose a character" })
    .click();
  await page.waitForURL("**/lobby");
  await page.getByRole("button", { name: "Choose Prae", exact: true }).click();
  await page.getByRole("button", { name: "Enter the showcase" }).click();
  await page.getByRole("button", { name: "Skip intro" }).click();
  const stage = page.locator(".hall-stage");
  await expect(stage).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toHaveCount(1);
  const before = Number(await stage.getAttribute("data-player-x"));
  await page.locator("canvas").focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(450);
  await page.keyboard.up("d");
  await expect
    .poll(async () => Number(await stage.getAttribute("data-player-x")))
    .toBeGreaterThan(before + 20);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .evaluate(
          (c) => c instanceof HTMLCanvasElement && c.width === c.clientWidth,
        ),
    )
    .toBe(true);
  await page.getByLabel("Search hall projects").fill("sign-language");
  await page.getByRole("button", { name: "Go to booth", exact: true }).click();
  await expect(stage).toHaveAttribute("data-zone", "booth-02");
  await page.getByRole("button", { name: "Judge", exact: true }).click();
  for (const index of [4, 9, 14, 19])
    await page.getByRole("radio").nth(index).check();
  await expect(
    page.getByRole("combobox", { name: "Assigned project" }),
  ).toHaveValue("pixel-path");
  await page.getByRole("button", { name: "Complete evaluation" }).click();
  await expect(
    page.getByRole("button", { name: "Evaluation complete" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Chat", exact: true }).click();
  await page.getByLabel("Your message").fill("Hello");
  const x = await stage.getAttribute("data-player-x");
  await page.keyboard.down("d");
  await page.waitForTimeout(250);
  await page.keyboard.up("d");
  expect(await stage.getAttribute("data-player-x")).toBe(x);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText("Hello");
  await page.reload();
  await expect(stage).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: "Judge", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Assigned project" })
    .selectOption("pixel-path");
  await expect(
    page.getByRole("button", { name: "Evaluation complete" }),
  ).toBeDisabled();
  for (let i = 0; i < 3; i++) {
    await page.getByRole("link", { name: "Leave hall", exact: true }).click();
    await page.waitForURL("**/events/senior-showcase");
    await expect(page.locator("canvas")).toHaveCount(0);
    await page.getByRole("link", { name: "Enter the showcase" }).click();
    await page.waitForURL("**/lobby");
    await page.getByRole("button", { name: "Enter the showcase" }).click();
    await expect(stage).toHaveAttribute("data-ready", "true");
    await expect(page.locator("canvas")).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});
test("submission review, event creation and module toggles persist", async ({
  page,
}) => {
  await page.goto("/workspace/submit");
  await page.locator("input[name=title]").fill("A campus accessibility guide");
  await page
    .locator("textarea[name=description]")
    .fill(
      "An accessible guide to paths and places across the university campus.",
    );
  await page.locator("textarea[name=members]").fill("team@example.ac.th");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.waitForURL("**/submissions");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeDisabled();
  await page.goto("/workspace/create-event");
  await page.locator("input[name=title]").fill("Community Ideas Day");
  await page.locator("input[name=host]").fill("KMUTT");
  await page
    .locator("textarea[name=description]")
    .fill("An event for sharing community ideas.");
  await page.locator("input[name=date]").fill("2026-11-01");
  await page.locator("input[name=time]").fill("10:00");
  await page.getByRole("button", { name: "Save event draft" }).click();
  await page.waitForURL("**/events");
  await expect(
    page.getByRole("heading", { name: "Community Ideas Day" }),
  ).toBeVisible();
  await page.goto("/workspace");
  await page.getByRole("switch", { name: "Project judging" }).uncheck();
  await expect(
    page
      .getByRole("navigation", { name: "Workspace" })
      .getByRole("link", { name: "Judging", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Project judging" }),
  ).not.toBeChecked();
});
test("public routes fit desktop and mobile and load all images", async ({
  page,
}) => {
  const routes = [
    "/",
    "/events",
    "/events/senior-showcase",
    "/events/senior-showcase/schedule",
    "/events/senior-showcase/gallery",
    "/events/senior-showcase/projects/aurora",
    "/events/senior-showcase/recap",
    "/signin",
    "/profile",
    "/workspace",
    "/workspace/projects",
    "/workspace/submissions",
    "/workspace/submit",
    "/workspace/judging",
    "/workspace/presenter",
    "/workspace/analytics",
    "/workspace/moderation",
    "/workspace/create-event",
    "/workspace/platform",
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await page.locator("body").waitFor();
      await expect
        .poll(() =>
          page.evaluate(() =>
            [...document.images].every((i) => i.complete && i.naturalWidth > 0),
          ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        route + " @ " + width,
      ).toBe(true);
    }
  }
});
