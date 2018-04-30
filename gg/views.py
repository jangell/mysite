# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render, redirect
from django.contrib.gis.geoip2 import GeoIP2

from models import Planting
from forms import SubmitForm

# get client ip from a request
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

# gets the lat and lon from an ip address using the geoip2 library
def getLatLon(request):
	try:
		g = GeoIP2()
		ip = get_client_ip(request)
		loc = g.city(ip)
		return {'lat':loc[0],'lon':loc[1]}
	# if it doesn't work just use London
	except Exception as e:
		return {'lat':51.5074, 'lon':-0.1278}

def home(request):
	return render(request, 'gg/home.html')

# Create your views here.
def list(request):
	pp = Planting.objects.all()
	for p in pp:
		p.lat = int(p.lat * 1000) / 1000.;
		p.lon = int(p.lon * 1000) / 1000.;
	context = {'plantings': pp}
	return render(request, 'gg/list.html', context)

def submit(request):
	form_class = SubmitForm
	if request.method == 'POST':
		form = form_class(data=request.POST)
		# validate and process form data
		if form.is_valid():
			# create a new database object
			cd = form.cleaned_data
			pl = Planting(species=cd['species'], description=cd['description'], planting_day=cd['planting_day'], harvest_start=cd['harvest_start'], harvest_end=cd['harvest_end'], lat=cd['latitude'], lon=cd['longitude'])
			pl.save()
			return redirect('gg:home')
		else:
			print 'invalid form entered'
			print form.errors
	context = {'form': form_class,'location':getLatLon(request)}
	return render(request, 'gg/submit.html', context)

def explore(request):
	pp = Planting.objects.all()
	context = {'plantings': pp, 'location':getLatLon(request)}
	return render(request, 'gg/explore.html', context)
