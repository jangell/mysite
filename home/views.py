# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.shortcuts import render
from .models import *

# Create your views here.
def index(request):
	context = {'portfolio':PortfolioItem.objects.all(),'skills':Skill.objects.all(),'interests':Interest.objects.all()}
	return render(request,'home/index.html',context)