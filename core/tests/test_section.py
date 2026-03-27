import math

from django.test import Client, TestCase
from django.urls import reverse

from core.models import Hub, Nipple, Rim
from core.section_layout import build_section_layout
from core.spoke_length import spoke_length_mm


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
        hole = 2.6
        crosses = 3
        n = 32
        d = build_section_layout(
            self.rim,
            self.hub,
            self.nip,
            side="right",
            spoke_count=n,
            crosses=crosses,
            flange_hole_diameter_mm=hole,
            nipple_correction_mm=0.0,
        )
        self.assertTrue(d.rim_path.startswith("M"))
        self.assertIn("L", d.nipple_head_path)
        self.assertLess(d.nipple_y, d.flange_y)
        w = self.hub.right_flange_offset_mm
        raw = spoke_length_mm(
            self.rim.erd_mm,
            self.hub.right_flange_pcd_mm / 2,
            w,
            crosses,
            n,
        )
        expect_L = raw - hole / 2
        self.assertAlmostEqual(d.spoke_length_mm, expect_L, places=6)
        dx_mm = (d.flange_x - d.nipple_x) / d.scale_mm_per_px
        dy_mm = (d.flange_y - d.nipple_y) / d.scale_mm_per_px
        self.assertAlmostEqual(math.hypot(dx_mm, dy_mm), expect_L, places=4)


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
