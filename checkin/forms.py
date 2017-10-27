from django import forms

class CheckinForm(forms.Form):
    location = forms.CharField(
    	required=False,
    	label="",
    	widget=forms.TextInput(attrs={'placeholder':'where u @','class':'form_input'})
    )
    message = forms.CharField(
        required=False,
        label="",
        widget=forms.Textarea(attrs={'placeholder': 'sup'})
    )
# no images for now
#    image = forms.ImageField(
#        required=False,
#        label="picture"
#    )