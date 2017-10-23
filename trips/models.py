from __future__ import unicode_literals

from django.db import models

# Create your models here.
class Picture(models.Model):
	image = models.ImageField(upload_to='trip_images')
	name = models.CharField(max_length=1000,blank=True,null=True)
	description = models.TextField(max_length=1000,blank=True,null=True)
	#location = models.ForeignKey()
	def __str__(self):
		return self.name