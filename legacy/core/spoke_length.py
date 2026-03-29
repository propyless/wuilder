"""
Spoke length from rim ERD, hub flange radius, axial offset, crosses, and spoke count.

Uses the usual planar cosine law (rim circle / hub hole circle) extended with axial
distance *w* (flange offset), equivalent to either of:

    horizontal² = R² + r² − 2·R·r·cos(α)
    L_raw       = sqrt(horizontal² + w²)

    L_raw = sqrt(R² + r² + w² − 2·R·r·cos(α))   # same value, expanded

with α = 4π·C/N = 2π·C/(N/2) radians (C = crosses, N = total spokes), same as
``theta = (2*math.pi*crosses) / (total_spokes//2)`` in two-step formulas.

After *L_raw*, many calculators subtract half the **hub spoke hole diameter**
(spoke passes through the hole; ordering length is shorter). Nipple / rim
corrections are separate (see form).

References: standard wheel-building geometry (e.g. Damon Rinard / Roger Musson style
treatments of the hub–rim triangle).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal

Side = Literal["left", "right"]


def lacing_angle_rad(crosses: int, total_spokes: int) -> float:
    """α in the hub plane; equals ``2π·crosses / (total_spokes/2)`` (per-side index)."""
    if total_spokes <= 0:
        raise ValueError("total_spokes must be positive")
    if total_spokes % 2:
        raise ValueError("total_spokes must be even")
    return (2.0 * math.pi * crosses) / (total_spokes // 2)


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


@dataclass(frozen=True)
class FlangeOffsetsFromHubWidth:
    """Flange offsets *L* / *R* and flange spacing *F* from overall hub width and *x* / *y*.

    Convention (common on hub drawings): overall width is locknut-to-locknut (or outer
    faces where the hub meets the frame). *x* = from the **left** outer face to the
    **left** flange hole-circle center; *y* = from the **right** outer face to the
    **right** flange center. The wheel center plane is **midway** between those faces
    (half overall width *h*). Then *L* = *h* − *x*, *R* = *h* − *y*, *F* = *L* + *R*.
    """

    half_width_mm: float
    left_flange_offset_mm: float
    right_flange_offset_mm: float
    flange_to_flange_mm: float


def flange_offsets_from_hub_overall_width(
    overall_width_mm: float,
    left_outer_to_left_flange_mm: float,
    right_outer_to_right_flange_mm: float,
) -> FlangeOffsetsFromHubWidth:
    """
    Compute *L*, *R*, and *F* from hub overall width and edge-to-flange dimensions.

    Raises ``ValueError`` if inputs are inconsistent (negative *L* or *R*).
    """
    if overall_width_mm <= 0:
        raise ValueError("overall_width_mm must be positive")
    h = overall_width_mm / 2.0
    x = float(left_outer_to_left_flange_mm)
    y = float(right_outer_to_right_flange_mm)
    if x < 0 or y < 0:
        raise ValueError("x and y must be non-negative")
    L = h - x
    R = h - y
    if L < 0 or R < 0:
        raise ValueError(
            "x and y cannot exceed half the hub width (negative L or R)"
        )
    F = L + R
    return FlangeOffsetsFromHubWidth(
        half_width_mm=h,
        left_flange_offset_mm=L,
        right_flange_offset_mm=R,
        flange_to_flange_mm=F,
    )


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
    flange_hole_diameter_mm: float = 0.0,
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
        length = raw - (flange_hole_diameter_mm / 2.0) + nipple_correction_mm
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
