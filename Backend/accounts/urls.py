from django.urls import path
from .views import RegisterView, LoginView, UserManagementView, UserManagementDetailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('users/', UserManagementView.as_view(), name='users'),
    path('users/<int:user_id>/', UserManagementDetailView.as_view(), name='user-detail'),
]
