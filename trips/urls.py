from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^where/(?P<place_name>.*)/$',views.place,name='place'),
    url(r'^showme/(?P<photo_id>.*)/$',views.photo,name='photo'),
]