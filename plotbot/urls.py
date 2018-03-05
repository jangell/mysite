from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),									# the actual plotbot page
    url(r'^getSpec$', views.getSpec, name='getSpec'),						# ajax function to get the data for a spectrum in the database
    url(r'^getNonSlim$', views.getNonSlim, name='getNonSlim'),				# ajax function to load all spectra in the library into the page 
    url(r'^spectra$', views.spectra, name='spectra'),						# spec browser page
    url(r'^manageSlim$', views.manageSlim, name='manageSlim'),				# manage slim library (the one that loads on startup)
    url(r'^setSlim$', views.setSlim, name='setSlim'),						# ajax function to set a spectrum to be part of the slim library
    url(r'^setNotSlim$', views.setNotSlim, name='setNotSlim'),				# ajax function to set a spectrum to not be part of the slim library
    url(r'^spectrum/(?P<spec_id>.*)/$',views.spectrum, name='spectrum'),	# spectral browser page for a particular spectrum
    url(r'^make_plot$',views.make_plot,name='make_plot'),					# depricated ajax function to create a plot using python and saving an image
    url(r'^upload_spec$',views.upload_spec,name='upload_spec'),				# depricated function to add a spectrum to the library
]