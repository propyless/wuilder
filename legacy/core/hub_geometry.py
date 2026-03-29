"""
Hub offset side-view SVG helpers and illustrative side-tension ratio.

The ratio model assumes a centered rim and equal spoke count per side: axial force
balance gives T_left * (w_left / L_left_avg) ≈ T_right * (w_right / L_right_avg),
so T_other / T_ref follows from flange offsets and mean spoke lengths. This is an
approximation (ignores dish error, friction, nipple seating, etc.).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .spoke_length import build_spoke_results

SideLR = Literal["left", "right"]


@dataclass(frozen=True)
class HubSideViewSvg:
    """Pixel geometry for a simple axial hub schematic (center plane + flanges)."""

    vb_w: float
    vb_h: float
    axle_y: float
    center_x: float
    left_flange_x: float
    right_flange_x: float
    left_offset_mm: float
    right_offset_mm: float
    center_line_y1: float
    center_line_y2: float
    flange_tick_y1: float
    flange_tick_y2: float
    label_y: float


def build_hub_side_view_svg(
    left_offset_mm: float,
    right_offset_mm: float,
    *,
    vb_w: float = 280.0,
    vb_h: float = 120.0,
    margin_x: float = 28.0,
    axle_y: float = 62.0,
) -> HubSideViewSvg:
    """Map flange offsets (mm from center plane) to horizontal SVG positions."""
    lo = max(0.0, float(left_offset_mm))
    ro = max(0.0, float(right_offset_mm))
    max_w = max(lo, ro, 5.0)
    inner = vb_w - 2.0 * margin_x
    scale = min(inner / (2.0 * max_w), 3.2)
    center_x = vb_w / 2.0
    left_flange_x = center_x - scale * lo
    right_flange_x = center_x + scale * ro
    tick_half = 20.0
    margin_v = 14.0
    return HubSideViewSvg(
        vb_w=vb_w,
        vb_h=vb_h,
        axle_y=axle_y,
        center_x=center_x,
        left_flange_x=left_flange_x,
        right_flange_x=right_flange_x,
        left_offset_mm=lo,
        right_offset_mm=ro,
        center_line_y1=margin_v,
        center_line_y2=vb_h - margin_v,
        flange_tick_y1=axle_y - tick_half,
        flange_tick_y2=axle_y + tick_half,
        label_y=vb_h - 18.0,
    )


def geometry_ready_for_ratio(
    *,
    erd_mm: float | None,
    left_pcd_mm: float | None,
    right_pcd_mm: float | None,
    crosses: int | None,
    left_offset_mm: float | None,
    right_offset_mm: float | None,
) -> bool:
    if erd_mm is None or left_pcd_mm is None or right_pcd_mm is None:
        return False
    if crosses is None or left_offset_mm is None or right_offset_mm is None:
        return False
    if erd_mm <= 0 or left_pcd_mm <= 0 or right_pcd_mm <= 0:
        return False
    if crosses < 0:
        return False
    return True


def illustrative_other_as_pct_of_reference(
    *,
    reference_side: SideLR,
    w_left_mm: float,
    w_right_mm: float,
    avg_len_left_mm: float,
    avg_len_right_mm: float,
) -> float:
    """
    Return the *non-reference* side’s equilibrium tension as % of the reference
    side’s tension, from axial balance with spoke axial stiffness ∝ 1/L.
    """
    eps = 1e-9
    wl = max(float(w_left_mm), eps)
    wr = max(float(w_right_mm), eps)
    ll = max(float(avg_len_left_mm), eps)
    lr = max(float(avg_len_right_mm), eps)
    if reference_side == "left":
        return 100.0 * (wl * lr) / (wr * ll)
    return 100.0 * (wr * ll) / (wl * lr)


def side_mean_spoke_lengths_mm(
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
) -> tuple[float, float]:
    spokes = build_spoke_results(
        erd_mm=erd_mm,
        spoke_count=spoke_count,
        crosses=crosses,
        left_flange_radius_mm=left_flange_radius_mm,
        right_flange_radius_mm=right_flange_radius_mm,
        left_flange_offset_mm=left_flange_offset_mm,
        right_flange_offset_mm=right_flange_offset_mm,
        flange_hole_diameter_mm=flange_hole_diameter_mm,
        nipple_correction_mm=nipple_correction_mm,
        rotation_rad=rotation_rad,
    )
    left = [s.length_mm for s in spokes if s.side == "left"]
    right = [s.length_mm for s in spokes if s.side == "right"]
    if not left or not right:
        raise ValueError("expected both sides populated")
    return sum(left) / len(left), sum(right) / len(right)


@dataclass(frozen=True)
class IllustrativeRatioSummary:
    reference_side: SideLR
    other_side: SideLR
    illustrative_other_pct: float
    measured_other_as_pct_of_ref: float


def build_illustrative_ratio_summary(
    *,
    reference_side: SideLR,
    left_avg_kgf: float,
    right_avg_kgf: float,
    w_left_mm: float,
    w_right_mm: float,
    avg_len_left_mm: float,
    avg_len_right_mm: float,
) -> IllustrativeRatioSummary:
    ill = illustrative_other_as_pct_of_reference(
        reference_side=reference_side,
        w_left_mm=w_left_mm,
        w_right_mm=w_right_mm,
        avg_len_left_mm=avg_len_left_mm,
        avg_len_right_mm=avg_len_right_mm,
    )
    if reference_side == "left":
        other: SideLR = "right"
        m_pct = 100.0 * right_avg_kgf / left_avg_kgf if left_avg_kgf > 0 else 0.0
    else:
        other = "left"
        m_pct = 100.0 * left_avg_kgf / right_avg_kgf if right_avg_kgf > 0 else 0.0
    return IllustrativeRatioSummary(
        reference_side=reference_side,
        other_side=other,
        illustrative_other_pct=ill,
        measured_other_as_pct_of_ref=m_pct,
    )
