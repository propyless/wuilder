from django.test import Client, TestCase
from django.urls import reverse

from core.forms import TensionMapForm
from core.tm1 import TM1LookupError, deflection_for_kgf, tension_kgf
from core.tension_viz import (
    adjustment_action,
    build_tension_ratio_summary,
    build_tension_side_stats,
    build_tension_spoke_rows,
    side_average_kgf,
    tension_deviation_band,
    uses_side_ratio,
    variance_limit_detail,
)


def _tension_post_data(spoke_count: int, **overrides):
    n_half = spoke_count // 2
    d = {
        "spoke_count": spoke_count,
        "tm1_chart": "steel_round_2.0",
        "variance_percent": 20,
        "tension_ratio_reference": "left",
        "tension_ratio_other_pct": 100,
    }
    for i in range(n_half):
        d[f"left_{i}"] = 20
        d[f"right_{i}"] = 20
    d.update(overrides)
    return d


class TM1LookupTests(TestCase):
    def test_deflection_for_kgf_roundtrip(self):
        chart = "steel_round_2.0"
        for x in (17.0, 20.0, 22.5, 27.0):
            k = tension_kgf(chart, x)
            x2 = deflection_for_kgf(chart, k)
            self.assertAlmostEqual(x2, x, places=5)

    def test_deflection_for_kgf_below_range_raises(self):
        with self.assertRaises(TM1LookupError):
            deflection_for_kgf("steel_round_2.0", 50.0)

    def test_exact_knot_steel_round_2_0(self):
        self.assertAlmostEqual(tension_kgf("steel_round_2.0", 20.0), 70.0)

    def test_interpolation_mid_segment(self):
        self.assertAlmostEqual(tension_kgf("steel_round_2.0", 20.5), 73.5)

    def test_below_range_raises(self):
        with self.assertRaises(TM1LookupError):
            tension_kgf("steel_round_2.0", 16.9)

    def test_above_range_raises(self):
        with self.assertRaises(TM1LookupError):
            tension_kgf("steel_round_2.0", 28.1)


class AdjustmentActionTests(TestCase):
    def test_within_band_empty(self):
        self.assertEqual(adjustment_action(25.0, True), ("", ""))

    def test_low_tighten(self):
        self.assertEqual(adjustment_action(-21.0, False), ("Tighten", "T"))

    def test_high_loosen(self):
        self.assertEqual(adjustment_action(21.0, False), ("Loosen", "L"))


class UsesSideRatioTests(TestCase):
    def test_100_is_park(self):
        self.assertFalse(uses_side_ratio(100.0))
        self.assertFalse(uses_side_ratio(100))

    def test_non_100_uses_ratio(self):
        self.assertTrue(uses_side_ratio(84.0))
        self.assertTrue(uses_side_ratio(99.99))


class SideAverageTests(TestCase):
    def test_side_average_kgf(self):
        self.assertEqual(
            side_average_kgf([70.0, 80.0, 90.0, 100.0], 4),
            (80.0, 90.0),
        )


class TensionSideStatsTests(TestCase):
    def test_build_side_stats_limits_and_readings(self):
        s = build_tension_side_stats(
            [100.0, 100.0, 100.0],
            variance_percent=10.0,
            chart_id="steel_round_2.0",
        )
        self.assertAlmostEqual(s.avg_kgf, 100.0)
        self.assertAlmostEqual(s.upper_kgf, 110.0)
        self.assertAlmostEqual(s.lower_kgf, 90.0)
        self.assertIsNotNone(s.upper_reading)
        self.assertIsNotNone(s.lower_reading)
        self.assertAlmostEqual(tension_kgf("steel_round_2.0", s.upper_reading), 110.0, places=3)
        self.assertAlmostEqual(tension_kgf("steel_round_2.0", s.lower_reading), 90.0, places=3)


class VarianceLimitMessageTests(TestCase):
    def test_inside_shows_headroom(self):
        self.assertIn("under", variance_limit_detail(12.0, 20.0))
        self.assertIn("8.0%", variance_limit_detail(12.0, 20.0))

    def test_outside_shows_past(self):
        self.assertIn("past", variance_limit_detail(25.0, 20.0))
        self.assertIn("5.0%", variance_limit_detail(25.0, 20.0))

    def test_negative_percent_symmetric(self):
        self.assertIn("under", variance_limit_detail(-15.0, 20.0))


class TensionVizTests(TestCase):
    def test_deviation_bands(self):
        self.assertEqual(tension_deviation_band(0.0)[1], "tension-good")
        self.assertEqual(tension_deviation_band(5.0)[1], "tension-good")
        self.assertEqual(tension_deviation_band(-5.0)[1], "tension-good")
        self.assertEqual(tension_deviation_band(7.0)[1], "tension-ok")
        self.assertEqual(tension_deviation_band(12.0)[1], "tension-warn")
        self.assertEqual(tension_deviation_band(20.0)[1], "tension-bad")

    def test_build_rows_count_and_side(self):
        n = 4
        readings = [20.0, 20.0, 20.0, 20.0]
        tensions = [70.0, 70.0, 70.0, 70.0]
        rows = build_tension_spoke_rows(
            spoke_count=n,
            readings=readings,
            tensions_kgf=tensions,
        )
        self.assertEqual(len(rows), 4)
        self.assertEqual(rows[0].side, "left")
        self.assertEqual(rows[1].side, "right")
        self.assertTrue(rows[0].within_variance)
        self.assertAlmostEqual(rows[0].reference_kgf, 70.0)
        self.assertAlmostEqual(rows[1].reference_kgf, 70.0)

    def test_within_variance_respects_limit(self):
        rows = build_tension_spoke_rows(
            spoke_count=4,
            readings=[20.0, 20.0, 20.0, 20.0],
            tensions_kgf=[70.0, 70.0, 70.0, 110.0],
            variance_percent=20.0,
        )
        self.assertTrue(rows[0].within_variance)
        self.assertFalse(rows[3].within_variance)
        self.assertIn("past", rows[3].variance_limit_detail)
        self.assertEqual(rows[3].adjust_action, "Loosen")
        self.assertEqual(rows[3].adjust_short, "L")
        self.assertEqual(rows[0].adjust_action, "")

    def test_outside_low_suggests_tighten(self):
        rows = build_tension_spoke_rows(
            spoke_count=6,
            readings=[20.0] * 6,
            tensions_kgf=[40.0, 70.0, 70.0, 70.0, 70.0, 70.0],
            variance_percent=20.0,
        )
        self.assertFalse(rows[0].within_variance)
        self.assertEqual(rows[0].adjust_action, "Tighten")

    def test_ratio_mode_left_reference_84(self):
        rows = build_tension_spoke_rows(
            spoke_count=4,
            readings=[0.0, 0.0, 0.0, 0.0],
            tensions_kgf=[100.0, 84.0, 100.0, 84.0],
            variance_percent=20.0,
            balance_mode="ratio",
            ratio_reference_side="left",
            ratio_other_pct=84.0,
        )
        self.assertTrue(all(r.within_variance for r in rows))
        self.assertAlmostEqual(rows[0].reference_kgf, 100.0)
        self.assertAlmostEqual(rows[1].reference_kgf, 84.0)

    def test_ratio_mode_right_reference_flags_high_other_side(self):
        rows = build_tension_spoke_rows(
            spoke_count=4,
            readings=[0.0, 0.0, 0.0, 0.0],
            tensions_kgf=[120.0, 100.0, 120.0, 100.0],
            variance_percent=5.0,
            balance_mode="ratio",
            ratio_reference_side="right",
            ratio_other_pct=84.0,
        )
        self.assertAlmostEqual(rows[0].reference_kgf, 84.0)
        self.assertFalse(rows[0].within_variance)


class TensionRatioSummaryTests(TestCase):
    def test_summary_left_ref(self):
        s = build_tension_ratio_summary(
            100.0,
            83.0,
            reference_side="left",
            other_pct=84.0,
        )
        self.assertEqual(s.other_side, "right")
        self.assertAlmostEqual(s.target_other_avg_kgf, 84.0)
        self.assertAlmostEqual(s.measured_other_as_pct_of_ref, 83.0)


class TensionMapFormTests(TestCase):
    def test_left_right_fields_interleaved_to_rim_order(self):
        d = _tension_post_data(12)
        for i in range(6):
            d[f"left_{i}"] = 17 + i
            d[f"right_{i}"] = 23 + i
        f = TensionMapForm(d)
        self.assertTrue(f.is_valid(), f.errors)
        self.assertEqual(
            f.cleaned_data["readings_parsed"],
            [17.0, 23.0, 18.0, 24.0, 19.0, 25.0, 20.0, 26.0, 21.0, 27.0, 22.0, 28.0],
        )


class TensionMapIntegrationTests(TestCase):
    def test_post_ratio_mode_renders_summary(self):
        c = Client()
        d = _tension_post_data(12)
        d["tension_ratio_reference"] = "left"
        d["tension_ratio_other_pct"] = 84
        r = c.post(reverse("core:tension_map"), d)
        self.assertEqual(r.status_code, 200)
        self.assertIn("Side ratio", r.content.decode())

    def test_post_renders_table_and_heatmap(self):
        c = Client()
        r = c.post(
            reverse("core:tension_map"),
            _tension_post_data(12),
        )
        self.assertEqual(r.status_code, 200)
        content = r.content.decode()
        self.assertIn("tension-good", content)
        self.assertIn("70.00", content)
        self.assertIn("under", content)
        self.assertIn("tension-radar-left", content)
        self.assertNotIn("tension-rim-marker", content)
        self.assertNotIn("tension-kgf-arrow", content)
        self.assertIn("Same-side average tension", content)
        _i = content.find("tension-stat-dual-left")
        self.assertNotEqual(_i, -1, "expected same-side averages panel")
        _chunk = content[_i : _i + 400]
        self.assertIn('tension-stat-side">Left</span>', _chunk)
        self.assertIn("70.00", _chunk)
        self.assertIn("kgf", _chunk)
        self.assertIn("Average spoke tension (kgf)", content)
        self.assertIn("Standard deviation of tension (kgf)", content)

    def test_post_out_of_band_shows_adjust_and_rim_marker(self):
        c = Client()
        d = _tension_post_data(12)
        d["right_0"] = 24
        r = c.post(reverse("core:tension_map"), d)
        self.assertEqual(r.status_code, 200)
        content = r.content.decode()
        self.assertIn("tension-rim-marker", content)
        self.assertIn("#2 L", content)
        self.assertIn("tension-kgf-arrow", content)
        self.assertIn("↓", content)

    def test_missing_right_reading_shows_error(self):
        c = Client()
        d = _tension_post_data(12)
        del d["right_5"]
        r = c.post(reverse("core:tension_map"), d)
        self.assertEqual(r.status_code, 200)
        self.assertContains(r, "required", status_code=200)
