"""
SVG-friendly rows for a tension heatmap (rim + spokes), same indexing as
:func:`core.spoke_length.build_spoke_results` (odd spoke # = left, even = right).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

from .tm1 import TM1LookupError, deflection_for_kgf

Side = Literal["left", "right"]

_RATIO_PARK_EQUIV_PCT = 100.0


def uses_side_ratio(other_side_pct: float) -> bool:
    """False when other-side target is 100% of reference (= Park per-side comparison)."""
    return not math.isclose(
        float(other_side_pct),
        _RATIO_PARK_EQUIV_PCT,
        rel_tol=0.0,
        abs_tol=1e-6,
    )


@dataclass(frozen=True)
class TensionSideStats:
    """Per-side summary matching Park WTA statistics (same-side sample)."""

    avg_kgf: float
    stdev_kgf: float
    upper_kgf: float
    lower_kgf: float
    upper_reading: float | None
    lower_reading: float | None


def _sample_stdev(values: list[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    m = sum(values) / n
    return math.sqrt(sum((x - m) ** 2 for x in values) / (n - 1))


def build_tension_side_stats(
    side_tensions_kgf: list[float],
    *,
    variance_percent: float,
    chart_id: str,
) -> TensionSideStats:
    """Average, sample stdev, ±variance% kgf limits, and TM-1 readings at those limits when in chart range."""
    if not side_tensions_kgf:
        raise ValueError("side_tensions_kgf must be non-empty")
    avg = sum(side_tensions_kgf) / len(side_tensions_kgf)
    st = _sample_stdev(side_tensions_kgf)
    f = float(variance_percent) / 100.0
    upper = avg * (1.0 + f)
    lower = avg * (1.0 - f)
    ur: float | None
    lr: float | None
    try:
        ur = deflection_for_kgf(chart_id, upper)
    except TM1LookupError:
        ur = None
    try:
        lr = deflection_for_kgf(chart_id, lower)
    except TM1LookupError:
        lr = None
    return TensionSideStats(
        avg_kgf=avg,
        stdev_kgf=st,
        upper_kgf=upper,
        lower_kgf=lower,
        upper_reading=ur,
        lower_reading=lr,
    )

# Heatmap stroke colors vs |percent deviation from same-side average|
_BAND_GOOD = "#1b6b5c"  # ≤5%
_BAND_OK = "#b89a14"  # ≤10%
_BAND_WARN = "#c4802c"  # ≤15%
_BAND_BAD = "#9c2f2f"  # >15%


def side_average_kgf(tensions_kgf: list[float], spoke_count: int) -> tuple[float, float]:
    """Arithmetic mean tension on the left (even indices) and right (odd) sides."""
    if len(tensions_kgf) != spoke_count or spoke_count < 2 or spoke_count % 2:
        raise ValueError("tensions_kgf length must match an even spoke_count ≥ 2")
    left = [tensions_kgf[i] for i in range(0, spoke_count, 2)]
    right = [tensions_kgf[i] for i in range(1, spoke_count, 2)]
    return sum(left) / len(left), sum(right) / len(right)


def adjustment_action(percent_from_reference: float, within_variance: bool) -> tuple[str, str]:
    """When outside the variance band: (full label, short label for map). Empty when within."""
    if within_variance:
        return "", ""
    if percent_from_reference < 0:
        return "Tighten", "T"
    if percent_from_reference > 0:
        return "Loosen", "L"
    return "", ""


def rim_badge_text_xy(
    cx: float,
    cy: float,
    x_rim: float,
    y_rim: float,
    *,
    offset: float = 16.0,
) -> tuple[float, float]:
    """Label position outside the rim along the same radial (rim hole is the anchor)."""
    vx = x_rim - cx
    vy = y_rim - cy
    mag = math.hypot(vx, vy) or 1.0
    ux, uy = vx / mag, vy / mag
    return x_rim + ux * offset, y_rim + uy * offset


def variance_limit_detail(percent_from_reference: float, variance_percent: float) -> str:
    """Human-readable distance to the ±variance% band (relative to same-side average).

    When inside: how much headroom remains before hitting the limit.
    When outside: how far past the limit (absolute deviation beyond the cap).
    """
    a = abs(percent_from_reference)
    v = float(variance_percent)
    if a <= v:
        head = v - a
        return f"{head:.1f}% under ±{v:.0f}% limit"
    over = a - v
    return f"{over:.1f}% past ±{v:.0f}% limit"


def tension_deviation_band(percent_from_reference: float) -> tuple[str, str]:
    """Return (stroke_hex, band_id) for legend CSS."""
    a = abs(percent_from_reference)
    if a <= 5.0:
        return _BAND_GOOD, "tension-good"
    if a <= 10.0:
        return _BAND_OK, "tension-ok"
    if a <= 15.0:
        return _BAND_WARN, "tension-warn"
    return _BAND_BAD, "tension-bad"


@dataclass(frozen=True)
class TensionRatioSummary:
    """When balance mode is ratio: how the non-reference side compares to the target % of reference."""

    reference_side: Side
    other_side: Side
    reference_avg_kgf: float
    target_other_avg_kgf: float
    measured_other_avg_kgf: float
    measured_other_as_pct_of_ref: float
    target_other_pct: float


def build_tension_ratio_summary(
    left_avg: float,
    right_avg: float,
    *,
    reference_side: Side,
    other_pct: float,
) -> TensionRatioSummary:
    """``other_pct`` is the target for the *non-reference* side as % of the reference side’s average."""
    f = float(other_pct) / 100.0
    if reference_side == "left":
        ref_avg = left_avg
        measured_other = right_avg
        target_other = left_avg * f
        other: Side = "right"
        m_pct = 100.0 * right_avg / left_avg if left_avg > 0 else 0.0
    else:
        ref_avg = right_avg
        measured_other = left_avg
        target_other = right_avg * f
        other = "left"
        m_pct = 100.0 * left_avg / right_avg if right_avg > 0 else 0.0
    return TensionRatioSummary(
        reference_side=reference_side,
        other_side=other,
        reference_avg_kgf=ref_avg,
        target_other_avg_kgf=target_other,
        measured_other_avg_kgf=measured_other,
        measured_other_as_pct_of_ref=m_pct,
        target_other_pct=float(other_pct),
    )


@dataclass(frozen=True)
class TensionSpokeRow:
    index: int
    side: Side
    reading: float
    tension_kgf: float
    reference_kgf: float
    delta_kgf: float
    percent_from_reference: float
    within_variance: bool
    variance_limit_detail: str
    adjust_action: str
    adjust_short: str
    badge_tx: float
    badge_ty: float
    color: str
    band_class: str
    x1: float
    y1: float
    x2: float
    y2: float


def build_tension_spoke_rows(
    *,
    spoke_count: int,
    readings: list[float],
    tensions_kgf: list[float],
    variance_percent: float = 20.0,
    balance_mode: str = "per_side",
    ratio_reference_side: Side | None = None,
    ratio_other_pct: float | None = None,
    cx: float = 120.0,
    cy: float = 120.0,
    rim_r: float = 95.0,
    hub_r: float = 28.0,
    display_twist_rad: float = -math.pi / 2,
) -> list[TensionSpokeRow]:
    """Build per-spoke geometry and colors; ``readings``/``tensions_kgf`` length must match ``spoke_count``.

    ``balance_mode`` ``per_side``: each spoke vs same-side average (Park WTA).

    ``balance_mode`` ``ratio``: reference side vs its own average; other side vs
    ``(ratio_other_pct / 100) * reference_side_average``.
    """
    if len(readings) != spoke_count or len(tensions_kgf) != spoke_count:
        raise ValueError("readings and tensions_kgf must match spoke_count")

    left_avg, right_avg = side_average_kgf(tensions_kgf, spoke_count)
    if left_avg <= 0 or right_avg <= 0:
        raise ValueError("same-side average tension must be positive")

    ref_left: float
    ref_right: float
    if balance_mode == "ratio":
        if ratio_reference_side not in ("left", "right") or ratio_other_pct is None:
            raise ValueError("ratio mode requires ratio_reference_side and ratio_other_pct")
        f = float(ratio_other_pct) / 100.0
        if ratio_reference_side == "left":
            ref_left = left_avg
            ref_right = left_avg * f
        else:
            ref_right = right_avg
            ref_left = right_avg * f
    elif balance_mode == "per_side":
        ref_left = left_avg
        ref_right = right_avg
    else:
        raise ValueError(f"unknown balance_mode: {balance_mode!r}")

    rows: list[TensionSpokeRow] = []
    for i in range(spoke_count):
        side: Side = "left" if i % 2 == 0 else "right"
        t_kgf = tensions_kgf[i]
        ref = ref_left if side == "left" else ref_right
        delta = t_kgf - ref
        pct = 100.0 * delta / ref
        within = abs(pct) <= variance_percent
        v_detail = variance_limit_detail(pct, variance_percent)
        adj_full, adj_short = adjustment_action(pct, within)
        color, band = tension_deviation_band(pct)
        phi = 2.0 * math.pi * i / spoke_count + display_twist_rad
        x1 = cx + rim_r * math.cos(phi)
        y1 = cy + rim_r * math.sin(phi)
        x2 = cx + hub_r * math.cos(phi)
        y2 = cy + hub_r * math.sin(phi)
        btx, bty = rim_badge_text_xy(cx, cy, x1, y1)
        rows.append(
            TensionSpokeRow(
                index=i + 1,
                side=side,
                reading=readings[i],
                tension_kgf=t_kgf,
                reference_kgf=ref,
                delta_kgf=delta,
                percent_from_reference=pct,
                within_variance=within,
                variance_limit_detail=v_detail,
                adjust_action=adj_full,
                adjust_short=adj_short,
                badge_tx=btx,
                badge_ty=bty,
                color=color,
                band_class=band,
                x1=x1,
                y1=y1,
                x2=x2,
                y2=y2,
            )
        )
    return rows


def build_tension_radar_paths(
    rows: list[TensionSpokeRow],
    *,
    cx: float = 120.0,
    cy: float = 120.0,
    rim_r: float = 95.0,
    hub_r: float = 28.0,
    display_twist_rad: float = -math.pi / 2,
) -> tuple[str, str]:
    """Closed polygon paths (left / right spokes) for a tension radar; blue vs orange."""
    if not rows:
        return "", ""
    n = len(rows)
    t_peak = max(r.tension_kgf for r in rows)
    t_max = max(t_peak * 1.2, 1.0)
    band = rim_r - hub_r

    def _pts(indices: list[int]) -> list[tuple[float, float]]:
        out: list[tuple[float, float]] = []
        for i in indices:
            phi = 2.0 * math.pi * i / n + display_twist_rad
            t = rows[i].tension_kgf / t_max
            t = max(0.0, min(1.0, t))
            rr = hub_r + t * band
            out.append((cx + rr * math.cos(phi), cy + rr * math.sin(phi)))
        return out

    def _path(indices: list[int]) -> str:
        pts = _pts(indices)
        if not pts:
            return ""
        parts = [f"M {pts[0][0]:.2f} {pts[0][1]:.2f}"]
        for x, y in pts[1:]:
            parts.append(f"L {x:.2f} {y:.2f}")
        parts.append("Z")
        return " ".join(parts)

    left_idx = [i for i in range(n) if i % 2 == 0]
    right_idx = [i for i in range(n) if i % 2 == 1]
    return _path(left_idx), _path(right_idx)
