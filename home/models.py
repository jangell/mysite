# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models

# Create your models here.
class PortfolioItem(models.Model):
	name = models.CharField(max_length=1000)
	description = models.TextField(max_length=1000)
	url = models.CharField(max_length=1000)
	fullImage = models.ImageField(upload_to='portfolio_images',blank=True,null=True)
	miniImage = models.ImageField(upload_to='portfolio_images',blank=True,null=True)
	def __str__(self):
		return self.name

class Skill(models.Model):
	name = models.CharField(max_length=1000)
	link = models.CharField(max_length=1000,blank=True,null=True)
	def __str__(self):
		return self.name

class Interest(models.Model):
	name = models.CharField(max_length=1000)
	link = models.CharField(max_length=1000,blank=True,null=True)
	def __str__(self):
		return self.name