from django.conf.urls import url

from . import views

urlpatterns = [
    #url(r'^$', views.list, name='list'),				# default to list of planted stuff
    url(r'^$', views.home, name='home'),				# home page with little explanation and stuff
    url(r'^list$', views.list, name='list'),			# explicitly going to list also works
    url(r'^submit$', views.submit, name='submit'),		# add a new planting
    url(r'^explore$', views.explore, name='explore'),	# explore map / filters
]