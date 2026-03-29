import math

from django.test import TestCase

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


