// Jason Angell
// SETI Institute / NASA Ames Research Center
// 9 December 2017

// define javascript classes for PlotConfig and SpecConfig objects

var valid_inputs = ['checkbox','text','number','color','button'];
var quick_add_list = [];

function randomHex(){
	var hexVal = (parseInt(Math.random() * 256)).toString(16);
	return ('0'+hexVal).slice(-2);
}

function randomColor(){
	var r, g, b;
	r = randomHex();
	g = randomHex();
	b = randomHex();
	return '#'+r+g+b;
}

// one field of a config (like figure width, or line color)
class Field{
	constructor(ident,label,input,defaults={}){
		// default input type is text
		if(valid_inputs.indexOf(input) == -1){input = 'text';}
		this.identifier = ident;
		this.label = label;
		this.input = input;
		if(typeof(defaults) === 'undefined'){
			this.defaults = null;
		}
		else{
			this.defaults = defaults;
		}
		this.element = null; // this is where the value in the element gets wired into the field itself (to be accessed by the specconfig via getValue() )
	}
	// gets the value from the current element that this field has generated
	getValue(){
		if(this.element){
			if(this.input == 'checkbox')
				return this.element.is(':checked');
			return this.element.val();
		}
		return null;
	}
	
	//
	updateValue(){
		alert('value of '+this.label+'is '+self.getValue());
	}

	// generates html to represent this field as a table row
	toTableRow(){
		// return the field as a table row
		var container = $('<tr>');
		container.addClass('tool');
		container.attr('id', this.identifier); // identifier is id of row and name of input
		container.append($('<td>').addClass('tool_label').html(this.label));
		var inputter = $('<input>').attr('type',this.input).attr('name',this.identifier);
		
		// wire in the moving parts
		this.element = inputter;
		
		// number inputter should have a step of any
		if(this.input == 'number'){inputter.attr('step','any');}

		// set the defaults based on the dictionary passed in
		for(var key in this.defaults){
			inputter.attr(key,this.defaults[key]);
		}

		var action = $('<td>').addClass('tool_action').append(inputter);
		container.append(action);
		return container;
	}
}

// abstract class to be inherited by all Preprocess classes
// args: a dictionary containing arguments for the preprocess (for sav-gol, window size and exponent, for example)
// processor: a function that takes in an array ([wavs,counts]) and returns an array of the same dimensions

// I've gotta switch from the class declarations I've been using to a function- / prototype-based approach because I can't figure out how to do it the other way
Preprocess = function(name, fields, processor, specConfig){
	// TODO: make this actually check for specConfig object
	if(specConfig === undefined){
		specConfig = null;
	}
	// make sure fields is an object and processor is a function
	if(typeof fields !== 'object' || typeof processor !== 'function'){throw 'Preprocesses must be instantiated with name (string), args (dictionary), and processor (function)';}
	this.name = name;
	this.fields = fields;
	this.processor = processor;
	this.run_me = false;	// we're only using this until we get the html rendering up and running
	this.run_field = new Field('run_'+this.name, 'Run '+this.name, 'checkbox', {'checked':true});
}
Preprocess.prototype.generatePreprocessHtml = function(){
	// label the preprocess
	var container = $('<div>');
	container.append($('<h3>').addClass('preproc_name').html(this.name));
	// generate a table
	var table = $('<table>').addClass('preproc_table');
	// start with a checkbox field for run_me
	table.append(this.run_field.toTableRow());
	// TODO: register element or listener or something
	// for ... in ... iterates through a list of keys
	for(f in this.fields){
		table.append(this.fields[f].toTableRow());
		// TODO: register listeners
	}

	container.append(table);

	// TODO: add a handler to style running and not running differently and to update the values in the object when things change in the html
	return container;
}
Preprocess.prototype.runProcess = function(data){
	// only run if the run_me flag is true
	if(this.run_me){
		return this.processor(data);
	}
	// otherwise, don't do anything and just return the data
	return data;
}

Normalization = function(){
	// "parasitic inheritance" sounds like a thrash band
	that = new Preprocess(
		// name
		'Normalization',
		// fields
		{
			'upper': new Field('upper_limit', 'Upper limit', 'number', {'value':1}),
			'lower': new Field('lower_limit', 'Lower limit', 'number', {'value':0})
		},
		// processor
		function(data){
			console.log('running normalization');
			var wavs = data[0];
			var counts = data[1];

			var my_min = Math.min.apply(null,counts);
			var my_max = Math.max.apply(null,counts);
			var pre_range = my_max - my_min;

			// this should come from the 'upper' and 'lower' fields when this is in the page
			var upper = parseFloat(this.fields['upper']); // parseFloat just in case the field tries to give us an integer
			var lower = parseFloat(this.fields['lower']);
			var post_range = upper - lower;

			for(var i = 0; i < counts.length; i++){
				var temp = counts[i]
				temp -= my_min; // now it's between 0 and pre_range
				temp /= pre_range; // now it's between 0 and 1
				temp *= post_range; // now it's between 0 and post_range
				temp += lower; // now it's between lower and upper
				counts[i] = temp;
			}
			return [wavs,counts];
		}
	);

	return that;
}


// testing preprocess
var data = [[1.,2.,3.,4.,5.], [7.,8.,7.1,10.2,6.4]];

var n = new Normalization();
console.log('n = new Normalization() has loaded');
console.log('try n.generatePreprocessHtml()');

/*
class Preprocess{
	constructor(args){
		// make sure this isn't being instantiated directly (this is an abstract class)
		if(this.constructor === Preprocess){
			throw 'Preprocess is an abstract class and cannot be implemented directly';
		}
		
		this.args = args;
		this.processor = processor;
		this.usePreprocess = false;
	}

	setArg(key,val){
		this.args[key] = val;
	}
	getArg(key){
		if(key in args){
			return args[key];
		}
		throw key+' is not a key in args'
	}

	preprocess(data){
		// only preprocess if this flag has been set to true
		if(this.usePreprocess){
			return this.processor(data);
		}
		// by default, return the same data
		return data;
	}
}*/



// SpecConfig (reminder: classes are not hoisted in js)
class SpecConfig{
	constructor(spec_id, spec_name, spec_data, preprocs){
		// TODO: add type checking here!!!
		this.spec_id = spec_id; // unique identifier to keep track of which spectra are which when we modify things later on
		this.spec_name = spec_name;
		this.spec_data = spec_data;
		this.preprocesses = preprocs;
		this.selected = false; // keep track of which is currently showing (and highlighted)
		this.fields = {};
		this.fields['show'] = new Field('spec'+this.spec_id+'_show', 'Show', 'checkbox', {'checked':true});
		this.fields['legend_name'] = new Field('spec'+this.spec_id+'_legend_name', 'Legend label', 'text',{'value':this.spec_name,'placeholder':'No label'});
		this.fields['line_width'] = new Field('spec'+this.spec_id+'_line_width', 'Line width (px)', 'number', {'value':2});
		this.fields['color'] = new Field('spec'+this.spec_id+'_color', 'Color', 'color', {'value':randomColor()});
		this.fields['opacity'] = new Field('spec'+this.spec_id+'_opacity', 'Opacity', 'number', {'value':1});
		// this.last_data = this.spec_data;
		// this.has_changed = false;
	}

	valueOf(field){
		return this.fields[field].getValue();
	}

	// returns the id to use for the relevant row in the speclist
	getRowId(){
		return 'speclist_'+this.spec_id;
	}
	getRowSelector(){
		return '#'+this.getRowId();
	}
	// returns the id to use for the relevant div in the specconfig
	getConfigId(){
		return 'specconfig_'+this.spec_id;
	}
	getConfigSelector(){
		return '#'+this.getConfigId();
	}

	// generates a row with name and show/don't-show checkbox
	generateSpecListHtml(){
		var _this = this; // we map the class 'this' to '_this' so that we can reference it in the function below, where 'this' refers to the jquery object
		// javascript is dumb. jquery is dumb. programming is stupid.

		// create the actual row
		var row = $('<tr>').addClass('spec_table_row').attr('id',this.getRowId());
		// add entry for spec name
		row.append($('<td>').addClass('spec_row_name').html(this.spec_name));
		// add entry for spec color
		var color_box = $('<td>').addClass('color_box').addClass('spec_row_color');
		row.append(color_box);
		// add entry for showing box
		var show_box = $('<input>').attr('type','checkbox').attr('checked',true).attr('disabled',true);
		var to_add = $('<td>').addClass('spec_row_show').append(show_box);
		row.append(to_add);

		// set css based on whether this is selected or not
		if(this.selected){row.addClass('selected_row');}
		else{row.addClass('unselected_row');}

		// get the html id of the config table and the speclist row (we need them for the functions)
		var configId = this.getConfigSelector();
		var rowId = this.getRowSelector();

		// function for when this spec is clicked on in the list
		row.on('click',function(){
			// hide all
			$('.showing_config').hide();
			$('.showing_config').removeClass('showing_config').addClass('hidden_config');
			// show the one that was clicked
			$(configId).show();
			$(configId).removeClass('hidden_config').addClass('showing_config');
			// unselect all rows
			$('.selected_row').removeClass('selected_row').addClass('unselected_row');
			// select this one
			$(rowId).removeClass('unselected_row').addClass('selected_row');
		});

		// not allowing 'showing' checkbox to be clickable at the moment (weird bugs)
		/*
		// function for when this spec's 'show' checkbox is clicked on
		show_box.click(function(){
			var checked = show_box.is(':checked');	// get whether or not it's checked
			// TODO: show or hide in plot (tbd)
			_this.fields['show'].element.attr('checked',checked);	// update the show box in the relevant config
		});
		*/

		return row;
	}

	// get the current color of the spec config as rgba string
	getColor(){
		var r, g, b, a;
		var hex = this.valueOf('color'); // always gets a hex string (ex., #rrggbb)
		a = this.valueOf('opacity');
		r = parseInt(hex.substring(1,3), 16);
		g = parseInt(hex.substring(3,5), 16);
		b = parseInt(hex.substring(5,7), 16);
		return 'rgba('+r+','+g+','+b+','+a+')';
	}

	// update the background color of the spec list based on the color & opacity of the 
	updateColor(){
		var _this = this;
		var rowId = this.getRowSelector();
		$(rowId).find('.color_box').css('background-color',_this.getColor());
	}

	// generates an html table for spec configuration
	generateSpecConfigHtml(){
		var _this = this; // see complaint in generateSpecListHtml()
		// get the html id of the config table and the speclist row (we need them for the functions)
		var configId = this.getConfigSelector();
		var rowId = this.getRowSelector();


		// this is the table where all the spec tools go
		var table = $('<table>').addClass('tools');
		table.attr('id',this.getConfigId());

		// put all the fields 
		for(var field in this.fields){
			table.append(this.fields[field].toTableRow(self.spec_id));
		}

		// show or hide to start (based, ultimately, whether or not there's one showing already, but here it's just based on a flag)
		if(this.selected){
			table.addClass('showing_config');
		}
		else{
			table.addClass('hidden_config');
		}

		// function to update the 'show' checkbox in spec list based on a change in the one in the spec config table
		this.fields['show'].element.change(function(){
			var checked = _this.valueOf('show');
			$(rowId).find('input').attr('checked',checked);
		});
		
		// function to update the 'color' box in spec list based on a change to color or opacity in spec config
		this.fields['color'].element.change(function(){
			_this.updateColor();
		});
		this.fields['opacity'].element.change(function(){
			_this.updateColor();
		});
		// go get the color of this spec and set the color well to it to start out correctly
		_this.updateColor();


		// all of the preprocessing divs will go in this
		var preproc = $('<div>');

		for(var p in this.preprocesses){
			console.log(p);
			console.log(this.preprocesses[p]);
		}


		// this is the container for the table and the preprocessing that we're going to return at the end
		var container = $('<div>');
		container.append(table);
		container.append(preproc);

		return container;

	}

	// returns a plotly-friendly data object
	getPlotlyData(){
		// check here if 'show' is true or not (if not, return null immediately)
		if(!this.valueOf('show')){return null;}
		return {
			x: this.spec_data[0],
			y: this.spec_data[1],
			name: this.valueOf('legend_name'),
			showlegend: !(this.valueOf('legend_name') == ''), // only show in legend if field isn't blank
			line: {
				color: this.getColor(), // color and opacity (convert to rgba)
				width: this.valueOf('line_width'), // line width in pixels
			}
		}
	}

}

// PlotConfig
class PlotConfig{
	constructor(){
		// set values to defaults
		this.fields = {};
		//this.fields['fig_width'] = new Field('fig_width', 'Width', 'number');
		//this.fields['fig_height'] = new Field('fig_height', 'Height', 'number');
		this.fields['title'] = new Field('title', 'Title', 'text', {'placeholder':'No title'});
		//this.fields['show_title'] = new Field('show_title', 'Show title', 'checkbox');
		this.fields['xlabel'] = new Field('xlabel', 'X-axis label', 'text', {'value': 'Wavenumber'});
		this.fields['ylabel'] = new Field('ylabel', 'Y-axis label', 'text', {'value': 'Intensity'});
		this.fields['xmin'] = new Field('xmin', 'x<sub>min</sub>', 'number', {'placeholder':'Auto'}); // doesn't do anything yet
		this.fields['xmax'] = new Field('xmax', 'x<sub>max</sub>', 'number', {'placeholder':'Auto'}); // doesn't do anything yet
		this.fields['ymin'] = new Field('ymin', 'y<sub>min</sub>', 'number', {'placeholder':'Auto'}); // doesn't do anything yet
		this.fields['ymax'] = new Field('ymax', 'y<sub>max</sub>', 'number', {'placeholder':'Auto'}); // doesn't do anything yet
		this.fields['show_legend'] = new Field('show_legend', 'Show legend', 'checkbox', {'checked':'true'});
		this.fields['quick_add'] = new Field('quick_add', 'Quick add from database', 'text', {'placeholder':'Try typing "qua"'});
		this.fields['add_spec'] = new Field('add_spec', 'Add spectrum', 'button', {'value':'Add'});
		this.fields['remove_spec'] = new Field('remove_spec', 'Remove selected spectrum', 'button', {'value':'Remove'});
		// TODO: create legend location
		//this.legend_location = new Field('legend_location', 'Legend location', 'option', {'0':'Top right', '1':'Top left', '2':'Bottom left', '3':'Bottom right'});
	}

	// convert fields to html table
	toTable(){
		var table = $('<table>').addClass('tools');
		for(var field in this.fields){
			table.append(this.fields[field].toTableRow());
		}
		return table;
	}

	// returns the value of a field
	valueOf(field){
		return this.fields[field].getValue();
	}
}

// handler for plot config and all spec configs for a given page
class PlotHandler{
	constructor(plot_config_target, spec_list_target, spec_config_target, plot_target, preprocesses){
		this.plot_config_target = plot_config_target;
		this.spec_list_target = spec_list_target;
		this.spec_config_target = spec_config_target;
		this.plot_target = plot_target;

		this.cur_spec_id = 0; // use this as spec ids as you go, to make sure they're identifiable
		this.plotConfig = new PlotConfig();
		this.specConfigList = [];
		this.preprocs = {'Normalization':Normalization}; // register preprocesses here to automatically add them to specconfigs
	}

	// get the index of a spectrum in specConfigList based on its spec id
	getSpecIndexById(id){
		for(var i = 0; i < this.specConfigList.length; i++){
			if(this.specConfigList[i].spec_id == id){
				return i;
			}
		}
		return -1;
	}

	getSelectedSpecIndex(){
		var _this = this;
		if($('.selected_row').length){
			var selected_spec_id = $('.selected_row').attr('id').split('_')[1];
			var ssi = _this.getSpecIndexById(selected_spec_id);
			return ssi;
		}
		else{
			return null;
		}
	}

	// appends the plot config html to the jquery element <target>
	// creates a handler for any changes to tools to redraw the plot
	insertPlotConfigHtml(){
		this.plot_config_target.append(this.plotConfig.toTable());
	}

	// inserts the spec list html at the end of the current spec list
	appendSpecListRow(specConfig){
		this.spec_list_target.append(specConfig.generateSpecListHtml());
	}

	appendSpecConfigHtml(specConfig){
		// show the first one, but hide all the others
		this.spec_config_target.append(specConfig.generateSpecConfigHtml());
	}

	// adds a spectrum based on its database id
	addSpecByDbId(id){
		var _this = this;
		// ajax call to get db spectrum with id in modal_db_id
		$.get({
			url:'getSpec',
			data:{'spec_id':id},
			success:function(response){
				_this.addSpec(response['name'],response['data'])
				return true;
			}
		});
	}

	// adds a spectrum to the working set
	addSpec(spec_name, spec_data){
		var _this = this;
		// generate set of preprocesses at defaults
		var pp = [];
		for(var p in this.preprocs){
			pp.push(new this.preprocs[p])
		}
		var sc = new SpecConfig(this.cur_spec_id, spec_name, spec_data, pp);
		this.cur_spec_id++; // make sure each is unique (assume we never have over 2 gajillion spectra showing simultaneously)
		// append it to spec config list
		this.specConfigList.push(sc);
		// if it's the only specconfig, show & select it
		if(this.specConfigList.length == 1){
			sc.selected = true;
		}
		// add row to speclist
		this.appendSpecListRow(sc);
		// add div to specConfigs
		this.appendSpecConfigHtml(sc);
		// add event listeners to new tools
		this.addToolListeners();
		// select the newly added plot (hint: it's the last one)
		$(this.specConfigList[this.specConfigList.length-1].getRowSelector()).click();
		// redraw the plot
		this.updatePlot();
	}

	// updates the plot drawing
	updatePlot(){
		var _this = this;
		var id = this.plot_target.attr('id');
		var plot_div = document.getElementById(id);

		// spectral data -> list of data
		var data = [];
		for(var i = 0; i < this.specConfigList.length; i++){
			var cur_data = this.specConfigList[i].getPlotlyData();
			// if <show> is false, this will return null, so we'll skip it
			if(cur_data != null){
				data.push(cur_data);
			}
		}

		// global variables -> layout
		var layout = {
			// margin is arbitrary for now
			margin: {
				l: 70,
				r: 40,
				t: 60,
				b: 80
			},
			title: this.plotConfig.valueOf('title'),
			titlefont: {
				size: 22,
			},
			// x axis dictionary (expand to advanced features later)
			xaxis: {
				title: this.plotConfig.valueOf('xlabel'),
				titlefont: {
					size: 16,
				},
				range: [parseFloat(this.plotConfig.valueOf('xmin')),parseFloat(this.plotConfig.valueOf('xmax'))]
			},
			yaxis: {
				title: this.plotConfig.valueOf('ylabel'),
				titlefont: {
					size: 16,
				},
				range: [parseFloat(this.plotConfig.valueOf('ymin')),parseFloat(this.plotConfig.valueOf('ymax'))]
			},
			showlegend: this.plotConfig.valueOf('show_legend'),

		}

		Plotly.newPlot(plot_div, data, layout, {showLink:false});

		// hook in a function to update settings on zoom / pan
		plot_div.on('plotly_relayout',function(eventdata){
			var nDigits = 2;
			// eventdata is either dragmode, autorange, or x-/y-axis ranges
			var pc = _this.plotConfig;
			if(eventdata['dragmode']){
				// do nothing
				return;
			}
			// implied <else if>, because if the last one was true, it returns and never gets here
			// for autorange, reset plotting range in form
			if(eventdata['xaxis.autorange']){
				pc.fields['xmin'].element.val('');
				pc.fields['xmax'].element.val('');
			}
			if(eventdata['yaxis.autorange']){
				pc.fields['ymin'].element.val('');
				pc.fields['ymax'].element.val('');
			}
			// this just gives us the whole range, no questions asked! What a great day!
			if(eventdata['xaxis.range[0]']){pc.fields['xmin'].element.val(eventdata['xaxis.range[0]'].toFixed(nDigits));} // yes, the whole thing is the key. no, i don't get it either
			if(eventdata['xaxis.range[1]']){pc.fields['xmax'].element.val(eventdata['xaxis.range[1]'].toFixed(nDigits));}
			if(eventdata['yaxis.range[0]']){pc.fields['ymin'].element.val(eventdata['yaxis.range[0]'].toFixed(nDigits));}
			if(eventdata['yaxis.range[1]']){pc.fields['ymax'].element.val(eventdata['yaxis.range[1]'].toFixed(nDigits));}
		});

		// hook in a resize function
		$(window).on('resize',function(){
			Plotly.Plots.resize(plot_div);
		});
	}

	// adds an event listener to all .tool changes to update the plot
	addToolListeners(){
		var _this = this;
		this.updatePlot();
		$('.tool').change(function(){
			_this.updatePlot();
		});
	}

	
	// shows a modal window, handles getting the spectrum from it
	showAddModal(){
		$('.modal_bg').show();
		// add a handler to the escape key to get rid of modal
		$(document).keydown(function(e){
			if(e.keyCode == 27){
				$('.modal_bg').hide();
			}
		});
	}

	
	// adds event listeners to the add and remove buttons
	startAddRemove(){
		var _this = this;
		// add spectrum
		_this.plotConfig.fields['add_spec'].element.click(function(){
			_this.showAddModal();
		});

		// quick add from db (autofill on quick_add)
		$(_this.plotConfig.fields['quick_add'].element).autocomplete({
			source: quick_add_list,
			minLength: 3,
			select: function(event, ui){
				$(_this.plotConfig.fields['quick_add'].element).val('');
				var selected = ui.item.value;
				_this.addSpecByDbId(selected); // oh my god this is so cool and so easy
				return false;
			}
		})

		// remove spectrum
		_this.plotConfig.fields['remove_spec'].element.click(function(){
			// get which spectrum is currently selected
			var selected_spec_index = _this.getSelectedSpecIndex();
			// make sure it exists
			if(selected_spec_index < 0){
				console.log('attempted to remove spectrum that could not be found');
				return false;
			}
			// get specConfig object
			var sc = _this.specConfigList[selected_spec_index];
			// remove html config
			$(sc.getConfigSelector()).remove();
			// remove html row
			$(sc.getRowSelector()).remove();
			// remove specConfig object
			if(selected_spec_index > -1){
				_this.specConfigList.splice(selected_spec_index,1);
				_this.updatePlot();
			}
			// select next spec if it exists (just "click" on its row)
			// try the index of the list we just deleted
			if(_this.specConfigList.length > selected_spec_index){
				$(_this.specConfigList[selected_spec_index].getRowSelector()).click();
			}
			// if that fails, try index 0
			else if(_this.specConfigList.length > 0){
				$(_this.specConfigList[0].getRowSelector()).click();
			}
			// so now we selected something valid the list is empty. ok. cool.
			return true;
		});
	}
	
	// add key commands (up and down arrow) for navigating spec list
	// up: 38
	// down: 40
	startArrowShortcuts(){
		var _this = this;
		$(document).keydown(function(e){
			var ssi = _this.getSelectedSpecIndex();
			if(e.keyCode == 38){
				if(ssi != null && ssi > 0){
					$(ph.specConfigList[ssi-1].getRowSelector()).click();
					e.preventDefault();
				}
			}
			else if(e.keyCode == 40){
				if(ssi != null && ssi < (_this.specConfigList.length - 1)){
					$(ph.specConfigList[ssi+1].getRowSelector()).click();
					e.preventDefault();
				}
			}
		});
	}

	initialize(){
		// insert plot configuration html
		this.insertPlotConfigHtml();
		// add event listeners for plot updates
		this.addToolListeners();
		// add event listeners to add & remove spectra and key commands
		this.startAddRemove();
		this.startArrowShortcuts();

		this.updatePlot();
	}

}