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
	
	# return formatted datetime based on timestamp
	def getTime(self):
		s = datetime.datetime.strftime(self.timestamp, '%A %d %B, %k:%M %p (%Z)') # include (%Z) for time zone
		return s

	# return date based on timestamp
	def getDate(self):
		return self.timestamp.date()

	# return string of time elapsed since last checkin
	def timeAgo(self):
		now = datetime.datetime.now(self.timestamp.tzinfo)
		last = self.timestamp
		diff = now - last
		secs = diff.seconds
		# peel off seconds
		s = secs%60
		secs -= s
		# peel off minutes
		m = (secs%3600)/60
		secs -= m*60
		# peel off hours
		h = (secs%(24*3600))/3600
		secs -= h*3600
		# get days
		d = secs/(24*3600)
		print '{} {} {}'.format(m,h,d)
		if d != 0:
			return '{} day{} ago'.format(d,'s' if d != 1 else '')
		elif h != 0:
			return '{} hour{} ago'.format(h,'s' if h != 1 else '')
		elif m != 0:
			return '{} minute{} ago'.format(m, 's' if m != 1 else '')
		else:
			return 'less than a minute ago!'

	