from django.conf.urls import url
from django.conf import settings
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib.staticfiles.urls import static

from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^checkname/$',views.checkname,name='checkname')
]

# You might need to import static function like this:
#from django.contrib.staticfiles.urls import static

urlpatterns += staticfiles_urlpatterns()
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)