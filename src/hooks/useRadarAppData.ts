import { useQuery } from "@tanstack/react-query";
import { fetchRadarAppData } from "../api/radarClient";
import { DEFAULT_RADAR_DATE, getRadarAppData, type RadarAppData } from "../data/radarSnapshot";

function useClientMock(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA !== "false";
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
}

function radarSource(): "mock" | "live" {
  const s = import.meta.env.VITE_RADAR_SOURCE as string | undefined;
  return s === "live" ? "live" : "mock";
}

export function useRadarAppData(date: string = DEFAULT_RADAR_DATE) {
  const mock = useClientMock();
  const base = apiBaseUrl();
  const source = radarSource();

  return useQuery({
    queryKey: ["radar", date, mock, base || "__same_origin__", source],
    queryFn: async (): Promise<RadarAppData> => {
      if (mock) {
        return getRadarAppData(date);
      }
      const origin = base || (typeof window !== "undefined" ? window.location.origin : "");
      if (!origin) {
        throw new Error("Definí VITE_API_BASE_URL o ejecutá en browser");
      }
      return fetchRadarAppData(origin, date, source);
    },
    staleTime: 60_000,
  });
}
