"""
Spoke-through-nipple protrusion geometry (schematic, no FEA / thread-pitch solve).

The spoke enters the nipple from the hub side (barrel end).  The nipple head
sits inside the rim cavity; the threaded body hangs below (hubward).

Coordinate axis along the nipple bore, origin at the **seat** (where head
meets body), hubward = positive:

    rim outer edge     −well_depth_mm
    ───────────────
    rim cavity
    ═══════════════     0   (seat line)
    nipple body         0 … +body_length_mm
    ───────────────    +body_length_mm   (barrel end, hub side)

The spoke length calculator gives the geometric distance from the hub hole to
the nipple seat (ERD/2).  At that exact length the spoke tip IS at the seat.
The tip only moves off the seat when the ordered (purchased) spoke differs
from the calculated length:

    tip_from_seat = calculated_spoke_length − ordered_spoke_length

    Positive → spoke is short, tip inside body (hasn't reached the seat).
    Zero     → tip exactly at the seat.
    Negative → spoke is long, tip past seat into the rim cavity.

Thread engagement is the overlap between the spoke's threaded zone
[tip_from_seat … tip_from_seat + spoke_thread_length] and the nipple's
internal thread zone [0 … internal_thread_length].

All lengths in mm.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NippleFit:
    """Geometric spoke-through-nipple fit at the ordered spoke length."""

    calculated_spoke_length_mm: float
    ordered_spoke_length_mm: float
    nipple_body_length_mm: float
    internal_thread_length_mm: float
    spoke_thread_length_mm: float
    well_depth_mm: float

    thread_engagement_mm: float
    tip_from_seat_mm: float
    tip_to_rim_outer_mm: float


def compute_nipple_fit(
    *,
    calculated_spoke_length_mm: float,
    ordered_spoke_length_mm: float,
    nipple_body_length_mm: float,
    internal_thread_length_mm: float,
    spoke_thread_length_mm: float,
    well_depth_mm: float,
) -> NippleFit:
    """Compute geometric spoke-tip position and two builder-useful distances.

    ``tip_from_seat_mm``: signed distance from the spoke tip to the nipple seat.
        Positive  → tip is inside the body, X mm from the seat (spoke short).
        Zero      → tip exactly at the seat.
        Negative  → tip has passed the seat X mm into the rim cavity (spoke long).

    ``tip_to_rim_outer_mm``: distance from spoke tip to the outermost rim edge.
        Positive  → tip is below the outer edge (normal).
        Negative  → tip would poke through the rim (critical).

    ``thread_engagement_mm``: overlap of the spoke thread and the nipple's
        internal thread bore — the zone that actually carries load.
    """
    tip_from_seat = calculated_spoke_length_mm - ordered_spoke_length_mm

    tip_to_rim_outer = well_depth_mm + tip_from_seat

    engagement = max(
        0.0,
        min(tip_from_seat + spoke_thread_length_mm, internal_thread_length_mm)
        - max(tip_from_seat, 0.0),
    )

    return NippleFit(
        calculated_spoke_length_mm=calculated_spoke_length_mm,
        ordered_spoke_length_mm=ordered_spoke_length_mm,
        nipple_body_length_mm=nipple_body_length_mm,
        internal_thread_length_mm=internal_thread_length_mm,
        spoke_thread_length_mm=spoke_thread_length_mm,
        well_depth_mm=well_depth_mm,
        thread_engagement_mm=engagement,
        tip_from_seat_mm=tip_from_seat,
        tip_to_rim_outer_mm=tip_to_rim_outer,
    )
