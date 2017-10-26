# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

# Create your models here.
class Checkin(models.Model):
	timestamp = models.DateField()
	message = models.TextField(max_length=1000,blank=True,null=True)
	location = models.CharField(max_length=1000,blank=True,null=True)
	lat = models.FloatField(blank=True,null=True)
	lon = models.FloatField(blank=True,null=True)
	image = models.ImageField(upload_to='checkin_images',blank=True,null=True)
	def __str__(self):
		return str(self.timestamp)+' '+str(self.message)