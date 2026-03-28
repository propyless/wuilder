from django import forms

from .models import Hub, Nipple, Rim
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

    # -- Spoke-tip detail (optional): rim sketch + nipple + spoke thread -----
    SIDE_CHOICES = (
        ("right", "Right flange"),
        ("left", "Left flange"),
    )
    section_side = forms.ChoiceField(
        choices=SIDE_CHOICES,
        initial="right",
        required=False,
        label="Show spoke to",
        help_text="Which flange to compute spoke tip position for.",
    )
    rim_inner_width_mm = forms.FloatField(
        label="Rim inner width (mm)",
        required=False,
        min_value=5,
        max_value=80,
        help_text="Schematic cavity width at nipple level.",
    )
    rim_well_depth_mm = forms.FloatField(
        label="Rim depth (mm)",
        required=False,
        min_value=2,
        max_value=60,
        help_text="Outer rim edge to nipple seat (total rim height).",
    )
    rim_inner_wall_depth_mm = forms.FloatField(
        label="Inner wall depth (mm)",
        required=False,
        min_value=1,
        max_value=58,
        help_text="Outer rim edge to cavity ceiling (outer wall thickness).",
    )
    nipple = forms.ModelChoiceField(
        queryset=Nipple.objects.none(),
        required=False,
        label="Nipple",
        help_text="Choose a saved nipple (with known thread length).",
    )
    spoke_thread_length_mm = forms.FloatField(
        label="Spoke thread length (mm)",
        required=False,
        initial=16.0,
        min_value=0,
        max_value=50,
        help_text="Threaded section from spoke tip inward (e.g. 16 mm for many 2.0/1.8).",
    )
    ordered_spoke_length_mm = forms.FloatField(
        label="Ordered spoke length (mm)",
        required=False,
        min_value=100,
        max_value=400,
        help_text="Spoke you're buying (leave blank = use calculated length).",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["nipple"].queryset = Nipple.objects.all()

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
        if data.get("spoke_thread_length_mm") is None:
            data["spoke_thread_length_mm"] = 0.0
        iwd = data.get("rim_inner_wall_depth_mm")
        wd = data.get("rim_well_depth_mm")
        if iwd is not None and wd is not None and iwd >= wd:
            self.add_error(
                "rim_inner_wall_depth_mm",
                "Inner wall depth must be less than the total rim depth.",
            )
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


class SectionDiagramForm(forms.Form):
    """Pick parts for the rim cross-section schematic."""

    SIDE_CHOICES = (
        ("left", "Left flange"),
        ("right", "Right flange"),
    )
    rim = forms.ModelChoiceField(queryset=Rim.objects.none(), label="Rim")
    hub = forms.ModelChoiceField(queryset=Hub.objects.none(), label="Hub")
    nipple = forms.ModelChoiceField(queryset=Nipple.objects.none(), label="Nipple")
    side = forms.ChoiceField(
        choices=SIDE_CHOICES,
        initial="right",
        label="Show spoke to",
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
    )
    flange_hole_diameter_mm = forms.FloatField(
        label="Hub spoke hole diameter (mm)",
        required=False,
        initial=2.6,
        min_value=0,
        max_value=10,
        help_text="Same as spoke calculator: subtracts half from length. Use 0 for raw triangle only.",
    )
    nipple_correction_mm = forms.FloatField(
        label="Nipple correction (mm)",
        required=False,
        initial=0.0,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["rim"].queryset = Rim.objects.all()
        self.fields["hub"].queryset = Hub.objects.all()
        self.fields["nipple"].queryset = Nipple.objects.all()

    def clean(self):
        data = super().clean()
        if not data:
            return data
        if data.get("nipple_correction_mm") is None:
            data["nipple_correction_mm"] = 0.0
        if data.get("flange_hole_diameter_mm") is None:
            data["flange_hole_diameter_mm"] = 0.0
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
