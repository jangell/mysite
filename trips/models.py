from __future__ import unicode_literals

from django.db import models

class Place(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=1000)
	description = models.TextField(max_length=10000,blank=True,null=True)
	def __str__(self):
		return self.name

class Picture(models.Model):
	image = models.ImageField(upload_to='trip_photos')
	thumbnail = models.ImageField(upload_to='trip_photos')
	trip = models.ForeignKey(Place)
	name = models.CharField(max_length=1000,blank=True,null=True)
	description = models.TextField(max_length=1000,blank=True,null=True)

	def create_thumbnail(self):
	    # original code for this method came from
	    # http://snipt.net/danfreak/generate-thumbnails-in-django-with-pil/

	    # If there is no image associated with this.
	    # do not create thumbnail
	    if not self.image:
	        return

	    from PIL import Image
	    from cStringIO import StringIO
	    from django.core.files.uploadedfile import SimpleUploadedFile
	    import os

	    # Set our max thumbnail size in a tuple (max width, max height)
	    THUMBNAIL_SIZE = (150, 150)

	    DJANGO_TYPE = self.image.file.content_type

	    if DJANGO_TYPE == 'image/jpeg':
	        PIL_TYPE = 'jpeg'
	        FILE_EXTENSION = 'jpg'
	    elif DJANGO_TYPE == 'image/png':
	        PIL_TYPE = 'png'
	        FILE_EXTENSION = 'png'

	    # Open original photo which we want to thumbnail using PIL's Image
	    image = Image.open(StringIO(self.image.read()))

	    # We use our PIL Image object to create the thumbnail, which already
	    # has a thumbnail() convenience method that contrains proportions.
	    # Additionally, we use Image.ANTIALIAS to make the image look better.
	    # Without antialiasing the image pattern artifacts may result.
	    image.thumbnail(THUMBNAIL_SIZE, Image.ANTIALIAS)

	    # Save the thumbnail
	    temp_handle = StringIO()
	    image.save(temp_handle, PIL_TYPE)
	    temp_handle.seek(0)

	    # Save image to a SimpleUploadedFile which can be saved into
	    # ImageField
	    suf = SimpleUploadedFile(os.path.split(self.image.name)[-1],
	            temp_handle.read(), content_type=DJANGO_TYPE)
	    # Save SimpleUploadedFile into image field
	    self.thumbnail.save(
	        '%s_thumbnail.%s' % (os.path.splitext(suf.name)[0], FILE_EXTENSION),
	        suf,
	        save=False
	    )

	def save(self, *args, **kwargs):

	    self.create_thumbnail()

	    force_update = False

	    # If the instance already has been saved, it has an id and we set 
	    # force_update to True
	    if self.id:
	        force_update = True

	    # Force an UPDATE SQL query if we're editing the image to avoid integrity exception
	    super(Picture, self).save(force_update=force_update)

	def __str__(self):
		return self.name