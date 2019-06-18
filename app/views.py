from django.shortcuts import render


def get_player_panel(request):
    return render(request, "player_panel.html", {})


def get_admin_panel(request):
    return render(request, "admin_panel.html", {})
