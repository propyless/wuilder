"""Template filters for tension map display."""

from django import template

register = template.Library()


@register.filter
def kgf2(value):
    """Format a numeric tension (kgf) with exactly two decimal places."""
    try:
        return f"{float(value):.2f}"
    except (TypeError, ValueError):
        return value
