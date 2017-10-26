from django import forms

class CheckinForm(forms.Form):
    location = forms.CharField(
    	required=False,
    	label="location",
    	widget=forms.TextInput(attrs={'placeholder':'where u @','class':'form_input'})
    )
    message = forms.CharField(
        required=False,
        label="message",
        widget=forms.Textarea(attrs={'placeholder': 'sup'})
    )
# no images for now
#    image = forms.ImageField(
#        required=False,
#        label="picture"
#    )