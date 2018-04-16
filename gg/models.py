# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

'''
class Species(models.Model):
	name = models.CharField(max_length=100)								# name of the species
	description = models.TextField(max_length=1000, blank=True, null=True)	# optional description of the species
	days_to_harvest = models.IntegerField(blank=True, null=True)				# optional length of time to harvest in days, to autofill
	harvest_length = models.IntegerField(blank=True, null=True)					# optional length of harvest period in days, to autofill

	def __str__(self):
		return self.name
'''

# MVP doesn't include variety
'''
class Variety(models.Model):
	species = models.ForeignKey(Species, on_delete=models.CASCADE)
	name = models.CharField(max_length=100)
	description = models.TextField(max_length=1000, blank=True, null=True)

	def __str__(self):
		return str(self.species)+': '+self.name
'''

# one planting of a particular plant
class Planting(models.Model):
	#species = models.ForeignKey(Species, on_delete=models.CASCADE)
	species = models.CharField(max_length=100)
	description = models.TextField(blank=True, null=True)
	# location
	lat = models.FloatField()
	lon = models.FloatField()
	planting_day = models.DateField()
	harvest_start = models.DateField(blank=True, null=True)
	harvest_end = models.DateField(blank=True, null=True)

	def __str__(self):
		return '{0} at [{1:.2f}, {2:.2f}]'.format(self.species, self.lat, self.lon)
