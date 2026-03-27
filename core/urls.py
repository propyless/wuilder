from django.urls import path

from . import views

app_name = 'core'

urlpatterns = [
    path('', views.home, name='home'),
    path('spokes/', views.spoke_calculator, name='spoke_calculator'),
    path('section/', views.rim_section, name='rim_section'),
]
