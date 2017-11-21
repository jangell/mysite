# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models
from django.contrib.sessions.models import Session

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin

# model for a spectrum
class Spec(models.Model):
	spec_id = models.AutoField(primary_key=True)
	owner = models.ForeignKey(Session)	# id referring to the session (will be modified in the future to refer to a user, once accounts are implemented)
	# how are we gonna store the data for these?


# model for a single plot (configuration and resulting image)
class Plot(models.Model):
	
	# meta
	plot_id = models.AutoField(primary_key=True)
	owner = models.ForeignKey(Session)
	timestamp = models.DateTimeField()

	# configuration (plot-level variables)
	xmin = models.FloatField()
	xmax = models.FloatField()
	ymin = models.FloatField()
	ymax = models.FloatField()
	title = models.CharField(max_length=1000)
	show_title = models.BooleanField()
	legend_location = models.IntegerField()
	show_legend = models.BooleanField()
	xlabel = models.CharField(max_length=1000)
	ylabel = models.CharField(max_length=1000)

	# image url
	image = models.ImageField(upload_to='plots')

	# core functions
	def plot(self):
		# if there's already a plot image, return its url. if not, plot the thing, save an image, then return that url.
		return

	def hires_plot(self):
		# like plot(), but higher res (this is for downloads)
		return

	# meta-ish functions
	def __str__(self):
		out = 'Plot {}'.format(self.plot_id)
		if self.title:
			out += ' {}'.format(self.title)
		out += ' {}'.format(self.timestamp)
		return out

# args: opacity, line_width, ymax, title, color, legend_location, legend_name, xlabel, xmax, ylabel, xmin, ymin

# configuration for a single spectrum in a plot config (one Plot will have a number of SpecConfigs, and each SpecConfig will correspond to one of the spectra plotted in that plot)
class SpecConfig(models.Model):
	
	# meta
	spec_config_id = models.AutoField(primary_key=True)
	plot = models.ForeignKey(Plot)
	spec = models.ForeignKey(Spec)

	# configuration (spectrum-level variables: color, opacity, etc)
	legend_name = models.CharField(max_length=1000)
	legend_show = models.BooleanField()
	color = models.CharField(max_length=100)
	opacity = models.FloatField()

	# preprocessing (TODO)


	# meta-ish functions
	def __str__(self):
		return 'Config for spec file {} in plot {} for user session {}'.format(spec.spec_id, plot.plot_id, plot.owner)









