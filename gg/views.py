# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from models import Planting

from forms import SubmitForm

def home(request):
	return render(request, 'gg/home.html')

# Create your views here.
def list(request):
	pp = Planting.objects.all()
	context = {'plantings': pp}
	return render(request, 'gg/list.html', context)

def submit(request):
	form_class = SubmitForm
	print form_class
	if request.method == 'POST':
		form = form_class(data=request.POST)
		# validate and process form data
	context = {'form': form_class}
	return render(request, 'gg/submit.html', context)

def explore(request):
	pp = Planting.objects.all()
	context = {'plantings': pp}
	return render(request, 'gg/explore.html', context)
