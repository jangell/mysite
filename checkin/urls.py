from django.conf.urls import url

from . import views

urlpatterns = [
	url(r'^submit$', views.submit, name='submit'),	# this will only work for a user  *** already logged in via the admin tools ***
	url(r'^nope$', views.nope, name='nope'),		# this lets us throw a cute little error message for an un-logged-in account navigating to submit
    url(r'^$', views.index, name='index'),
]