import { expect, test } from "@playwright/test";

test.describe("Smoke E2E", () => {
  test("home muestra métricas y navegación", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await expect(page.getByText("Papers nuevos hoy")).toBeVisible();
  });

  test("briefing de hoy carga bloques del pipeline", async ({ page }) => {
    await page.goto("/briefing-hoy");
    await expect(page.getByRole("heading", { level: 2 })).toContainText(/Radar Diario de IA/);
    await expect(page.getByRole("heading", { name: "Resumen ejecutivo" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bloque 1 — Temas relevantes" })).toBeVisible();
  });

  test("navegación lateral alcanza todas las secciones", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Papers" }).click();
    await expect(page.getByRole("heading", { name: "Papers" })).toBeVisible();

    await page.getByRole("link", { name: "Autores" }).click();
    await expect(page.getByRole("heading", { name: "Autores", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Archivo" }).click();
    await expect(page.getByRole("heading", { name: "Archivo" })).toBeVisible();

    await page.getByRole("link", { name: "Tendencias" }).click();
    await expect(page.getByRole("heading", { name: "Tendencias" })).toBeVisible();

    await page.getByRole("link", { name: "Configuración" }).click();
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();

    await page.getByRole("link", { name: "Briefing de hoy" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toContainText(/Radar Diario de IA/);
  });
});
