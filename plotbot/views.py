# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json

from django.shortcuts import render
from django.conf import settings
from django import http
from .models import *

# default page for plotbot, with tools and plotting button
def index(request):
	# TODO: let's make an option to only load a 'slim' catalog of the most-used spectra
	specs = Spec.objects.filter(slim=True)
	# get all unique wavelengths (for filter in db modal)
	wvs = Spec.objects.values('wavelength').order_by('wavelength').distinct()
	context = {'specs':specs, 'wavelengths':wvs}
	return render(request, 'plotbot/index.html', context)

# AJAX function to return a single spectrum (incl. data) based on its id
def getSpec(request):
	get = request.GET
	sid = get.get('spec_id')
	spec = Spec.objects.get(pk=sid)
	spec_dict = {}
	spec_dict['name'] = str(spec)
	spec_dict['data'] = spec.getPoints()
	return http.HttpResponse(json.dumps(spec_dict), content_type='application/json')

# AJAX function to return the entire spectral library as a JSON object
def getNonSlim(request):
	objs = Spec.objects.filter(slim=False)
	specs = []
	for o in objs:
		specs.append({'id':o.spec_id, 'name':o.name, 'source':o.source.name, 'wv':o.wavelength})
	return http.HttpResponse(json.dumps(specs), content_type='application/json')

# manage what parts of the database are and aren't slim
# TODO: restrict access to superusers only
def manageSlim(request):
	#if request.user.is_superuser:
	slim = Spec.objects.filter(slim=True)
	non_slim = Spec.objects.filter(slim=False)
	wvs = Spec.objects.values('wavelength').order_by('wavelength').distinct()
	context = {'slim':slim, 'non_slim':non_slim, 'wvs':wvs}
	return render(request, 'plotbot/manage_slim.html', context)
	#else:

# POST function to mark all spectra in list as slim
def setSlim(request):
	get = request.GET
	to_set = get.keys()[0]
	ids = json.loads(to_set)
	for s in ids:
		Spec.objects.get(pk=int(s)).setSlim(True)
	return http.HttpResponse(True)


# POST function to mark all spectra in list as full (not slim)
def setNotSlim(request):
	get = request.GET
	to_set = get.keys()[0]
	ids = json.loads(to_set)
	for s in ids:
		Spec.objects.get(pk=int(s)).setSlim(False)
	return http.HttpResponse(True)

# spectral browser
def spectra(request):
	context = {'spec_list':Spec.objects.all()}
	return render(request, 'plotbot/spec_browser.html', context)

# single spectrum page
def spectrum(request, spec_id):
	spec = Spec.objects.get(spec_id=spec_id)
	points = spec.getPoints()
	context = {'spectrum':spec, 'spec_data':points}
	return render(request, 'plotbot/single_spectrum.html', context)

# saves the data & layout for a plotly plot, and returns the hash of that plot
def save_plot(request):
	post = request.POST
	pd = PlotData.objects.get_or_create_plotdata(data=post['data'], layout=post['layout'])
	pd.save()
	return http.HttpResponse(pd.hash)

# page with shared plot (and not much else)
def share(request, hash):
	pd = PlotData.objects.get(hash=hash)
	context = {'pd': pd}
	return render(request, 'plotbot/simple_share.html', context)

# everything below this point has been depricated

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin
floats = ['opacity', 'line_width', 'ymax', 'ymin', 'xmax', 'xmin', 'fig_height', 'fig_width']
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