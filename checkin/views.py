# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
import datetime
from .models import *
from .forms import CheckinForm

# get a nicely formatted version of the time
def getTime():
	return datetime.datetime.strftime(datetime.datetime.now(),'%k:%M %p')
def getDate():
	return datetime.datetime.strftime(datetime.datetime.now(),'%h %dth')

# Create your views here.
def index(request):
	latest = Checkin.objects.latest('timestamp')
	sD = latest.getDate() == datetime.datetime.now().date()
	context = {'curTime':getTime(),'curDate':getDate(),'sameDate':sD,'time':latest.getTime(),'message':latest.message,'location':latest.location,'timeAgo':latest.timeAgo()}
	return render(request,'checkin/index.html',context)

def nope(request):
	return render(request,'checkin/nope.html')

def submit(request):
	if request.user.is_superuser:
		form_class = CheckinForm
		if request.method == 'POST':
		    form = form_class(data=request.POST)
		    if form.is_valid():
		        location = request.POST.get('location', '')
		        message = request.POST.get('message', '')
		        new_checkin = Checkin(timestamp = datetime.datetime.now(),location=location,message=message)
		        new_checkin.save()

		        # so now this is where we submit all this to the database
		return render(request,'checkin/submit.html',{'form':form_class})
	else:
		return redirect('nope')
















