"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView

from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi


schema_view = get_schema_view(
   openapi.Info(
      title="NA Backend APIs",
      default_version='v1',
      description=(
          "API documentation for NA LMS APIs.\n\n"
          "**Authentication.** Get a token from `POST /api/v1/user/token/`, then click *Authorize* and enter "
          "`Bearer <access token>`.\n\n"
          "**Roles.** Student, Teacher, SysAdmin and Academy Admin. The API and the token carry the SysAdmin role as "
          "the value `Admin`; it is displayed as *SysAdmin* in the app.\n\n"
          "**Who can do what (admin area).**\n"
          "- SysAdmin: manage users and roles, view the dashboard summary, enrollments and site settings, and view courses.\n"
          "- Academy Admin: approve, reject, publish and unpublish courses, and set certificate issuance per course.\n\n"
          "**Certificates.** Course completion and certificate eligibility are separate. A course issues certificates only "
          "when `certificate_enabled` is true (default false), and a student gets at most one certificate per course."
      ),
      terms_of_service="https://www.google.com/policies/terms/",
      contact=openapi.Contact(email="na@outlook.com"),
      license=openapi.License(name="BSD License"),
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)


urlpatterns = [
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),


    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)