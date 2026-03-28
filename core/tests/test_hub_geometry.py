from django.test import Client, TestCase
from django.urls import reverse

from core.hub_geometry import (
    build_hub_side_view_svg,
    build_illustrative_ratio_summary,
    geometry_ready_for_ratio,
    illustrative_other_as_pct_of_reference,
    side_mean_spoke_lengths_mm,
)
from core.tests.test_tm1 import _tension_post_data


class IllustrativeRatioTests(TestCase):
    def test_symmetric_hub_equal_lengths_is_100pct(self):
        p = illustrative_other_as_pct_of_reference(
            reference_side="left",
            w_left_mm=35.0,
            w_right_mm=35.0,
            avg_len_left_mm=290.0,
            avg_len_right_mm=290.0,
        )
        self.assertAlmostEqual(p, 100.0, places=5)

    def test_illustrative_summary_matches_formula_left_ref(self):
        s = build_illustrative_ratio_summary(
            reference_side="left",
            left_avg_kgf=100.0,
            right_avg_kgf=83.0,
            w_left_mm=35.0,
            w_right_mm=20.0,
            avg_len_left_mm=300.0,
            avg_len_right_mm=300.0,
        )
        self.assertEqual(s.other_side, "right")
        self.assertAlmostEqual(s.illustrative_other_pct, 100.0 * 35.0 / 20.0)
        self.assertAlmostEqual(s.measured_other_as_pct_of_ref, 83.0)


class SideMeanLengthsTests(TestCase):
    def test_side_means_positive(self):
        ll, lr = side_mean_spoke_lengths_mm(
            erd_mm=600.0,
            spoke_count=32,
            crosses=3,
            left_flange_radius_mm=29.0,
            right_flange_radius_mm=29.0,
            left_flange_offset_mm=35.0,
            right_flange_offset_mm=20.0,
        )
        self.assertGreater(ll, 0.0)
        self.assertGreater(lr, 0.0)


class HubSideViewSvgTests(TestCase):
    def test_flange_x_ordering(self):
        s = build_hub_side_view_svg(35.0, 20.0)
        self.assertLess(s.left_flange_x, s.center_x)
        self.assertGreater(s.right_flange_x, s.center_x)


class GeometryReadyTests(TestCase):
    def test_ready_when_all_present(self):
        self.assertTrue(
            geometry_ready_for_ratio(
                erd_mm=600.0,
                left_pcd_mm=58.0,
                right_pcd_mm=58.0,
                crosses=3,
                left_offset_mm=35.0,
                right_offset_mm=20.0,
            )
        )

    def test_not_ready_if_crosses_none(self):
        self.assertFalse(
            geometry_ready_for_ratio(
                erd_mm=600.0,
                left_pcd_mm=58.0,
                right_pcd_mm=58.0,
                crosses=None,
                left_offset_mm=35.0,
                right_offset_mm=20.0,
            )
        )


class TensionHubGeometryIntegrationTests(TestCase):
    def test_post_with_hub_fields_renders_diagram_and_illustrative(self):
        c = Client()
        d = _tension_post_data(12)
        d["hub_left_offset_mm"] = 35
        d["hub_right_offset_mm"] = 20
        d["hub_erd_mm"] = 600
        d["hub_left_flange_pcd_mm"] = 58
        d["hub_right_flange_pcd_mm"] = 58
        d["hub_crosses"] = 2  # max_crosses(12) == 2
        r = c.post(reverse("core:tension_map"), d)
        self.assertEqual(r.status_code, 200)
        text = r.content.decode()
        self.assertIn("Hub offsets (axial)", text)
        self.assertIn("Illustrative geometry ratio", text)
