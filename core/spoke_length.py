"""
Spoke length from rim ERD, hub flange radius, axial offset, crosses, and spoke count.

Uses the usual planar cosine law (rim circle / hub hole circle) extended with axial
distance w, equivalent to:

    L = sqrt(R² + r² + w² − 2·R·r·cos(α))

with α = 4π·C/N radians (C = crosses, N = total spokes). Same α is used for both
flanks when cross pattern is symmetric.

References: standard wheel-building geometry (e.g. Damon Rinard / Roger Musson style
treatments of the hub–rim triangle).

Nipple/slot corrections are not in the triangle; add them separately if needed.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

Side = Literal["left", "right"]


def lacing_angle_rad(crosses: int, total_spokes: int) -> float:
    """Angle α between rim hole radial line and hub hole direction in the hub plane."""
    if total_spokes <= 0:
        raise ValueError("total_spokes must be positive")
    return 4.0 * math.pi * crosses / total_spokes


def spoke_length_mm(
    erd_mm: float,
    flange_radius_mm: float,
    flange_offset_mm: float,
    crosses: int,
    total_spokes: int,
) -> float:
    """Straight-line distance (mm) from nipple seat circle (ERD) to flange hole.

    ``flange_offset_mm`` is axial distance from the wheel center plane (rim /
    nipple plane when the rim is centered) to this flange's hole circle — the
    usual left/right flange offset (e.g. *L* and *R* on hub diagrams).
    """
    R = erd_mm / 2.0
    r = flange_radius_mm
    w = flange_offset_mm
    alpha = lacing_angle_rad(crosses, total_spokes)
    under = R * R + r * r + w * w - 2.0 * R * r * math.cos(alpha)
    if under < 0.0:
        under = 0.0
    return math.sqrt(under)


@dataclass(frozen=True)
class SpokeResult:
    index: int
    side: Side
    length_mm: float
    rim_angle_rad: float
    hub_angle_rad: float


def max_crosses(total_spokes: int) -> int:
    """Upper bound for crosses so holes do not overlap tangentially (guard rail)."""
    if total_spokes < 4:
        return 0
    # require 4*C < N so indexing stays in valid tangential range
    return max(0, (total_spokes - 1) // 4)


def build_spoke_results(
    *,
    erd_mm: float,
    spoke_count: int,
    crosses: int,
    left_flange_radius_mm: float,
    right_flange_radius_mm: float,
    left_flange_offset_mm: float,
    right_flange_offset_mm: float,
    nipple_correction_mm: float = 0.0,
    rotation_rad: float = 0.0,
) -> list[SpokeResult]:
    """
    One result per spoke. Index 0..N-1 around the rim; even index = left, odd = right.
    rotation_rad spins the whole pattern (e.g. align a valve hole) CCW from +x.
    hub_angle_rad: hub hole toward which the spoke runs (top-view plan).
    """
    n = spoke_count
    alpha = lacing_angle_rad(crosses, n)
    out: list[SpokeResult] = []
    for i in range(n):
        side: Side = "left" if i % 2 == 0 else "right"
        r_fl = left_flange_radius_mm if side == "left" else right_flange_radius_mm
        w_fl = left_flange_offset_mm if side == "left" else right_flange_offset_mm
        base = 2.0 * math.pi * i / n
        phi = base + rotation_rad
        # Left flange holes “lag” vs right in a common convention; keeps diagram readable.
        if side == "left":
            hub_phi = phi - alpha
        else:
            hub_phi = phi + alpha
        raw = spoke_length_mm(erd_mm, r_fl, w_fl, crosses, n)
        length = raw + nipple_correction_mm
        out.append(
            SpokeResult(
                index=i,
                side=side,
                length_mm=length,
                rim_angle_rad=phi,
                hub_angle_rad=hub_phi,
            )
        )
    return out
