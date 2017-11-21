from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^make_plot$',views.make_plot,name='make_plot'),
]