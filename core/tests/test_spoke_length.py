import math
from django.test import SimpleTestCase

from core.spoke_length import (
    build_spoke_results,
    flange_offsets_from_hub_overall_width,
    lacing_angle_rad,
    max_crosses,
    spoke_length_mm,
)


class SpokeLengthFormulaTests(SimpleTestCase):
    def test_radial_matches_pythagoras(self):
        R = 300.0
        r = 29.0
        w = 35.0
        n = 32
        direct = math.sqrt((R - r) ** 2 + w * w)
        got = spoke_length_mm(R * 2, r, w, 0, n)
        self.assertAlmostEqual(got, direct, places=6)

    def test_lacing_angle_three_cross_32h(self):
        deg = math.degrees(lacing_angle_rad(3, 32))
        self.assertAlmostEqual(deg, 67.5, places=5)

    def test_lacing_angle_matches_two_step_theta(self):
        """θ = 2π·C/n_side equals 4π·C/N (reference scripts)."""
        for spokes, cross in ((32, 3), (36, 3), (28, 2)):
            n_side = spokes // 2
            theta = (2 * math.pi * cross) / n_side
            self.assertAlmostEqual(
                lacing_angle_rad(cross, spokes), theta, places=12
            )

    def test_lacing_angle_rejects_odd_total(self):
        with self.assertRaises(ValueError):
            lacing_angle_rad(3, 31)


class FlangeOffsetFromOverallWidthTests(SimpleTestCase):
    def test_reference_hub_100_x265_y165(self):
        """Matches common online offset helper: W=100, x=26.5, y=16.5 → L,R,F."""
        o = flange_offsets_from_hub_overall_width(100.0, 26.5, 16.5)
        self.assertAlmostEqual(o.half_width_mm, 50.0)
        self.assertAlmostEqual(o.left_flange_offset_mm, 23.5)
        self.assertAlmostEqual(o.right_flange_offset_mm, 33.5)
        self.assertAlmostEqual(o.flange_to_flange_mm, 57.0)

    def test_rejects_x_exceeding_half_width(self):
        with self.assertRaises(ValueError):
            flange_offsets_from_hub_overall_width(100.0, 51.0, 10.0)


class MaxCrossesTests(SimpleTestCase):
    def test_bound(self):
        self.assertEqual(max_crosses(32), 7)
        self.assertEqual(max_crosses(12), 2)


class BuildSpokesTests(SimpleTestCase):
    def test_left_right_alternate(self):
        rows = build_spoke_results(
            erd_mm=600,
            spoke_count=32,
            crosses=3,
            left_flange_radius_mm=29,
            right_flange_radius_mm=29,
            left_flange_offset_mm=34,
            right_flange_offset_mm=34,
            nipple_correction_mm=0,
            rotation_rad=0,
        )
        self.assertEqual(len(rows), 32)
        self.assertEqual(rows[0].side, "left")
        self.assertEqual(rows[1].side, "right")

    def test_symmetric_lengths_two_groups_disk(self):
        rows = build_spoke_results(
            erd_mm=600,
            spoke_count=32,
            crosses=3,
            left_flange_radius_mm=31,
            right_flange_radius_mm=35,
            left_flange_offset_mm=36,
            right_flange_offset_mm=32,
            nipple_correction_mm=0,
            rotation_rad=0,
        )
        left = {round(s.length_mm, 3) for s in rows if s.side == "left"}
        right = {round(s.length_mm, 3) for s in rows if s.side == "right"}
        self.assertEqual(len(left), 1)
        self.assertEqual(len(right), 1)
        self.assertNotEqual(left, right)


class ReferenceScriptParityTests(SimpleTestCase):
    """Same geometry as two-step sqrt(horizontal²+O²) − hole_dia/2."""

    def test_user_reference_wheel(self):
        n_side = 16
        theta = (2 * math.pi * 3) / n_side
        R_r = 599 / 2
        R_f = 92.6 / 2
        hole = 2.6

        def ref_length(offset_mm: float) -> float:
            horizontal = math.sqrt(
                R_r**2 + R_f**2 - 2 * R_r * R_f * math.cos(theta)
            )
            return math.sqrt(horizontal**2 + offset_mm**2) - hole / 2

        rows = build_spoke_results(
            erd_mm=599,
            spoke_count=32,
            crosses=3,
            left_flange_radius_mm=R_f,
            right_flange_radius_mm=R_f,
            left_flange_offset_mm=29.3,
            right_flange_offset_mm=24.5,
            flange_hole_diameter_mm=hole,
            nipple_correction_mm=0,
            rotation_rad=0,
        )
        left_len = next(s.length_mm for s in rows if s.side == "left")
        right_len = next(s.length_mm for s in rows if s.side == "right")
        self.assertAlmostEqual(left_len, ref_length(29.3), places=9)
        self.assertAlmostEqual(right_len, ref_length(24.5), places=9)
