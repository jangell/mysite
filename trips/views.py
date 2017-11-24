# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from .models import *

# Create your views here.
def index(request):
	context = {'places':Place.objects.all()}
	return render(request,'trips/index.html',context)

def place(request, place_name):
	# get place object (if in database) or 404
	place = Place.objects.get(name=place_name)
	pics = Picture.objects.filter(trip__name=place_name)
	context = {'place':place,'pics':pics,'places':Place.objects.all()}
	return render(request,'trips/place.html',context)

def photo(request, photo_id):
	# get photo object (if in database) or 404
	pic = Picture.objects.get(id=photo_id)
	context = {'pic':pic,'places':Place.objects.all()}
	return render(request,'trips/photo.html',context)