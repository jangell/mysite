# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from django.conf import settings
from django import http
from .models import *

# Create your views here.
def index(request):
	# if valid query, return plot
	# if not, return error to console
	# if nothing, return blank
	return render(request,'plotbot/index.html')

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin
floats = ['opacity','line_width','ymax','ymin','xmax','xmin']
defaults = {'opacity':1.,'line_width':1.,'ymax':1.,'ymin':0.,'xmax':1.,'xmin':0.}
def make_plot(request):
	get = request.GET
	args = {}
	for g in get:
		args[g] = get.get(g)
	# parse non-string args
	for a in floats:
		args[a] = args[a] if args[a] else defaults[a]

	# I need to rework this to accept an arbitrary number of spectra

	# create a Plot object and one or more SpecConfig objects, then plot the Plot object

	# then, return the url to that Plot object's image

	# we're gonna start with an example Plot (just the first image in the db), that's already been "plotted"
	test_plot = Plot.objects.get()
	test_url = test_plot.image.url
	
	return http.JsonResponse({'img_url':test_url})