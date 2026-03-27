"""
2D schematic layout (axial plane through one spoke) for rim + nipple + spoke.

Not a true 3D projection — a readable cross-section for “how deep does the nipple
sit” and where the hub flange sits relative to the rim plane (x = wheel center).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .models import Hub, Nipple, Rim

Side = Literal["left", "right"]


@dataclass(frozen=True)
class SectionDiagram:
    """SVG-friendly numbers; Y increases downward (SVG)."""

    view_w: float
    view_h: float
    cx: float
    hub_axis_y: float
    nipple_x: float
    nipple_y: float
    flange_x: float
    flange_y: float
    rim_path: str
    nipple_head_path: str
    nipple_body_path: str
    head_top_y: float
    rim_top_y: float
    scale_mm_per_px: float


def build_section_layout(
    rim: Rim,
    hub: Hub,
    nipple: Nipple,
    *,
    side: Side,
) -> SectionDiagram:
    # Pixels per mm — tuned so typical road wheel fits ~400×320 viewBox.
    s = 0.38
    cx = 210.0
    hub_axis_y = 270.0

    erd_r_px = (rim.erd_mm / 2.0) * s
    nipple_y = hub_axis_y - erd_r_px
    nipple_x = cx

    if side == "left":
        offset_mm = hub.left_flange_offset_mm
        pcd_mm = hub.left_flange_pcd_mm
        sign = -1.0
    else:
        offset_mm = hub.right_flange_offset_mm
        pcd_mm = hub.right_flange_pcd_mm
        sign = 1.0

    r_f_px = (pcd_mm / 2.0) * s
    flange_x = cx + sign * offset_mm * s
    flange_y = hub_axis_y - r_f_px

    inner_w = rim.inner_width_mm * s
    well_d = rim.well_depth_mm * s
    lip = max(5.0 * s, inner_w * 0.06)

    y_rim_top = nipple_y - well_d
    x_in_l = cx - inner_w / 2
    x_in_r = cx + inner_w / 2
    x_out_l = cx - inner_w / 2 - lip
    x_out_r = cx + inner_w / 2 + lip

    # Schematic trapezoid cavity: outer lip at rim top, inner width at nipple seat.
    rim_path = (
        f"M {x_out_l:.2f} {y_rim_top:.2f} L {x_out_r:.2f} {y_rim_top:.2f} "
        f"L {x_in_r:.2f} {nipple_y:.2f} L {x_in_l:.2f} {nipple_y:.2f} Z"
    )

    head_w = nipple.head_diameter_mm * s
    head_h = nipple.head_height_mm * s
    head_left = nipple_x - head_w / 2
    head_top = nipple_y - head_h
    head_bottom = nipple_y
    nipple_head_path = (
        f"M {head_left:.2f} {head_top:.2f} "
        f"L {head_left + head_w:.2f} {head_top:.2f} "
        f"L {head_left + head_w:.2f} {head_bottom:.2f} "
        f"L {head_left:.2f} {head_bottom:.2f} Z"
    )

    shank_w = nipple.shank_diameter_mm * s
    body_len = nipple.body_length_mm * s
    shank_l = nipple_x - shank_w / 2
    shank_r = nipple_x + shank_w / 2
    body_top = nipple_y
    body_bot = nipple_y + body_len
    nipple_body_path = (
        f"M {shank_l:.2f} {body_top:.2f} L {shank_r:.2f} {body_top:.2f} "
        f"L {shank_r:.2f} {body_bot:.2f} L {shank_l:.2f} {body_bot:.2f} Z"
    )

    view_w = 420.0
    view_h = 320.0

    return SectionDiagram(
        view_w=view_w,
        view_h=view_h,
        cx=cx,
        hub_axis_y=hub_axis_y,
        nipple_x=nipple_x,
        nipple_y=nipple_y,
        flange_x=flange_x,
        flange_y=flange_y,
        rim_path=rim_path,
        nipple_head_path=nipple_head_path,
        nipple_body_path=nipple_body_path,
        head_top_y=head_top,
        rim_top_y=y_rim_top,
        scale_mm_per_px=s,
    )
