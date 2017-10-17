# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

class User(models.Model):
	username = models.CharField(max_length=200)
	def __str__(self):
		return self.username

class Album(models.Model):
	title = models.CharField(max_length=1000)
	artist = models.CharField(max_length=1000)
	cover = models.ImageField(upload_to='covers')
	description = models.TextField(blank=True,null=True)
	def __str__(self):
		return self.title

class Day(models.Model):
	date = models.DateField()
	album = models.ForeignKey(Album)
	def __str__(self):
		return str(self.date)+": "+self.album.title

class Review(models.Model):
	user = models.ForeignKey(User)
	album = models.ForeignKey(Album)
	rating = models.FloatField()
	review = models.TextField(blank=True,null=True)
	favsong = models.CharField(max_length=1000,blank=True,null=True)
	def __str__(self):
		return self.user+": "+self.album.title