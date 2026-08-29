from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """System Admin only (explicit role or Django superuser)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_admin_role)


class IsTeacherRole(BasePermission):
    """Teacher or Admin."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.is_teacher_role or user.is_admin_role))


class IsSelfOrAdmin(BasePermission):
    """For endpoints keyed by <user_id> in the URL: caller must be that user or an Admin."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        url_user_id = view.kwargs.get('user_id')
        if url_user_id is None:
            return True

        try:
            url_user_id = int(url_user_id)
        except (TypeError, ValueError):
            return False

        return url_user_id == user.id or user.is_admin_role


class IsOwningTeacherOrAdmin(BasePermission):
    """For endpoints keyed by <teacher_id> in the URL: caller must own that Teacher profile or be an Admin."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False

        teacher_id = view.kwargs.get('teacher_id')
        if teacher_id is None:
            return user.is_teacher_role or user.is_admin_role

        from api.models import Teacher

        teacher = Teacher.objects.filter(id=teacher_id).first()
        if not teacher:
            return False

        return teacher.user_id == user.id or user.is_admin_role
