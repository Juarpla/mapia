import { expect, test } from "@playwright/test";

test("abre el piloto 130111 y conserva el detalle en escritorio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "¿Dónde intervenir primero?" })).toBeVisible();
  await expect(page.getByLabel("Selección territorial").getByRole("combobox").nth(2)).toHaveValue("130111");
  await expect(page.getByText("Intervención sugerida")).toBeVisible();
});

test("muestra filtros como panel móvil a 360 px", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Filtros/ }).click();
  await expect(page.getByRole("heading", { name: "¿Dónde intervenir primero?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Restablecer filtros" })).toBeVisible();
});

test("la API pública nunca devuelve borradores", async ({ request }) => {
  const response = await request.get("/api/segments?ubigeo=130111");
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { data: Array<{ status: string }> };
  expect(body.data.length).toBeGreaterThanOrEqual(45);
  expect(body.data.every((segment) => segment.status === "publicado")).toBeTruthy();
});
