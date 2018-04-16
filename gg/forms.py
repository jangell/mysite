import datetime
from django import forms
from django.contrib.admin.widgets import AdminDateWidget
from mapwidgets.widgets import GooglePointFieldWidget, GoogleStaticOverlayMapWidget
from .models import Planting

class SubmitForm(forms.Form):
	'''
	class Meta:
		model = Planting
		fields = ['species', 'description', 'planting_day', 'harvest_start', 'harvest_end']
		widgets = {
			'species': forms.TextInput(attrs={'placeholder':'Runner beans', 'class':'form_input'}),
			'description': forms.Textarea(attrs={'placeholder':'More info about the planting or tips for finding it'}),
		}
	'''

	'''
	location = forms.PointField(
		required=True,
		label="location",
		widget=
	)
	'''

	species = forms.CharField(
		required=True,
		label="Species name",
		widget=forms.TextInput(attrs={'placeholder':'Ex. Runner beans', 'class':'form_input'})
	)
	description = forms.CharField(
		required=False,
		label="Description",
		widget=forms.Textarea(attrs={'rows':4,'placeholder':'More info about the planting (ex. "halfway between the two oak trees", or "old seeds - might not germinate")'})
	)
	planting_day = forms.DateField(
		required=True,
		label="Planting date",
		widget=AdminDateWidget,
		initial=datetime.date.today
	)
	harvest_start = forms.DateField(
		required=True,
		label="Harvest start date",
		widget=AdminDateWidget,
	)
	harvest_end = forms.DateField(
		required=True,
		label="Harvest end date",
		widget=AdminDateWidget,
	)
	# invisible lat & lon fields that update automatically when the point is moved
	latitude = forms.FloatField(
		required=True,
		widget=forms.HiddenInput()
	)
	longitude = forms.FloatField(
		required=True,
		widget=forms.HiddenInput()
	)

