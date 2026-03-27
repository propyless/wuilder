from django.contrib import admin

from .models import Hub, Nipple, Rim


@admin.register(Rim)
class RimAdmin(admin.ModelAdmin):
    list_display = ("name", "erd_mm", "inner_width_mm", "well_depth_mm")
    search_fields = ("name",)


@admin.register(Hub)
class HubAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "left_flange_pcd_mm",
        "right_flange_pcd_mm",
        "left_flange_offset_mm",
        "right_flange_offset_mm",
    )
    search_fields = ("name",)


@admin.register(Nipple)
class NippleAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "head_diameter_mm",
        "head_height_mm",
        "body_length_mm",
        "shank_diameter_mm",
    )
    search_fields = ("name",)
