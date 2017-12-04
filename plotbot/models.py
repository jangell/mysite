# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.sessions.models import Session
from django.core.exceptions import ValidationError
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.core.files.base import ContentFile
from datetime import datetime
from io import BytesIO
import csv
import numpy as np

# matplotlib does weird (bad) things
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt

# validators
def validate_specfile_extension(value):
    if value.file and value.file.content_type != 'text/csv':
        raise ValidationError('Unable to use file with type {} - .csv files only'.format(value.file.content_type))

# models

# model for a spectrum
class Spec(models.Model):
	spec_id = models.AutoField(primary_key=True)
	#owner = models.ForeignKey(Session, blank=True,null=True)	# id referring to the session (will be modified in the future to refer to a user, once accounts are implemented)
	name = models.CharField(max_length=1000)
	hash_val = models.CharField(max_length=1000, blank=True,null=True)		# hash value to determine if an identical spectrum has already been uploaded
	timestamp = models.DateTimeField(default=datetime.now)
	# the actual data gets stored in a CSV
	spec_file = models.FileField(upload_to='spec/csv', validators=[validate_specfile_extension])

	# returns a list of points corresponding to the spectrum
	def getPoints():
		# get all points from querying the Point table, ordered by index
		return []

	def __str__(self):
		return self.name


# a single point in a spectrum
#class Point(models.Model):
#	spec = models.ForeignKey(Spec)
#	index = models.IntegerField()	# index by which to order the points of a particular spectrum
#	wavenumber = models.FloatField()
#	intensity = models.FloatField()


# model for a single plot (configuration and resulting image)
class Plot(models.Model):
	
	# meta
	plot_id = models.AutoField(primary_key=True)
	#owner = models.ForeignKey(Session)
	timestamp = models.DateTimeField(default=datetime.now)

	# configuration (plot-level variables)
	# default size is 16x7
	fig_height = models.FloatField(default=7)
	fig_width = models.FloatField(default=16)
	xmin = models.FloatField(blank=True,null=True)
	xmax = models.FloatField(blank=True,null=True)
	ymin = models.FloatField(blank=True,null=True)
	ymax = models.FloatField(blank=True,null=True)
	title = models.CharField(max_length=1000,blank=True,null=True)
	show_title = models.BooleanField(default=False)
	legend_location = models.IntegerField(default=0)
	show_legend = models.BooleanField(default=False)
	xlabel = models.CharField(max_length=1000,blank=True,null=True)
	show_xlabel = models.BooleanField(default=False)
	ylabel = models.CharField(max_length=1000,blank=True,null=True)
	show_ylabel = models.BooleanField(default=False)

	# image url
	image = models.ImageField(upload_to='plots',blank=True)
	# core functions
	def getPlot(self):
		# if there's already a plot image, return its url. if not, plot the thing, save an image, then return that url.
		if not self.image:

			# get each spectrum
			plt.figure(figsize=(self.fig_width,self.fig_height))	# TODO: move figsize to global options
			for sc in SpecConfig.objects.filter(plot__plot_id = self.plot_id):
				sc.draw()

			# do all the settings
			axes = plt.gca()
			if self.show_title:	plt.title(self.title)
			if self.show_xlabel: plt.xlabel(self.xlabel)
			if self.show_ylabel: plt.ylabel(self.ylabel)
			axes.set_xlim(left=self.xmin,right=self.xmax)
			axes.set_ylim(bottom=self.ymin,top=self.ymax)
			if self.show_legend: plt.legend(loc=self.legend_location)

			# save the plot
			print 'saving...'
			f = BytesIO()
			plt.savefig(f)
			content_file = ContentFile(f.getvalue())
			self.image.save('plot_{}.png'.format(self.plot_id), content_file)
			self.save()
			print 'finished saving'
		print 'sending url: {}'.format(self.image.url)
		return self.image.url

	def hiResPlot(self):
		# like plot(), but higher res (this is for downloads)
		return

	# meta-ish functions
	def __str__(self):
		return 'Plot {} ({})'.format(self.plot_id,datetime.strftime(self.timestamp,'%I:%M %p, %m-%d-%y [%Z]'))

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin

# configuration for a single spectrum in a plot config (one Plot will have a number of SpecConfigs, and each SpecConfig will correspond to one of the spectra plotted in that plot)
class SpecConfig(models.Model):
	
	# meta
	spec_config_id = models.AutoField(primary_key=True)
	plot = models.ForeignKey(Plot)
	spec = models.ForeignKey(Spec)

	# configuration (spectrum-level variables: color, opacity, etc)
	legend_name = models.CharField(max_length=1000,blank=True,null=True)
	legend_show = models.BooleanField(default=False)
	color = models.CharField(max_length=100,blank=True,null=True)
	opacity = models.FloatField(default=1.)

	# preprocessing (TODO)

	# core functions
	# returns the data, as a len(2) array of two parallel arrays: [[wavenumbers], [intensities]]
	def getData(self):
		self.spec.spec_file.open(mode='rb')
		data_reader = csv.reader(self.spec.spec_file,delimiter=str(','))
		wavs = []
		counts = []
		for row in data_reader:
			wavs.append(float(row[0]))
			counts.append(float(row[1]))
		# cut off first and last two and then reverse
		wavs = wavs[2:-2][::-1]
		counts = counts[2:-2][::-1]
		self.spec.spec_file.close()
		return [wavs,counts]

	# plot this spectrum, with the configuration given, on a given figure
	def draw(self,fig=plt):
		data = self.getData()
		fig.plot(data[0],data[1],label=str(self))

	# meta-ish functions
	def __str__(self):
		return 'Plot {} | Spec {}'.format(self.plot.plot_id, self.spec_id)









