import type { RadarAppData } from "../data/radarSnapshot";

export async function fetchRadarAppData(
  baseUrl: string,
  date: string,
  source: "mock" | "live" = "mock",
): Promise<RadarAppData> {
  const u = new URL("/api/radar/snapshot", baseUrl.replace(/\/$/, ""));
  u.searchParams.set("date", date);
  u.searchParams.set("source", source);
  const res = await fetch(u.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`radar API ${res.status}: ${t}`);
  }
  return res.json() as Promise<RadarAppData>;
}
