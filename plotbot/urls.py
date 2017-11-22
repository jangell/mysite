from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^make_plot$',views.make_plot,name='make_plot'),
    url(r'^upload_spec$',views.upload_spec,name='upload_spec'),
]