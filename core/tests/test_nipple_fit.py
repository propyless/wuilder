from django.test import Client, TestCase
from django.urls import reverse

from core.models import Nipple
from core.nipple_fit import compute_nipple_fit


class NippleFitUnitTests(TestCase):
    """Unit tests for compute_nipple_fit with the corrected tip-position model.

    tip_from_seat = calculated_spoke_length - ordered_spoke_length
    """

    def test_exact_length_tip_at_seat(self):
        """Ordered == calculated → tip exactly at the seat."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=290.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=16.0,
            well_depth_mm=17.0,
        )
        self.assertAlmostEqual(fit.tip_from_seat_mm, 0.0)
        self.assertAlmostEqual(fit.tip_to_rim_outer_mm, 17.0)
        self.assertAlmostEqual(fit.thread_engagement_mm, 10.0)

    def test_spoke_rounded_up_tip_past_seat(self):
        """Ordered 2 mm longer → tip 2 mm past seat into cavity."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=292.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=16.0,
            well_depth_mm=17.0,
        )
        self.assertAlmostEqual(fit.tip_from_seat_mm, -2.0)
        self.assertAlmostEqual(fit.tip_to_rim_outer_mm, 15.0)
        self.assertAlmostEqual(fit.thread_engagement_mm, 10.0)

    def test_spoke_rounded_down_tip_inside_body(self):
        """Ordered 4 mm shorter → tip 4 mm inside the body."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=286.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=16.0,
            well_depth_mm=17.0,
        )
        self.assertAlmostEqual(fit.tip_from_seat_mm, 4.0)
        self.assertAlmostEqual(fit.tip_to_rim_outer_mm, 21.0)
        # Thread zone [4, 20] overlaps internal [0, 10] → overlap [4, 10] = 6
        self.assertAlmostEqual(fit.thread_engagement_mm, 6.0)

    def test_short_thread_engagement_limited(self):
        """Short spoke thread → engagement limited by spoke thread length."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=290.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=5.0,
            well_depth_mm=17.0,
        )
        # Thread zone [0, 5] overlaps internal [0, 10] → 5
        self.assertAlmostEqual(fit.thread_engagement_mm, 5.0)
        self.assertAlmostEqual(fit.tip_from_seat_mm, 0.0)

    def test_very_long_spoke_negative_rim_distance(self):
        """Extreme case: spoke tip would poke through the rim."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=313.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=16.0,
            well_depth_mm=17.0,
        )
        self.assertAlmostEqual(fit.tip_from_seat_mm, -23.0)
        self.assertAlmostEqual(fit.tip_to_rim_outer_mm, -6.0)

    def test_spoke_way_too_short_no_engagement(self):
        """Spoke so short its thread doesn't reach the internal thread zone."""
        fit = compute_nipple_fit(
            calculated_spoke_length_mm=290.0,
            ordered_spoke_length_mm=274.0,
            nipple_body_length_mm=12.0,
            internal_thread_length_mm=10.0,
            spoke_thread_length_mm=5.0,
            well_depth_mm=17.0,
        )
        # tip_from_seat = 16, thread zone [16, 21], internal [0, 10] → no overlap
        self.assertAlmostEqual(fit.tip_from_seat_mm, 16.0)
        self.assertAlmostEqual(fit.thread_engagement_mm, 0.0)


class SpokeCalculatorWithSectionTests(TestCase):
    """POST the spoke calculator with section fields and verify diagram + detail context."""

    def setUp(self):
        self.nip = Nipple.objects.create(
            name="Test nipple",
            head_diameter_mm=7.2,
            head_height_mm=5.5,
            body_length_mm=12.0,
            shank_diameter_mm=4.5,
            internal_thread_length_mm=10.0,
        )

    def _post_data(self, **overrides):
        base = {
            "erd_mm": 599,
            "spoke_count": 32,
            "crosses": 3,
            "left_flange_diameter_mm": 92.6,
            "right_flange_diameter_mm": 92.6,
            "left_flange_offset_mm": 29.3,
            "right_flange_offset_mm": 24.5,
            "flange_hole_diameter_mm": 2.6,
            "nipple_correction_mm": 0.0,
            "rotation_deg": 0.0,
            "section_side": "right",
            "rim_inner_width_mm": 22.0,
            "rim_well_depth_mm": 17.0,
            "nipple": self.nip.pk,
            "spoke_thread_length_mm": 16.0,
        }
        base.update(overrides)
        return base

    def test_post_with_section_returns_detail(self):
        c = Client()
        r = c.post(reverse("core:spoke_calculator"), self._post_data())
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("diagram", r.context)
        self.assertIn("nipple_fit", r.context)
        self.assertIn("detail", r.context)
        fit = r.context["nipple_fit"]
        self.assertGreater(fit.thread_engagement_mm, 0)
        self.assertAlmostEqual(fit.tip_from_seat_mm, 0.0)
        self.assertGreater(fit.tip_to_rim_outer_mm, 0)

    def test_post_with_ordered_length(self):
        c = Client()
        r = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(ordered_spoke_length_mm=286.0),
        )
        self.assertEqual(r.status_code, 200)
        fit = r.context["nipple_fit"]
        self.assertGreater(fit.calculated_spoke_length_mm, 0)
        self.assertAlmostEqual(
            fit.tip_from_seat_mm,
            fit.calculated_spoke_length_mm - 286.0,
        )

    def test_post_with_inner_wall_depth(self):
        c = Client()
        r = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(rim_inner_wall_depth_mm=5.0),
        )
        self.assertEqual(r.status_code, 200)
        detail = r.context["detail"]
        self.assertTrue(detail.has_inner_wall_depth)
        self.assertLess(detail.rim_cavity_bot_y, detail.seat_y)
        self.assertGreater(detail.rim_cavity_top_y, detail.rim_outer_y)

    def test_inner_wall_depth_controls_cavity_top(self):
        """Larger inner wall depth → thicker outer wall → cavity top further from rim edge."""
        c = Client()
        r_thin = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(rim_inner_wall_depth_mm=3.0),
        )
        r_thick = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(rim_inner_wall_depth_mm=10.0),
        )
        thin = r_thin.context["detail"]
        thick = r_thick.context["detail"]
        self.assertGreater(thick.rim_cavity_top_y, thin.rim_cavity_top_y)

    def test_post_with_inner_wall_depth_svg_labels(self):
        c = Client()
        r = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(rim_inner_wall_depth_mm=14.0),
        )
        content = r.content.decode()
        self.assertIn("Inner wall", content)
        self.assertIn("Nipple seat", content)

    def test_post_without_inner_wall_depth_combined_label(self):
        c = Client()
        r = c.post(reverse("core:spoke_calculator"), self._post_data())
        content = r.content.decode()
        self.assertIn("Inner wall / seat", content)
        detail = r.context["detail"]
        self.assertFalse(detail.has_inner_wall_depth)

    def test_inner_wall_depth_gte_rim_depth_is_error(self):
        c = Client()
        r = c.post(
            reverse("core:spoke_calculator"),
            self._post_data(rim_inner_wall_depth_mm=17.0),
        )
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.context["form"].errors.get("rim_inner_wall_depth_mm"))

    def test_post_without_section_fields_no_diagram(self):
        c = Client()
        data = self._post_data()
        del data["rim_inner_width_mm"]
        del data["rim_well_depth_mm"]
        del data["nipple"]
        r = c.post(reverse("core:spoke_calculator"), data)
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("diagram", r.context)
        self.assertNotIn("detail", r.context)

    def test_post_detail_svg_in_response(self):
        c = Client()
        r = c.post(reverse("core:spoke_calculator"), self._post_data())
        content = r.content.decode()
        self.assertIn("det-spoke", content)
        self.assertIn("spoke tip", content)
        self.assertIn("Barrel end", content)
        self.assertIn("Outer wall", content)

    def test_get_renders_fieldset(self):
        c = Client()
        r = c.get(reverse("core:spoke_calculator"))
        content = r.content.decode()
        self.assertIn("section-fieldset", content)
        self.assertIn("id_spoke_thread_length_mm", content)
        self.assertIn("id_ordered_spoke_length_mm", content)
        self.assertIn("id_rim_inner_wall_depth_mm", content)
