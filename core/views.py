import json
import math
from types import SimpleNamespace

from django.shortcuts import render

from .forms import SectionDiagramForm, SpokeCalculatorForm, TensionMapForm
from .hub_geometry import (
    build_hub_side_view_svg,
    build_illustrative_ratio_summary,
    geometry_ready_for_ratio,
    side_mean_spoke_lengths_mm,
)
from .models import Hub, Nipple, Rim
from .nipple_fit import compute_nipple_fit
from .section_layout import build_section_detail, build_section_layout
from .spoke_length import build_spoke_results
from .tension_viz import (
    build_tension_radar_paths,
    build_tension_ratio_summary,
    build_tension_side_stats,
    build_tension_spoke_rows,
    side_average_kgf,
    uses_side_ratio,
)
from .tm1 import chart_source_note

_LENGTH_COLORS = (
    "#1b6b5c",
    "#b85c14",
    "#4a5a9c",
    "#7a3e6a",
    "#6b7c3a",
    "#c44f4f",
    "#2c6a8f",
    "#8f4725",
)


def home(request):
    return render(request, 'core/home.html')


def _tension_side_rows(form, side: str, tension_rows, n_half: int):
    """Template rows: spoke #, bound field, optional TensionSpokeRow after valid submit."""
    out = []
    for j in range(n_half):
        fn = f"{side}_{j}"
        bf = form[fn]
        spoke = 2 * j + (1 if side == "left" else 2)
        tr = None
        if tension_rows is not None:
            idx = 2 * j if side == "left" else 2 * j + 1
            tr = tension_rows[idx]
        out.append({"spoke": spoke, "bf": bf, "row": tr})
    return out


def tension_map(request):
    form = TensionMapForm(request.POST or None)
    n_half = form._resolve_spoke_count() // 2
    tension_rows = None
    wheel_svg = None
    radar_paths = None
    left_avg_kgf = None
    right_avg_kgf = None
    left_side_stats = None
    right_side_stats = None
    variance_pct = None
    ratio_summary = None
    balance_is_ratio = False
    hub_side_svg = None
    illustrative_ratio = None
    if request.method == "POST" and form.is_valid():
        d = form.cleaned_data
        variance_pct = d["variance_percent"]
        n = d["spoke_count"]
        chart_id = d["tm1_chart"]
        left_avg_kgf, right_avg_kgf = side_average_kgf(d["tensions_kgf"], n)
        left_t = [d["tensions_kgf"][i] for i in range(0, n, 2)]
        right_t = [d["tensions_kgf"][i] for i in range(1, n, 2)]
        left_side_stats = build_tension_side_stats(
            left_t,
            variance_percent=variance_pct,
            chart_id=chart_id,
        )
        right_side_stats = build_tension_side_stats(
            right_t,
            variance_percent=variance_pct,
            chart_id=chart_id,
        )
        other_pct = d["tension_ratio_other_pct"]
        balance_is_ratio = uses_side_ratio(other_pct)
        row_kw: dict = {
            "spoke_count": n,
            "readings": d["readings_parsed"],
            "tensions_kgf": d["tensions_kgf"],
            "variance_percent": variance_pct,
        }
        if balance_is_ratio:
            row_kw["balance_mode"] = "ratio"
            row_kw["ratio_reference_side"] = d["tension_ratio_reference"]
            row_kw["ratio_other_pct"] = other_pct
            ratio_summary = build_tension_ratio_summary(
                left_avg_kgf,
                right_avg_kgf,
                reference_side=d["tension_ratio_reference"],
                other_pct=other_pct,
            )
        else:
            row_kw["balance_mode"] = "per_side"
        tension_rows = build_tension_spoke_rows(**row_kw)
        wheel_svg = {"cx": 120.0, "cy": 120.0, "rim_r": 95.0, "hub_r": 28.0}
        lp, rp = build_tension_radar_paths(
            tension_rows,
            cx=wheel_svg["cx"],
            cy=wheel_svg["cy"],
            rim_r=wheel_svg["rim_r"],
            hub_r=wheel_svg["hub_r"],
        )
        radar_paths = {"left": lp, "right": rp}

        lo = d.get("hub_left_offset_mm")
        ro = d.get("hub_right_offset_mm")
        if lo is not None and ro is not None:
            hub_side_svg = build_hub_side_view_svg(lo, ro)

        if geometry_ready_for_ratio(
            erd_mm=d.get("hub_erd_mm"),
            left_pcd_mm=d.get("hub_left_flange_pcd_mm"),
            right_pcd_mm=d.get("hub_right_flange_pcd_mm"),
            crosses=d.get("hub_crosses"),
            left_offset_mm=lo,
            right_offset_mm=ro,
        ):
            try:
                ll, lr = side_mean_spoke_lengths_mm(
                    erd_mm=float(d["hub_erd_mm"]),
                    spoke_count=n,
                    crosses=int(d["hub_crosses"]),
                    left_flange_radius_mm=float(d["hub_left_flange_pcd_mm"]) / 2.0,
                    right_flange_radius_mm=float(d["hub_right_flange_pcd_mm"]) / 2.0,
                    left_flange_offset_mm=float(lo),
                    right_flange_offset_mm=float(ro),
                    flange_hole_diameter_mm=float(d["hub_flange_hole_diameter_mm"]),
                    nipple_correction_mm=float(d["hub_nipple_correction_mm"]),
                    rotation_rad=0.0,
                )
                ref_side = d["tension_ratio_reference"]
                illustrative_ratio = build_illustrative_ratio_summary(
                    reference_side=ref_side,
                    left_avg_kgf=left_avg_kgf,
                    right_avg_kgf=right_avg_kgf,
                    w_left_mm=float(lo),
                    w_right_mm=float(ro),
                    avg_len_left_mm=ll,
                    avg_len_right_mm=lr,
                )
            except (TypeError, ValueError, ZeroDivisionError):
                illustrative_ratio = None

    left_side_rows = _tension_side_rows(form, "left", tension_rows, n_half)
    right_side_rows = _tension_side_rows(form, "right", tension_rows, n_half)
    return render(
        request,
        "core/tension_map.html",
        {
            "form": form,
            "n_half": n_half,
            "left_side_rows": left_side_rows,
            "right_side_rows": right_side_rows,
            "tension_rows": tension_rows,
            "wheel_svg": wheel_svg,
            "radar_paths": radar_paths,
            "left_avg_kgf": left_avg_kgf,
            "right_avg_kgf": right_avg_kgf,
            "left_side_stats": left_side_stats,
            "right_side_stats": right_side_stats,
            "variance_pct": variance_pct,
            "balance_is_ratio": balance_is_ratio,
            "ratio_summary": ratio_summary,
            "hub_side_svg": hub_side_svg,
            "illustrative_ratio": illustrative_ratio,
            "hydrate_build_params": request.method == "GET",
            "tm1_source_note": chart_source_note(),
        },
    )


def spoke_calculator(request):
    form = SpokeCalculatorForm(request.POST or None)
    context = {'form': form}

    if request.method == 'POST' and form.is_valid():
        d = form.cleaned_data
        rotation_rad = math.radians(d['rotation_deg'])
        spokes = build_spoke_results(
            erd_mm=d['erd_mm'],
            spoke_count=int(d['spoke_count']),
            crosses=d['crosses'],
            left_flange_radius_mm=d['left_flange_diameter_mm'] / 2,
            right_flange_radius_mm=d['right_flange_diameter_mm'] / 2,
            left_flange_offset_mm=d['left_flange_offset_mm'],
            right_flange_offset_mm=d['right_flange_offset_mm'],
            flange_hole_diameter_mm=d['flange_hole_diameter_mm'],
            nipple_correction_mm=d['nipple_correction_mm'],
            rotation_rad=rotation_rad,
        )

        def length_key(mm: float) -> float:
            return round(mm, 1)

        unique_lengths = sorted({length_key(s.length_mm) for s in spokes})
        color_by_length = {
            ln: _LENGTH_COLORS[i % len(_LENGTH_COLORS)]
            for i, ln in enumerate(unique_lengths)
        }

        left_spokes = [s for s in spokes if s.side == "left"]
        right_spokes = [s for s in spokes if s.side == "right"]

        def _side_summary_row(side_label: str, side_list: list) -> dict:
            lk = length_key(side_list[0].length_mm)
            return {
                "side_label": side_label,
                "length_mm": lk,
                "count": len(side_list),
                "color": color_by_length[lk],
            }

        summary = [
            _side_summary_row("Left", left_spokes),
            _side_summary_row("Right", right_spokes),
        ]

        cx = cy = 120.0
        rim_r = 95.0
        avg_pcd = (d['left_flange_diameter_mm'] + d['right_flange_diameter_mm']) / 2
        hub_r = rim_r * (avg_pcd / d['erd_mm'])

        display_twist = -math.pi / 2

        spoke_rows = []
        for s in spokes:
            lk = length_key(s.length_mm)
            phi_r = s.rim_angle_rad + display_twist
            phi_h = s.hub_angle_rad + display_twist
            spoke_rows.append(
                {
                    'index': s.index + 1,
                    'side': s.side,
                    'length_mm': s.length_mm,
                    'length_key': lk,
                    'color': color_by_length[lk],
                    'x1': cx + rim_r * math.cos(phi_r),
                    'y1': cy + rim_r * math.sin(phi_r),
                    'x2': cx + hub_r * math.cos(phi_h),
                    'y2': cy + hub_r * math.sin(phi_h),
                }
            )

        context['spoke_rows'] = spoke_rows
        context['summary'] = summary
        context['wheel_svg'] = {
            'cx': cx,
            'cy': cy,
            'rim_r': rim_r,
            'hub_r': hub_r,
        }

        # -- Optional axial section + protrusion ----------------------------
        nip = d.get('nipple')
        has_rim_sketch = d.get('rim_inner_width_mm') and d.get('rim_well_depth_mm')
        if nip and has_rim_sketch:
            rim_ns = SimpleNamespace(
                erd_mm=d['erd_mm'],
                inner_width_mm=d['rim_inner_width_mm'],
                well_depth_mm=d['rim_well_depth_mm'],
            )
            hub_ns = SimpleNamespace(
                left_flange_pcd_mm=d['left_flange_diameter_mm'],
                right_flange_pcd_mm=d['right_flange_diameter_mm'],
                left_flange_offset_mm=d['left_flange_offset_mm'],
                right_flange_offset_mm=d['right_flange_offset_mm'],
            )
            side = d.get('section_side') or 'right'
            diagram = build_section_layout(
                rim_ns,
                hub_ns,
                nip,
                side=side,
                spoke_count=int(d['spoke_count']),
                crosses=d['crosses'],
                flange_hole_diameter_mm=d['flange_hole_diameter_mm'],
                nipple_correction_mm=d['nipple_correction_mm'],
            )
            spoke_thread = d.get('spoke_thread_length_mm') or 0.0
            if spoke_thread > 0:
                ordered = d.get('ordered_spoke_length_mm') or diagram.spoke_length_mm
                fit = compute_nipple_fit(
                    calculated_spoke_length_mm=diagram.spoke_length_mm,
                    ordered_spoke_length_mm=ordered,
                    nipple_body_length_mm=nip.body_length_mm,
                    internal_thread_length_mm=nip.internal_thread_length_mm,
                    spoke_thread_length_mm=spoke_thread,
                    well_depth_mm=d['rim_well_depth_mm'],
                )
                context['nipple_fit'] = fit

                detail = build_section_detail(
                    nip,
                    well_depth_mm=d['rim_well_depth_mm'],
                    inner_width_mm=d['rim_inner_width_mm'],
                    tip_from_seat_mm=fit.tip_from_seat_mm,
                    spoke_thread_length_mm=spoke_thread,
                    inner_wall_depth_mm=d.get('rim_inner_wall_depth_mm'),
                )
                context['detail'] = detail

        context["build_params_json"] = json.dumps(
            {
                "schema": 1,
                "erd_mm": d["erd_mm"],
                "spoke_count": int(d["spoke_count"]),
                "crosses": d["crosses"],
                "left_flange_diameter_mm": d["left_flange_diameter_mm"],
                "right_flange_diameter_mm": d["right_flange_diameter_mm"],
                "left_flange_offset_mm": d["left_flange_offset_mm"],
                "right_flange_offset_mm": d["right_flange_offset_mm"],
                "flange_hole_diameter_mm": d["flange_hole_diameter_mm"],
                "nipple_correction_mm": d["nipple_correction_mm"],
            }
        )

    return render(request, 'core/spoke_calculator.html', context)


def rim_section(request):
    has_parts = (
        Rim.objects.exists() and Hub.objects.exists() and Nipple.objects.exists()
    )
    diagram = None
    form = None

    if has_parts:
        if request.GET:
            form = SectionDiagramForm(request.GET)
            if form.is_valid():
                d = form.cleaned_data
                diagram = build_section_layout(
                    d['rim'],
                    d['hub'],
                    d['nipple'],
                    side=d['side'],
                    spoke_count=int(d['spoke_count']),
                    crosses=d['crosses'],
                    flange_hole_diameter_mm=d['flange_hole_diameter_mm'],
                    nipple_correction_mm=d['nipple_correction_mm'],
                )
        else:
            rim = Rim.objects.order_by('pk').first()
            hub = Hub.objects.order_by('pk').first()
            nip = Nipple.objects.order_by('pk').first()
            diagram = build_section_layout(
                rim,
                hub,
                nip,
                side='right',
                spoke_count=32,
                crosses=3,
                flange_hole_diameter_mm=2.6,
                nipple_correction_mm=0.0,
            )
            form = SectionDiagramForm(
                initial={
                    'rim': rim.pk,
                    'hub': hub.pk,
                    'nipple': nip.pk,
                    'side': 'right',
                    'spoke_count': 32,
                    'crosses': 3,
                    'flange_hole_diameter_mm': 2.6,
                    'nipple_correction_mm': 0.0,
                }
            )

    return render(
        request,
        'core/rim_section.html',
        {
            'has_parts': has_parts,
            'form': form,
            'diagram': diagram,
        },
    )
