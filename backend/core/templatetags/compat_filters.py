from django import template

register = template.Library()


@register.filter(name='length_is')
def length_is(value, arg):
    """Compatibility filter removed in newer Django versions."""
    try:
        return len(value) == int(arg)
    except (TypeError, ValueError):
        return False
