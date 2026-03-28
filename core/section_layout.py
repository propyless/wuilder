"""
2D schematic layout (axial plane through one spoke) for rim + nipple + spoke.

The nipple sits on the wheel center plane (x). The flange hole is offset axially by
the hub flange offset *w*. The spoke segment length matches the same **ordering**
length as `core.spoke_length` (including hub-hole halving and nipple correction):
planar separation is sqrt(L² − w²) so hypot(axial, planar) = L indrawing units.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, Protocol, runtime_checkable

from .spoke_length import spoke_length_mm

Side = Literal["left", "right"]


# ---------------------------------------------------------------------------
# Structural protocols — any object with the right attributes works
# (ORM model instances, form-backed SimpleNamespace, dataclasses, …).
# ---------------------------------------------------------------------------

@runtime_checkable
class RimLike(Protocol):
    erd_mm: float
    inner_width_mm: float
    well_depth_mm: float


@runtime_checkable
class HubLike(Protocol):
    left_flange_pcd_mm: float
    right_flange_pcd_mm: float
    left_flange_offset_mm: float
    right_flange_offset_mm: float


@runtime_checkable
class NippleLike(Protocol):
    head_diameter_mm: float
    head_height_mm: float
    body_length_mm: float
    shank_diameter_mm: float
    internal_thread_length_mm: float


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
    nipple_thread_zone_path: str
    head_top_y: float
    rim_top_y: float
    body_bot_y: float
    scale_mm_per_px: float
    spoke_length_mm: float
    flange_offset_mm: float
    planar_chord_mm: float


def build_section_layout(
    rim: RimLike,
    hub: HubLike,
    nipple: NippleLike,
    *,
    side: Side,
    spoke_count: int,
    crosses: int,
    flange_hole_diameter_mm: float = 0.0,
    nipple_correction_mm: float = 0.0,
) -> SectionDiagram:
    s = 0.38
    cx = 210.0

    if side == "left":
        offset_mm = hub.left_flange_offset_mm
        pcd_mm = hub.left_flange_pcd_mm
        sign = -1.0
    else:
        offset_mm = hub.right_flange_offset_mm
        pcd_mm = hub.right_flange_pcd_mm
        sign = 1.0

    r_fl_mm = pcd_mm / 2.0
    raw = spoke_length_mm(
        rim.erd_mm, r_fl_mm, offset_mm, crosses, spoke_count
    )
    spoke_L = (
        raw
        - (flange_hole_diameter_mm / 2.0)
        + nipple_correction_mm
    )

    w = offset_mm
    under_chord = spoke_L * spoke_L - w * w
    planar_chord_mm = math.sqrt(max(under_chord, 0.0))

    erd_r_px = (rim.erd_mm / 2.0) * s
    # Anchor layout from a nominal hub-axis baseline so typical wheels fit the viewbox.
    hub_axis_y = 270.0
    nipple_y = hub_axis_y - erd_r_px
    nipple_x = cx

    dx_px = sign * w * s
    flange_x = cx + dx_px
    dy_px = planar_chord_mm * s
    flange_y = nipple_y + dy_px

    hub_axis_y = flange_y + 48.0

    inner_w = rim.inner_width_mm * s
    well_d = rim.well_depth_mm * s
    lip = max(5.0 * s, inner_w * 0.06)

    y_rim_top = nipple_y - well_d
    x_out_l = cx - inner_w / 2 - lip
    x_out_r = cx + inner_w / 2 + lip
    x_in_l = cx - inner_w / 2
    x_in_r = cx + inner_w / 2

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

    thread_len_px = nipple.internal_thread_length_mm * s
    thread_bot = min(body_top + thread_len_px, body_bot)
    nipple_thread_zone_path = (
        f"M {shank_l:.2f} {body_top:.2f} L {shank_r:.2f} {body_top:.2f} "
        f"L {shank_r:.2f} {thread_bot:.2f} L {shank_l:.2f} {thread_bot:.2f} Z"
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
        nipple_thread_zone_path=nipple_thread_zone_path,
        head_top_y=head_top,
        rim_top_y=y_rim_top,
        body_bot_y=body_bot,
        scale_mm_per_px=s,
        spoke_length_mm=spoke_L,
        flange_offset_mm=w,
        planar_chord_mm=planar_chord_mm,
    )


# ---------------------------------------------------------------------------
# Zoomed detail view — rim cavity + nipple + spoke-tip marker
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SectionDetail:
    """Pixel-space geometry for the zoomed rim/nipple detail SVG."""

    view_w: float
    view_h: float
    cx: float
    scale: float

    rim_path: str
    rim_cavity_path: str
    nipple_head_path: str
    nipple_body_path: str
    nipple_thread_zone_path: str

    seat_y: float
    rim_outer_y: float
    rim_cavity_top_y: float
    rim_cavity_bot_y: float
    barrel_end_y: float
    tip_y: float

    spoke_x: float
    spoke_w: float
    spoke_top_y: float
    spoke_bot_y: float
    spoke_h: float
    spoke_thread_bot_y: float
    spoke_thread_h: float

    has_inner_wall_depth: bool

    dim_seat_x: float
    dim_rim_x: float
    seat_mid_dy: float
    rim_mid_dy: float


def build_section_detail(
    nipple: NippleLike,
    *,
    well_depth_mm: float,
    inner_width_mm: float,
    tip_from_seat_mm: float,
    spoke_thread_length_mm: float = 0.0,
    inner_wall_depth_mm: float | None = None,
) -> SectionDetail:
    """Build zoomed detail geometry for the rim/nipple/spoke-tip area.

    ``tip_from_seat_mm`` is the signed distance from the spoke tip to the
    nipple seat (positive = inside body, negative = past seat into cavity).
    It should come from :func:`core.nipple_fit.compute_nipple_fit`.

    The rim is drawn as a double-wall cross-section.  The nipple head hangs
    below the inner wall; the nipple body extends further hubward.

    Scale is chosen so the full vertical extent (rim outer edge to barrel end,
    with padding) fills a comfortable viewbox.
    """
    # Total vertical extent: rim depth + nipple body below seat.
    # (The head sits inside the cavity so doesn't add to the height.)
    total_mm = well_depth_mm + nipple.body_length_mm
    padding_mm = total_mm * 0.16
    view_h = 300.0
    s = view_h / (total_mm + 2 * padding_mm)
    view_w = 300.0
    cx = view_w / 2.0

    rim_outer_y = padding_mm * s
    seat_y = rim_outer_y + well_depth_mm * s

    # -- Nipple: head inside cavity, body hangs below ----------------------
    head_w = nipple.head_diameter_mm * s
    head_h = nipple.head_height_mm * s
    head_left = cx - head_w / 2
    head_top = seat_y - head_h
    head_bot = seat_y

    nipple_head_path = (
        f"M {head_left:.2f} {head_top:.2f} "
        f"L {head_left + head_w:.2f} {head_top:.2f} "
        f"L {head_left + head_w:.2f} {head_bot:.2f} "
        f"L {head_left:.2f} {head_bot:.2f} Z"
    )

    shank_w = nipple.shank_diameter_mm * s
    shank_l = cx - shank_w / 2
    shank_r = cx + shank_w / 2
    barrel_end_y = seat_y + nipple.body_length_mm * s

    nipple_body_path = (
        f"M {shank_l:.2f} {seat_y:.2f} L {shank_r:.2f} {seat_y:.2f} "
        f"L {shank_r:.2f} {barrel_end_y:.2f} L {shank_l:.2f} {barrel_end_y:.2f} Z"
    )

    thread_bot = min(
        seat_y + nipple.internal_thread_length_mm * s, barrel_end_y
    )
    nipple_thread_zone_path = (
        f"M {shank_l:.2f} {seat_y:.2f} L {shank_r:.2f} {seat_y:.2f} "
        f"L {shank_r:.2f} {thread_bot:.2f} L {shank_l:.2f} {thread_bot:.2f} Z"
    )

    # -- Rim profile: U-channel with smooth curves --------------------------
    inner_w = inner_width_mm * s
    lip_mm = min(3.0, inner_width_mm * 0.10)
    lip = lip_mm * s

    x_out_l = cx - (inner_w / 2 + lip)
    x_out_r = cx + (inner_w / 2 + lip)
    x_in_l = cx - inner_w / 2
    x_in_r = cx + inner_w / 2

    well_px = seat_y - rim_outer_y
    hook_h = min(3.5 * s, well_px * 0.14)
    hook_y = rim_outer_y + hook_h
    trans = min(lip * 1.6, well_px * 0.10)
    r = min(2.5 * s, well_px * 0.06, lip * 0.9)

    # Outer rim U extension (how far below the seat the rim profile curves).
    u_ext_mm = max(1.5, well_depth_mm * 0.09)
    u_ext = u_ext_mm * s

    # The U-bottom: side walls angle inward then curve into a smooth
    # bottom centered on the spoke hole.
    bend_y = seat_y - well_px * 0.18
    u_bot_y = seat_y + u_ext
    u_half = shank_w / 2 + 6

    _has_iwd = inner_wall_depth_mm is not None

    rim_path = (
        # -- top / outer wall --
        f"M {x_out_l + r:.2f} {rim_outer_y:.2f} "
        f"L {x_out_r - r:.2f} {rim_outer_y:.2f} "
        f"Q {x_out_r:.2f} {rim_outer_y:.2f} {x_out_r:.2f} {rim_outer_y + r:.2f} "
        # -- right hook → side wall --
        f"L {x_out_r:.2f} {hook_y:.2f} "
        f"C {x_out_r:.2f} {hook_y + trans * 0.5:.2f} "
        f"{x_in_r:.2f} {hook_y + trans * 0.5:.2f} "
        f"{x_in_r:.2f} {hook_y + trans:.2f} "
        # -- right side wall down to bend, then curve into U-bottom --
        f"L {x_in_r:.2f} {bend_y:.2f} "
        f"C {x_in_r:.2f} {seat_y:.2f} "
        f"{cx + u_half:.2f} {u_bot_y:.2f} "
        f"{cx:.2f} {u_bot_y:.2f} "
        # -- mirror: U-bottom curves back up the left side --
        f"C {cx - u_half:.2f} {u_bot_y:.2f} "
        f"{x_in_l:.2f} {seat_y:.2f} "
        f"{x_in_l:.2f} {bend_y:.2f} "
        # -- left side wall & hook --
        f"L {x_in_l:.2f} {hook_y + trans:.2f} "
        f"C {x_in_l:.2f} {hook_y + trans * 0.5:.2f} "
        f"{x_out_l:.2f} {hook_y + trans * 0.5:.2f} "
        f"{x_out_l:.2f} {hook_y:.2f} "
        f"L {x_out_l:.2f} {rim_outer_y + r:.2f} "
        f"Q {x_out_l:.2f} {rim_outer_y:.2f} {x_out_l + r:.2f} {rim_outer_y:.2f} "
        "Z"
    )

    # -- Cavity (hollow space between outer and inner walls) ----------------
    # inner_wall_depth_mm controls the outer wall thickness (depth from the
    # outer rim edge to the cavity ceiling).  The cavity grows upward from
    # near the nipple seat toward the outer wall.
    side_t_mm = max(1.2, well_depth_mm * 0.07)
    side_t = side_t_mm * s

    if _has_iwd:
        cav_top_y = rim_outer_y + inner_wall_depth_mm * s
    else:
        outer_t_mm = max(2.0, well_depth_mm * 0.12)
        cav_top_y = rim_outer_y + outer_t_mm * s

    inner_t_mm = max(1.5, well_depth_mm * 0.09)
    inner_t = inner_t_mm * s
    cav_bot_y = seat_y - inner_t
    cav_l = x_in_l + side_t
    cav_r = x_in_r - side_t

    cr = min(1.5 * s, max(cav_bot_y - cav_top_y, 1.0) * 0.08, (cav_r - cav_l) * 0.06)

    if _has_iwd:
        # User-specified → flat-bottomed rounded rectangle.
        rim_cavity_path = (
            f"M {cav_l + cr:.2f} {cav_top_y:.2f} "
            f"L {cav_r - cr:.2f} {cav_top_y:.2f} "
            f"Q {cav_r:.2f} {cav_top_y:.2f} {cav_r:.2f} {cav_top_y + cr:.2f} "
            f"L {cav_r:.2f} {cav_bot_y - cr:.2f} "
            f"Q {cav_r:.2f} {cav_bot_y:.2f} {cav_r - cr:.2f} {cav_bot_y:.2f} "
            f"L {cav_l + cr:.2f} {cav_bot_y:.2f} "
            f"Q {cav_l:.2f} {cav_bot_y:.2f} {cav_l:.2f} {cav_bot_y - cr:.2f} "
            f"L {cav_l:.2f} {cav_top_y + cr:.2f} "
            f"Q {cav_l:.2f} {cav_top_y:.2f} {cav_l + cr:.2f} {cav_top_y:.2f} "
            "Z"
        )
    else:
        # Default: U-shaped cavity following the outer rim profile.
        cav_bend_y = bend_y + side_t
        cav_u_half = u_half - side_t * 0.5
        cav_u_bot = u_bot_y - side_t

        rim_cavity_path = (
            f"M {cav_l + cr:.2f} {cav_top_y:.2f} "
            f"L {cav_r - cr:.2f} {cav_top_y:.2f} "
            f"Q {cav_r:.2f} {cav_top_y:.2f} {cav_r:.2f} {cav_top_y + cr:.2f} "
            f"L {cav_r:.2f} {cav_bend_y:.2f} "
            f"C {cav_r:.2f} {cav_bot_y:.2f} "
            f"{cx + cav_u_half:.2f} {cav_u_bot:.2f} "
            f"{cx:.2f} {cav_u_bot:.2f} "
            f"C {cx - cav_u_half:.2f} {cav_u_bot:.2f} "
            f"{cav_l:.2f} {cav_bot_y:.2f} "
            f"{cav_l:.2f} {cav_bend_y:.2f} "
            f"L {cav_l:.2f} {cav_top_y + cr:.2f} "
            f"Q {cav_l:.2f} {cav_top_y:.2f} {cav_l + cr:.2f} {cav_top_y:.2f} "
            "Z"
        )

    # -- Spoke wire & tip --------------------------------------------------
    tip_y = seat_y + tip_from_seat_mm * s

    spoke_wire_mm = 2.0
    spoke_w = spoke_wire_mm * s
    spoke_x = cx - spoke_w / 2
    spoke_top_y = tip_y
    spoke_bot_y = barrel_end_y + 14
    spoke_h = spoke_bot_y - spoke_top_y
    spoke_thread_bot_y = spoke_top_y + spoke_thread_length_mm * s

    dim_seat_x = shank_r + 20
    dim_rim_x = shank_l - 20

    seat_mid_dy = (seat_y - tip_y) / 2 + 4
    rim_mid_dy = (tip_y - rim_outer_y) / 2 + 4

    return SectionDetail(
        view_w=view_w,
        view_h=view_h,
        cx=cx,
        scale=s,
        rim_path=rim_path,
        rim_cavity_path=rim_cavity_path,
        nipple_head_path=nipple_head_path,
        nipple_body_path=nipple_body_path,
        nipple_thread_zone_path=nipple_thread_zone_path,
        seat_y=seat_y,
        rim_outer_y=rim_outer_y,
        rim_cavity_top_y=cav_top_y,
        rim_cavity_bot_y=cav_bot_y,
        barrel_end_y=barrel_end_y,
        tip_y=tip_y,
        has_inner_wall_depth=_has_iwd,
        spoke_x=spoke_x,
        spoke_w=spoke_w,
        spoke_top_y=spoke_top_y,
        spoke_bot_y=spoke_bot_y,
        spoke_h=spoke_h,
        spoke_thread_bot_y=spoke_thread_bot_y,
        spoke_thread_h=spoke_thread_bot_y - spoke_top_y,
        dim_seat_x=dim_seat_x,
        dim_rim_x=dim_rim_x,
        seat_mid_dy=seat_mid_dy,
        rim_mid_dy=rim_mid_dy,
    )
