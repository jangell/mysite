# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.contrib import admin
from models import *

# Register your models here.
admin.site.register(Spec)
admin.site.register(Plot)
admin.site.register(SpecConfig)
admin.site.register(Source)
admin.site.register(PlotData)