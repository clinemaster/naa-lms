from django.contrib import admin
from userauths.models import User, UserProfile

# Register your models here.
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'username', 'full_name', 'is_staff', 'is_active')
    search_fields = ('email', 'username', 'full_name')
    list_filter = ('is_staff', 'is_active')
    ordering = ('email',)

class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name', 'country', 'date')
    search_fields = ('user__email', 'full_name', 'country')
    list_filter = ('country',)
    ordering = ('user__email',)

admin.site.register(User, UserAdmin)
admin.site.register(UserProfile, UserProfileAdmin)