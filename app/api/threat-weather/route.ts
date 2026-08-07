import { aggregateThreatWeather } from "../../../lib/threat-weather/aggregate";
import { fetchThreatWeatherDatasets } from "../../../lib/threat-weather/sources";
import { getCoolerTalkData } from "../cooler-talk/route";
import type { SourceDataset, SourceStatus } from "../../../lib/threat-weather/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const now = Date.now();

  try {
    const [{ datasets, statuses, totalConfiguredSources, mode }, coolerTalk] =
      await Promise.all([
        fetchThreatWeatherDatasets(fetch, now),
        getCoolerTalkData(),
      ]);
    const concernScore = coolerTalk.panic?.score;
    const hasConcernScore = Number.isFinite(concernScore);
    const concernStatus: SourceStatus = {
      name: "Cooler Talk Public Concern Index",
      configured: true,
      mode: hasConcernScore ? "live" : "none",
      status: hasConcernScore ? "validated" : "failed",
      retrievedAt: hasConcernScore ? coolerTalk.updatedAt : null,
      itemCount: hasConcernScore ? 1 : 0,
      message: hasConcernScore
        ? `${coolerTalk.panic?.label || "Current"} (${concernScore}/100) from the live Cooler Talk index.`
        : "Cooler Talk public-concern signals are currently unavailable.",
    };
    const concernDataset: SourceDataset | null = hasConcernScore
      ? {
          source: "Cooler Talk Public Concern Index",
          retrievedAt: coolerTalk.updatedAt,
          ttlMs: 30 * 60 * 1000,
          iocs: [],
          signals: { publicConcern: Number(concernScore) },
          status: concernStatus,
        }
      : null;

    return Response.json(
      aggregateThreatWeather(
        concernDataset ? [...datasets, concernDataset] : datasets,
        [...statuses, concernStatus],
        totalConfiguredSources + 1,
        mode,
        now,
      ),
    );
  } catch {
    return Response.json(
      aggregateThreatWeather([], [], 0, "none", now),
      { status: 503 },
    );
  }
}

