from django import forms

from .spoke_length import max_crosses


def _spoke_count_choices():
    return [(n, str(n)) for n in range(12, 53, 2)]


class SpokeCalculatorForm(forms.Form):
    erd_mm = forms.FloatField(
        label="ERD (mm)",
        min_value=200,
        max_value=700,
        help_text="Effective rim diameter at the nipple seat.",
    )
    spoke_count = forms.TypedChoiceField(
        label="Spokes",
        coerce=int,
        choices=_spoke_count_choices(),
        initial=32,
    )
    crosses = forms.IntegerField(
        label="Crosses",
        min_value=0,
        max_value=20,
        initial=3,
        help_text="Per side; same pattern on left and right.",
    )
    left_flange_diameter_mm = forms.FloatField(
        label="Left flange PCD (mm)",
        min_value=20,
        max_value=200,
        help_text="Pitch circle diameter of spoke holes on the left flange.",
    )
    right_flange_diameter_mm = forms.FloatField(
        label="Right flange PCD (mm)",
        min_value=20,
        max_value=200,
        help_text="Usually matched to left on front hubs.",
    )
    left_flange_offset_mm = forms.FloatField(
        label="Left flange offset (mm)",
        min_value=0,
        max_value=120,
        help_text="From the wheel center plane (rim / nipple plane when centered) to the left flange hole circle — same idea as *L* on hub offset diagrams.",
    )
    right_flange_offset_mm = forms.FloatField(
        label="Right flange offset (mm)",
        min_value=0,
        max_value=120,
        help_text="From the wheel center plane to the right flange hole circle — same idea as *R* on hub offset diagrams.",
    )
    flange_hole_diameter_mm = forms.FloatField(
        label="Hub spoke hole diameter (mm)",
        required=False,
        initial=0.0,
        min_value=0,
        max_value=10,
        help_text="Subtracts half this from length (spoke in hole). Use e.g. 2.6 to match many hub sheets and third-party calculators; 0 = raw center-to-center.",
    )
    nipple_correction_mm = forms.FloatField(
        label="Nipple correction (mm)",
        required=False,
        initial=0.0,
        help_text="Optional constant (e.g. spoke penetrate / average nipple). Added to all spokes.",
    )
    rotation_deg = forms.FloatField(
        label="Rotation (deg)",
        required=False,
        initial=0.0,
        help_text="Rotate the diagram CCW; does not change lengths.",
    )

    def clean(self):
        data = super().clean()
        if not data:
            return data
        if data.get("nipple_correction_mm") is None:
            data["nipple_correction_mm"] = 0.0
        if data.get("flange_hole_diameter_mm") is None:
            data["flange_hole_diameter_mm"] = 0.0
        if data.get("rotation_deg") is None:
            data["rotation_deg"] = 0.0
        sc = data.get("spoke_count")
        cx = data.get("crosses")
        if sc is not None and cx is not None:
            limit = max_crosses(int(sc))
            if cx > limit:
                self.add_error(
                    "crosses",
                    f"For {sc} spokes, crosses must be ≤ {limit} "
                    f"(tangential hole spacing).",
                )
        return data
