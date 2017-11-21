# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.template import loader
from django.http import HttpResponse
from django.utils.timezone import datetime #important if using timezones

from .models import User,Album

def index(request):
	albums = Album.objects.get()
	print albums
	#today = Album.objects.get(day__date = datetime.today())
	#history = Album.objects.filter(day__date__lt = datetime.today())
	#context = {'today':today,'history':history}
	context = {'albums':albums}
	return render(request,'albumaday/index.html',context)

def checkname(request):
	name = request.POST.get('name')
	if User.objects.filter(username=name).count() == 1:
		return HttpResponse(1)
	else:
		return HttpResponse(0)