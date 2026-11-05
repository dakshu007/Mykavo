/**
 * Site vitals for the plugin's Overview chart: response time over the last
 * 7 days in 6-hour buckets, with the updates reported in the same window so
 * the chart can mark them. A slowdown that starts at an update is the story
 * the chart tells.
 */

export const VITALS_DAYS = 7;
export const VITALS_BUCKET_MINUTES = 360;
const MAX_MARKERS = 12;

export interface VitalsBucketRow {
  bucketStart: Date;
  avgResponseTimeMs: number | null;
}

export interface VitalsUpdateRow {
  note: string;
  createdAt: Date;
}

export interface SiteVitals {
  responseSeries: { t: string; ms: number | null }[];
  updates: { at: string; note: string }[];
}

export function buildSiteVitals(series: VitalsBucketRow[], updates: VitalsUpdateRow[]): SiteVitals {
  return {
    responseSeries: series.map((b) => ({
      t: b.bucketStart.toISOString(),
      ms: typeof b.avgResponseTimeMs === "number" && Number.isFinite(b.avgResponseTimeMs) ? Math.round(b.avgResponseTimeMs) : null,
    })),
    updates: [...updates]
      .sort((a, b) => +a.createdAt - +b.createdAt)
      .slice(-MAX_MARKERS)
      .map((u) => ({ at: u.createdAt.toISOString(), note: u.note.slice(0, 120) })),
  };
}
