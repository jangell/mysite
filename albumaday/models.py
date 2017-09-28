# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

class User(models.Model):
	username = models.CharField(max_length=200)
	def __str__(self):
		return self.username

class Album(models.Model):
	name = models.CharField(max_length=1000)
	album = models.CharField(max_length=1000)
	artist = models.CharField(max_length=1000)
	cover = models.ImageField(upload_to='covers')
	description = models.TextField(blank=True,null=True)
	def __str__(self):
		return self.name

class Review(models.Model):
	user = models.ForeignKey(User)
	album = models.ForeignKey(Album)
	rating = models.FloatField()
	review = models.TextField(blank=True,null=True)
	favsong = models.CharField(max_length=1000,blank=True,null=True)