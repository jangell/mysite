# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import *

# form submission class


# Create your views here.
lm = "on a plane to seattle. window seat. hella good views. let's try a much lemmmmmmgthier message and see how that goes. hey hey hella hella hella hella hella hella hella hella hella hella  goes. hey hey hella hella hella hella hella hella hella hella hella hella"
sm = "on a plane to seattle"
def index(request):
	context = {'time':'literally now','message':lm}
	return render(request,'checkin/index.html',context)

def contact(request):
    form_class = ContactForm

    if request.method == 'POST':
        form = form_class(data=request.POST)

        #from django.core.mail import send_mail
        #send_mail('Subject here', 'Here is the message.', 'from@example.com', ['to@example.com'], fail_silently=False)


        if form.is_valid():
            contact_name = request.POST.get('contact_name', '')
            contact_email = request.POST.get('contact_email', '')
            form_content = request.POST.get('email_content', '')
            # Email the profile with the contact information
            template = get_template('contact_template.txt')
            context = {
                'contact_name': contact_name,
                'contact_email': contact_email,
                'form_content': form_content,
            }
            content = template.render(context)

            send_mail('New message from '+contact_name, content, contact_email, ['kcrcranes@gmail.com'])
            #email.send()
            messages.success(request, 'Your message has been sent.')
            return redirect('kcr_cranes:contact')

def submit(request):
	if request.user.is_superuser:
		return render(request,'checkin/submit.html')
	else:
		return redirect('nope')
	
def nope(request):
	return render(request,'checkin/nope.html')