from django import forms

from .models import Nipple
from .spoke_length import max_crosses
from .tm1 import TM1LookupError, chart_ids_and_labels, tension_kgf


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


class TensionMapForm(forms.Form):
    """TM-1 readings → tension heatmap; side ratio applies whenever other-side % ≠ 100."""

    spoke_count = forms.TypedChoiceField(
        label="Spokes",
        coerce=int,
        choices=_spoke_count_choices(),
        initial=32,
    )
    tm1_chart = forms.ChoiceField(
        label="TM-1 chart (spoke type)",
    )
    variance_percent = forms.FloatField(
        label="Variance limit (%)",
        min_value=1.0,
        max_value=50.0,
        initial=20.0,
    )
    tension_ratio_reference = forms.ChoiceField(
        label="Reference side (100%)",
        choices=(("left", "Left"), ("right", "Right")),
        initial="left",
    )
    tension_ratio_other_pct = forms.FloatField(
        label="Other side as % of reference avg",
        min_value=30.0,
        max_value=150.0,
        initial=100.0,
        help_text="100% = Park style (each side vs its own average). Any other value applies a side ratio using the reference flange.",
    )

    hub_erd_mm = forms.FloatField(
        label="ERD (mm)",
        required=False,
        min_value=200.0,
        max_value=700.0,
        help_text="Optional — with PCDs and crosses, enables illustrative side ratio from hub geometry.",
    )
    hub_crosses = forms.IntegerField(
        label="Crosses",
        required=False,
        min_value=0,
        max_value=20,
        help_text="Per side; same as Spoke length page.",
    )
    hub_left_flange_pcd_mm = forms.FloatField(
        label="Left flange PCD (mm)",
        required=False,
        min_value=20.0,
        max_value=200.0,
    )
    hub_right_flange_pcd_mm = forms.FloatField(
        label="Right flange PCD (mm)",
        required=False,
        min_value=20.0,
        max_value=200.0,
    )
    hub_left_offset_mm = forms.FloatField(
        label="Left flange offset (mm)",
        required=False,
        min_value=0.0,
        max_value=120.0,
        help_text="From wheel center plane to left flange — same as Spoke length (*L*).",
    )
    hub_right_offset_mm = forms.FloatField(
        label="Right flange offset (mm)",
        required=False,
        min_value=0.0,
        max_value=120.0,
        help_text="From center plane to right flange (*R*).",
    )
    hub_flange_hole_diameter_mm = forms.FloatField(
        label="Hub spoke hole Ø (mm)",
        required=False,
        initial=0.0,
        min_value=0.0,
        max_value=10.0,
        help_text="Optional; matches spoke calculator correction (0 = none).",
    )
    hub_nipple_correction_mm = forms.FloatField(
        label="Nipple correction (mm)",
        required=False,
        initial=0.0,
        help_text="Optional; added like the spoke calculator.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.fields["tension_ratio_other_pct"].help_text:
            self.fields["tension_ratio_other_pct"].widget.attrs["aria-describedby"] = (
                "id_tension_ratio_other_pct_hint"
            )
        self.fields["tm1_chart"].choices = chart_ids_and_labels()
        n = self._resolve_spoke_count()
        n_half = n // 2
        hub_wattrs = {"class": "hub-geom-input", "step": "any"}
        for name in (
            "hub_erd_mm",
            "hub_left_flange_pcd_mm",
            "hub_right_flange_pcd_mm",
            "hub_left_offset_mm",
            "hub_right_offset_mm",
            "hub_flange_hole_diameter_mm",
            "hub_nipple_correction_mm",
        ):
            self.fields[name].widget.attrs.update(hub_wattrs)
        self.fields["hub_crosses"].widget.attrs.update({"class": "hub-geom-input"})
        wattrs = {"class": "tm1-input", "step": "any", "min": "0"}
        for i in range(n_half):
            self.fields[f"left_{i}"] = forms.FloatField(
                label="",
                required=True,
                min_value=0.0,
                max_value=60.0,
                widget=forms.NumberInput(attrs=wattrs),
            )
            self.fields[f"right_{i}"] = forms.FloatField(
                label="",
                required=True,
                min_value=0.0,
                max_value=60.0,
                widget=forms.NumberInput(attrs=wattrs),
            )

    def _resolve_spoke_count(self) -> int:
        valid = {c[0] for c in _spoke_count_choices()}
        if self.is_bound:
            raw = self.data.get("spoke_count")
            try:
                v = int(raw)
                if v in valid:
                    return v
            except (TypeError, ValueError):
                pass
        init = getattr(self, "initial", None) or {}
        if "spoke_count" in init and int(init["spoke_count"]) in valid:
            return int(init["spoke_count"])
        return int(self.fields["spoke_count"].initial)

    def clean(self):
        data = super().clean()
        if not data:
            return data
        n = data.get("spoke_count")
        chart_id = data.get("tm1_chart")
        if n is None or not chart_id:
            return data

        n_half = n // 2
        readings: list[float] = []
        for i in range(n_half):
            for fname in (f"left_{i}", f"right_{i}"):
                v = data.get(fname)
                if v is None:
                    self.add_error(fname, "Enter a TM-1 reading.")
                    return data
                readings.append(float(v))

        tensions: list[float] = []
        for i, v in enumerate(readings):
            try:
                tensions.append(tension_kgf(chart_id, v))
            except TM1LookupError as exc:
                fname = f"left_{i // 2}" if i % 2 == 0 else f"right_{i // 2}"
                self.add_error(fname, str(exc))
                return data

        data["readings_parsed"] = readings
        data["tensions_kgf"] = tensions

        if data.get("hub_flange_hole_diameter_mm") is None:
            data["hub_flange_hole_diameter_mm"] = 0.0
        if data.get("hub_nipple_correction_mm") is None:
            data["hub_nipple_correction_mm"] = 0.0

        hc = data.get("hub_crosses")
        n_spokes = data.get("spoke_count")
        if hc is not None and n_spokes is not None:
            limit = max_crosses(int(n_spokes))
            if hc > limit:
                self.add_error(
                    "hub_crosses",
                    f"For {n_spokes} spokes, crosses must be ≤ {limit} "
                    f"(tangential hole spacing).",
                )
        return data
