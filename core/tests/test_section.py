from django.test import Client, TestCase
from django.urls import reverse

from core.models import Hub, Nipple, Rim
from core.section_layout import build_section_layout


class SectionLayoutTests(TestCase):
    def setUp(self):
        self.rim = Rim.objects.create(
            name="T",
            erd_mm=600,
            inner_width_mm=20,
            well_depth_mm=16,
        )
        self.hub = Hub.objects.create(
            name="H",
            left_flange_pcd_mm=58,
            right_flange_pcd_mm=58,
            left_flange_offset_mm=35,
            right_flange_offset_mm=20,
        )
        self.nip = Nipple.objects.create(
            name="N",
            head_diameter_mm=7,
            head_height_mm=5,
            body_length_mm=10,
            shank_diameter_mm=4,
        )

    def test_build_section_paths(self):
        d = build_section_layout(self.rim, self.hub, self.nip, side="right")
        self.assertTrue(d.rim_path.startswith("M"))
        self.assertIn("L", d.nipple_head_path)
        # SVG y grows downward; nipple sits “above” the flange toward the rim.
        self.assertLess(d.nipple_y, d.flange_y)


class RimSectionViewTests(TestCase):
    def setUp(self):
        Rim.objects.create(name="R", erd_mm=599, inner_width_mm=22, well_depth_mm=17)
        Hub.objects.create(
            name="H",
            left_flange_pcd_mm=92.6,
            right_flange_pcd_mm=92.6,
            left_flange_offset_mm=29.3,
            right_flange_offset_mm=24.5,
        )
        Nipple.objects.create(
            name="N",
            head_diameter_mm=7.2,
            head_height_mm=5.5,
            body_length_mm=12,
            shank_diameter_mm=4.5,
        )

    def test_rim_section_get_shows_diagram(self):
        c = Client()
        r = c.get(reverse("core:rim_section"))
        self.assertEqual(r.status_code, 200)
        self.assertIsNotNone(r.context["diagram"])

    def test_rim_section_empty_db(self):
        Rim.objects.all().delete()
        c = Client()
        r = c.get(reverse("core:rim_section"))
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.context["has_parts"])
