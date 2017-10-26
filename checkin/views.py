# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from .models import *

# Create your views here.
lm = "on a plane to seattle. window seat. hella good views. let's try a much lemmmmmmgthier message and see how that goes. hey hey hella hella hella hella hella hella hella hella hella hella  goes. hey hey hella hella hella hella hella hella hella hella hella hella"
sm = "on a plane to seattle"
def index(request):
	context = {'time':'literally now','message':lm}
	return render(request,'checkin/index.html',context)