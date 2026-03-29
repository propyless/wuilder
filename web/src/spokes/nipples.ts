import nipplesDoc from "../data/nipples.json";
import type { NippleLike } from "../section/layout";

export interface NippleRow extends NippleLike {
  id: string;
  name: string;
}

interface NipplesFile {
  nipples: NippleRow[];
}

export const NIPPLES = (nipplesDoc as NipplesFile).nipples;

export function findNipple(id: string): NippleRow | undefined {
  return NIPPLES.find((n) => n.id === id);
}

function fmtMmPreset(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(Math.trunc(r)) : r.toFixed(1);
}

/** One-line geometry for tooltips and the live hint under the nipple field. */
export function nipplePresetDimsText(n: NippleRow): string {
  const f = fmtMmPreset;
  return [
    `Head ${f(n.headDiameterMm)}×${f(n.headHeightMm)} mm`,
    `barrel ${f(n.bodyLengthMm)} mm`,
    `shank Ø${f(n.shankDiameterMm)} mm`,
    `thread ${f(n.internalThreadLengthMm)} mm`,
  ].join(" · ");
}
