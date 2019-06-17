from django.shortcuts import render


def get_admin_panel(request):
    return render(request, "admin_panel.html", {})
