from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^hook_test$', views.hook_test, name='hook_test')
]
