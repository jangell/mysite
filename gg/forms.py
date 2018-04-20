import datetime
from django import forms
from django.contrib.admin.widgets import AdminDateWidget
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
	species = forms.CharField(
		label="Species name",
		widget=forms.TextInput(attrs={'placeholder':'Ex. Runner beans', 'class':'form_input'})
	)
	description = forms.CharField(
		required=False,
		label="Description",
		widget=forms.Textarea(attrs={'rows':4,'placeholder':'More info about the planting (ex. "halfway between the two oak trees", or "old seeds - might not germinate")'})
	)
	planting_day = forms.DateField(
		label="Planting date",
		widget=AdminDateWidget,
		initial=datetime.date.today
	)
	harvest_start = forms.DateField(
		label="Harvest start date",
		widget=AdminDateWidget,
	)
	harvest_end = forms.DateField(
		label="Harvest end date",
		widget=AdminDateWidget,
	)
	# invisible lat & lon fields that update automatically when the point is moved
	latitude = forms.FloatField(
		widget=forms.HiddenInput()
	)
	longitude = forms.FloatField(
		widget=forms.HiddenInput()
	)

