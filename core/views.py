import math

from django.shortcuts import render

from .forms import SpokeCalculatorForm
from .spoke_length import build_spoke_results

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
            rim_to_left_flange_mm=d['rim_to_left_flange_mm'],
            rim_to_right_flange_mm=d['rim_to_right_flange_mm'],
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

        summary = [
            {
                'length_mm': ln,
                'count': sum(1 for s in spokes if length_key(s.length_mm) == ln),
                'color': color_by_length[ln],
            }
            for ln in unique_lengths
        ]

        context['spoke_rows'] = spoke_rows
        context['summary'] = summary
        context['wheel_svg'] = {
            'cx': cx,
            'cy': cy,
            'rim_r': rim_r,
            'hub_r': hub_r,
        }

    return render(request, 'core/spoke_calculator.html', context)
