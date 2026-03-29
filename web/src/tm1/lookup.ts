import chartDoc from "../data/tm1_charts.json";

export type ChartPoint = [number, number];

export interface Tm1ChartDoc {
  source: string;
  charts: Record<
    string,
    {
      label: string;
      points: ChartPoint[];
    }
  >;
}

const doc = chartDoc as unknown as Tm1ChartDoc;

export class TM1LookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TM1LookupError";
  }
}

export function chartSourceNote(): string {
  return String(doc.source ?? "");
}

export function chartIdsAndLabels(): [string, string][] {
  const charts = doc.charts;
  return Object.keys(charts)
    .sort()
    .map((k) => [k, charts[k].label] as [string, string]);
}

export function tensionKgf(chartId: string, deflection: number): number {
  const charts = doc.charts;
  const chart = charts[chartId];
  if (!chart) throw new Error(`unknown TM-1 chart: ${chartId}`);
  const pts = chart.points;
  if (pts.length < 2) {
    throw new Error(`chart ${chartId} needs at least two points`);
  }
  const x0 = pts[0][0];
  const x1 = pts[pts.length - 1][0];
  if (deflection < x0 || deflection > x1) {
    throw new TM1LookupError(
      `deflection ${deflection} is outside the chart range for this spoke type (${x0}–${x1}).`,
    );
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const [xa, ya] = pts[i];
    const [xb, yb] = pts[i + 1];
    if (xa <= deflection && deflection <= xb) {
      if (xb === xa) return ya;
      const t = (deflection - xa) / (xb - xa);
      return ya + t * (yb - ya);
    }
  }
  return pts[pts.length - 1][1];
}

export function deflectionForKgf(chartId: string, kgf: number): number {
  const charts = doc.charts;
  const chart = charts[chartId];
  if (!chart) throw new Error(`unknown TM-1 chart: ${chartId}`);
  const pts = chart.points;
  if (pts.length < 2) {
    throw new Error(`chart ${chartId} needs at least two points`);
  }
  const yMin = pts[0][1];
  const yMax = pts[pts.length - 1][1];
  const k = kgf;
  if (k < yMin) {
    throw new TM1LookupError(
      `tension ${k} kgf is below the chart range for this spoke type (${yMin.toFixed(2)}–${yMax.toFixed(2)} kgf).`,
    );
  }
  if (k > yMax) {
    throw new TM1LookupError(
      `tension ${k} kgf is above the chart range for this spoke type (${yMin.toFixed(2)}–${yMax.toFixed(2)} kgf).`,
    );
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const xa = pts[i][0];
    const ya = pts[i][1];
    const xb = pts[i + 1][0];
    const yb = pts[i + 1][1];
    if (ya <= k && k <= yb) {
      if (yb === ya) return xa;
      const t = (k - ya) / (yb - ya);
      return xa + t * (xb - xa);
    }
  }
  throw new TM1LookupError(
    `could not map tension ${k} kgf to a deflection (unexpected chart shape).`,
  );
}
