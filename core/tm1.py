"""
Park TM-1 deflection reading → spoke tension (kgf).

Chart points are loaded from :file:`core/fixtures/tm1_charts.json` (see
:file:`core/fixtures/README_TM1.md` for the official table reference).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

_CHARTS_PATH = Path(__file__).resolve().parent / "fixtures" / "tm1_charts.json"


class TM1LookupError(ValueError):
    """Deflection is outside the tabulated range for the selected chart."""


@lru_cache(maxsize=1)
def _load_doc() -> dict:
    with open(_CHARTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def chart_source_note() -> str:
    """Attribution / provenance string for UI or docs."""
    return str(_load_doc().get("source", ""))


def chart_ids_and_labels() -> list[tuple[str, str]]:
    """Ordered (id, label) for form choices."""
    charts = _load_doc()["charts"]
    return [(k, charts[k]["label"]) for k in sorted(charts.keys())]


def tension_kgf(chart_id: str, deflection: float) -> float:
    """Convert TM-1 deflection reading to tension (kgf), linearly interpolating.

    ``deflection`` may be fractional (e.g. 20.5). Raises :class:`TM1LookupError`
    if the value is strictly below the first or strictly above the last
    tabulated deflection for ``chart_id``.
    """
    charts = _load_doc()["charts"]
    if chart_id not in charts:
        raise KeyError(f"unknown TM-1 chart: {chart_id!r}")
    pts = charts[chart_id]["points"]
    if len(pts) < 2:
        raise ValueError(f"chart {chart_id!r} needs at least two points")

    x0, y0 = pts[0]
    x1, y1 = pts[-1]
    if deflection < x0 or deflection > x1:
        raise TM1LookupError(
            f"deflection {deflection} is outside the chart range "
            f"for this spoke type ({x0}–{x1})."
        )

    for i in range(len(pts) - 1):
        xa, ya = pts[i]
        xb, yb = pts[i + 1]
        if xa <= deflection <= xb:
            if xb == xa:
                return float(ya)
            t = (deflection - xa) / (xb - xa)
            return float(ya + t * (yb - ya))

    return float(y1)


def deflection_for_kgf(chart_id: str, kgf: float) -> float:
    """Convert target tension (kgf) to TM-1 deflection, linearly interpolating.

    Inverse of :func:`tension_kgf` for charts where tension increases with deflection.
    Raises :class:`TM1LookupError` if ``kgf`` is outside the tabulated tension range.
    """
    charts = _load_doc()["charts"]
    if chart_id not in charts:
        raise KeyError(f"unknown TM-1 chart: {chart_id!r}")
    pts = charts[chart_id]["points"]
    if len(pts) < 2:
        raise ValueError(f"chart {chart_id!r} needs at least two points")

    y_min = float(pts[0][1])
    y_max = float(pts[-1][1])
    k = float(kgf)
    if k < y_min:
        raise TM1LookupError(
            f"tension {k} kgf is below the chart range for this spoke type "
            f"({y_min:.2f}–{y_max:.2f} kgf)."
        )
    if k > y_max:
        raise TM1LookupError(
            f"tension {k} kgf is above the chart range for this spoke type "
            f"({y_min:.2f}–{y_max:.2f} kgf)."
        )

    for i in range(len(pts) - 1):
        xa, ya = float(pts[i][0]), float(pts[i][1])
        xb, yb = float(pts[i + 1][0]), float(pts[i + 1][1])
        if ya <= k <= yb:
            if yb == ya:
                return xa
            t = (k - ya) / (yb - ya)
            return xa + t * (xb - xa)

    raise TM1LookupError(
        f"could not map tension {k} kgf to a deflection (unexpected chart shape)."
    )
