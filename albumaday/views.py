# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.template import loader
from django.http import HttpResponse

from .models import User

def index(request):
	return render(request,'albumaday/index.html')

def checkname(request):
	name = request.POST.get('name')
	if User.objects.filter(username=name).count() == 1:
		return HttpResponse(1)
	else:
		return HttpResponse(0)