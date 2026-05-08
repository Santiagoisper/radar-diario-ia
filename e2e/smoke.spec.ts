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

  test("archivo: filtros de rango y tema son usables", async ({ page }) => {
    await page.goto("/archivo");
    await expect(page.getByRole("heading", { name: "Archivo" })).toBeVisible();
    await page.getByLabel(/Rango temporal/i).selectOption("7d");
    await page.getByLabel(/Rango temporal/i).selectOption("all");
    await expect(page.getByRole("heading", { name: "Briefings históricos" })).toBeVisible();
  });

  test("tendencias: cambiar período actualiza resumen", async ({ page }) => {
    await page.goto("/tendencias");
    await expect(page.getByRole("heading", { name: "Tendencias" })).toBeVisible();
    const periodSelect = page.locator(".trends-filters select").first();
    await periodSelect.selectOption("7d");
    await expect(page.getByRole("heading", { name: "Período" })).toBeVisible();
    await periodSelect.selectOption("all");
  });

  test("configuración: página carga", async ({ page }) => {
    await page.goto("/configuracion");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
  });
});
