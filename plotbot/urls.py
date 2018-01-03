from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^getSpec$', views.getSpec, name='getSpec'),
    url(r'^spectra$', views.spectra, name='spectra'),
    url(r'^manageSlim$', views.manageSlim, name='manageSlim'),
    url(r'^setSlim$', views.setSlim, name='setSlim'),
    url(r'^setNotSlim$', views.setNotSlim, name='setNotSlim'),
    url(r'^spectrum/(?P<spec_id>.*)/$',views.spectrum, name='spectrum'),
    url(r'^make_plot$',views.make_plot,name='make_plot'),
    url(r'^upload_spec$',views.upload_spec,name='upload_spec'),
]