import { aggregateThreatWeather } from "../../../lib/threat-weather/aggregate";
import { fetchThreatWeatherDatasets } from "../../../lib/threat-weather/sources";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const now = Date.now();

  try {
    const { datasets, statuses, totalConfiguredSources, mode } =
      await fetchThreatWeatherDatasets(fetch, now);

    return Response.json(
      aggregateThreatWeather(datasets, statuses, totalConfiguredSources, mode, now),
    );
  } catch {
    return Response.json(
      aggregateThreatWeather([], [], 0, "none", now),
      { status: 503 },
    );
  }
}

