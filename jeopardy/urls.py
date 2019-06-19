from django.urls import path

from app import views

urlpatterns = [
    path('', views.get_player_panel),
    path('admin/', views.get_admin_panel),
    path('admin-view/', views.get_admin_view_panel),

    path('api/player/auth', views.auth_player),
    path('api/player/button-click', views.handle_button_click),

    path('api/admin/create-game', views.create_game),
    path('api/admin/auth', views.auth_admin),
    path('api/admin/next-state', views.next_state),
    path('api/admin/skip-question', views.skip_question),

    path('api/game', views.get_game)
]
