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
	context = {'spec_list':Spec.objects.all()}
	return render(request,'plotbot/index.html',context)

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin
floats = ['opacity','line_width','ymax','ymin','xmax','xmin']
ints = ['legend_location']
defaults = {'opacity':1.,'line_width':1.}
def make_plot(request):
	get = request.GET
	args = {}
	for g in get:
		args[g] = get.get(g)

	for f in floats:
		if args[f]:
			try:
				args[f] = float(args[f])
			except:
				continue
	
	for i in ints:
		if args[i]:
			try:
				args[i] = int(args[i])
			except:
				continue

	# working set = database (ie, no working set)
	working = Spec.objects.all()

	# create a Plot object, then one SpecConfig object per spectrum, then plot the Plot object
	cur_plot = Plot(title=args['title'],show_title=('show_title' in args),xlabel=args['xlabel'],show_xlabel=('show_xlabel' in args),ylabel=args['ylabel'],show_ylabel=('show_ylabel' in args),xmin=args['xmin'] if args['xmin'] else None, xmax = args['xmax'] if args['xmax'] else None, ymin=args['ymin'] if args['ymin'] else None, ymax=args['ymax'] if args['ymax'] else None,show_legend=('show_legend' in args),legend_location=args['legend_location'])
	cur_plot.save()
	for cur_spec in working:
		s_config = SpecConfig(plot = cur_plot, spec = cur_spec)
		s_config.save()

	img_url = cur_plot.getPlot()

	# then, return the url to that Plot object's image

	# we're gonna start with an example Plot (just the first image in the db), that's already been "plotted"
	#test_plot = Plot.objects.get(pk=1)
	#test_url = test_plot.image.url
	
	return http.JsonResponse({'img_url':img_url})

def upload_spec(request):
	file_keys = request.FILES.keys()
	print "lol I don't work yet"

	return http.HttpResponse('hello!');