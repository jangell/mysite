# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.contrib import admin

# Register your models here.
from .models import *
#admin.site.register(<model>)
admin.site.register(Place)
admin.site.register(Picture)
admin.site.register(Section)
