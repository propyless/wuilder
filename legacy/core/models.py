from django.db import models


class Rim(models.Model):
    """Rim reference; dimensions drive cross-section sketch and spoke math."""

    name = models.CharField(max_length=120)
    erd_mm = models.FloatField(help_text="Effective rim diameter at nipple seat (mm).")
    inner_width_mm = models.FloatField(
        help_text="Inner width at/near nipple level — schematic cavity width (mm).",
    )
    well_depth_mm = models.FloatField(
        help_text="Schematic: nipple seat up to cavity roof / brake-surface reference (mm).",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} (ERD {self.erd_mm:g})"


class Hub(models.Model):
    """Hub flange geometry; offsets match spoke calculator (center plane to flange)."""

    name = models.CharField(max_length=120)
    left_flange_pcd_mm = models.FloatField()
    right_flange_pcd_mm = models.FloatField()
    left_flange_offset_mm = models.FloatField(
        help_text="Wheel center plane to left flange hole circle (mm).",
    )
    right_flange_offset_mm = models.FloatField(
        help_text="Wheel center plane to right flange hole circle (mm).",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Nipple(models.Model):
    """Nipple body / head — used for penetration sketch into rim well."""

    name = models.CharField(max_length=120)
    head_diameter_mm = models.FloatField()
    head_height_mm = models.FloatField(
        help_text="Axial depth of head inside rim well / counterbore (mm).",
    )
    body_length_mm = models.FloatField(
        help_text="Overall exposed body beyond rim seat toward hub, for diagram (mm).",
    )
    shank_diameter_mm = models.FloatField(
        default=4.0,
        help_text="Body OD at rim interface, schematic (mm).",
    )
    internal_thread_length_mm = models.FloatField(
        default=0.0,
        help_text="Usable threaded bore length along nipple axis from seat toward hub (mm).",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
