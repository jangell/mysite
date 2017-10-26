# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import datetime
from django.db import models

# Create your models here.
class Checkin(models.Model):
	timestamp = models.DateTimeField()
	message = models.TextField(max_length=1000,blank=True,null=True)
	location = models.CharField(max_length=1000,blank=True,null=True)
	lat = models.FloatField(blank=True,null=True)
	lon = models.FloatField(blank=True,null=True)
	image = models.ImageField(upload_to='checkin_images',blank=True,null=True)
	def __str__(self):
		if self.message:
			return self.message
		else:
			return str(self.timestamp)
	def getTime(self):
		s = datetime.datetime.strftime(self.timestamp, '%A %d %B, %H:%m (%Z)')
		return s