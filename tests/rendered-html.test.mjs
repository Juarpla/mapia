import assert from "node:assert/strict";
import test from "node:test";

test("el código fuente no conserva el starter provisional", async () => {
  const page = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("../app/page.tsx", import.meta.url), "utf8"));
  assert.match(page, /MapDashboard/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
});
