# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import *
from .forms import CheckinForm
# form submission class

# Create your views here.
lm = "on a plane to seattle. window seat. hella good views. let's try a much lemmmmmmgthier message and see how that goes. hey hey hella hella hella hella hella hella hella hella hella hella  goes. hey hey hella hella hella hella hella hella hella hella hella hella"
sm = "on a plane to seattle"
def index(request):
	latest = Checkin.objects.latest('timestamp')
	context = {'time':latest.getTime(),'message':latest.message,'location':latest.location}
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
		        image = request.POST.get('image', '')
		        print image
		        # so now this is where we submit all this to the database
		return render(request,'checkin/submit.html',{'form':form_class})
	else:
		return redirect('nope')
















