import math
from django.test import SimpleTestCase

from core.spoke_length import (
    build_spoke_results,
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
