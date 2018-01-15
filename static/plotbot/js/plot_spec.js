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

class Point{
	constructor(x,y){
		self.x = x;
		self.y = y;
	}
}

// one field of a config (like figure width, or line color)
class Field{
	constructor(id){

		this.id = id;
		this.element = null

	}
	
	// gets the value from the current element that this field has generated
	getValue(){
		// start by making sure the element exists
		if(this.element){
			if(this.element.is(':checkbox'))
				return this.element.is(':checked');
			return this.element.val();
		}
		return null;
	}

	setValue(value){
		if(this.element){
			if(this.input == 'checkbox'){
				this.element.attr('checked',true);
				return true;
			}
			this.element.val(value);
			return true;
		}
		return false;
	}

	bindTo(element){
		this.element = element;
	}

}

/******************** PREPROCESSING *************************/

// abstract class to be inherited by all Preprocess classes
// args: a dictionary containing arguments for the preprocess (for sav-gol, window size and exponent, for example)
// processor: a function that takes in an array ([wavs,counts]) and returns an array of the same dimensions

// I've gotta switch from the class declarations I've been using to a function- / prototype-based approach because I can't figure out how to do it the other way
Preprocess = function(name, fields, processor, debug){
	// make sure fields is an object and processor is a function
	if(typeof fields !== 'object' || typeof processor !== 'function'){throw 'Preprocesses must be instantiated with name (string), args (dictionary), and processor (function)';}
	this.name = name;
	this.fields = fields;
	this.processor = processor;
	this.run_field = new Field('run_'+this.name, 'Run '+this.name, 'checkbox', {'checked':false, 'title':'Determines whether the selected spectrum uses or bypasses this preprocessing method'});
	
	this.debug = debug === undefined ? false : debug;
}
Preprocess.prototype.generatePreprocessHtml = function(){
	var _this = this;

	// label the preprocess
	var container = $('<div>').addClass('single_preproc');
	var header = $('<h3>').addClass('preproc_name').addClass('collapser').html(this.name);
	var tableWrapper = $('<div>').addClass('collapsible');
	var table = $('<table>').addClass('preproc_table');

	// add stuff to table
	// start with a checkbox field for run_me (this could be a switch element eventually if we wanna be cute)
	table.append(this.run_field.toTableRow());
	// then iterate through the rest of the fields
	for(f in this.fields){
		table.append(this.fields[f].toTableRow());
	}
	tableWrapper.append(table);

	// add functionality - click to collapse, toggle 'running' class on header based on 'run' checkbox
	$(header).click(function(){
		$('.collapsible').each(function(){
			// $(this) is a jquery-fied version of the object we're iterating through. _this is the instance of the preprocess
			if($(this).siblings('.preproc_name').html() != _this.name && $(this).css('display') == 'block'){
				// holy cow this actually works. go me.
				$(this).slideToggle('fast');
			}
		});
		// collapse all others
		$(tableWrapper).slideToggle('fast');
	});
	$(this.run_field.element).change(function(){
		// actually checking seems safer than just toggling
		if(_this.run_field.getValue()){
			$(header).addClass('running_preproc');
		}
		else{
			$(header).removeClass('running_preproc');
		}
	});

	// start with the table hidden and only the title showing
	$(tableWrapper).hide();

	// put everything in the container to return a single item
	container.append(header);
	container.append(tableWrapper);

	// TODO: add a handler to style running and not running differently and to update the values in the object when things change in the html
	return container;
}
Preprocess.prototype.runProcess = function(data){
	// only run if the run_me flag is true
	if(this.run_field.getValue() || this.debug){
		return this.processor(data);
	}
	// otherwise, don't do anything and just return the data
	return data;
}

// these are the actually preprocesses

Normalization = function(){
	// "parasitic inheritance" sounds like a thrash band
	that = new Preprocess(
		// name
		'Normalization',
		// fields
		{
			'lower': new Field('lower_limit', 'Lower limit', 'number', {'value':0, 'title':'Minimum value of the processed spectrum'}),
			'upper': new Field('upper_limit', 'Upper limit', 'number', {'value':1, 'title':'Maximum value of the processed spectrum'}),
		},
		// processor
		function(data){
			var wavs = data[0];
			var counts = data[1];

			var my_min = Math.min.apply(null,counts);
			var my_max = Math.max.apply(null,counts);
			var pre_range = my_max - my_min;

			// this should come from the 'upper' and 'lower' fields when this is in the page
			var upper = parseFloat(this.fields['upper'].getValue()); // parseFloat just in case the field tries to give us an integer
			var lower = parseFloat(this.fields['lower'].getValue());
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

MovingAverage = function(){
	that = new Preprocess(
		//name
		'Moving Average Filter',
		// fields
		{
			'window': new Field('window', 'Window size', 'number', {'value':5, 'step':2, 'min':3, 'placeholder':'odd only', 'title':'Width of the window to take the moving average. Each point is replaced by the average of itself and the surrounding points, and the total number of points used is this value. So for a window value of 5, each point becomes the average of itself, the two preceeding values, and the two following values. At the ends, when there are not enough points on one side, the average takes only the existing points. For example, the first point is replaced with an average of itself and the (({window size} - 1) / 2) points that follow.'}),
		},
		// algorithm
		function(data){
			var wavs = data[0];
			var counts = data[1];
			var av_counts = [];

			var win_size = parseInt(this.fields['window'].getValue());
			var half_win = parseInt(win_size / 2); // parseInt is necessary because javascript doesn't floor by default

			for(var i = 0; i < counts.length; i++){
				var set = counts.slice( Math.max( 0, i-half_win ), Math.min( i+half_win+1, counts.length ) ); // the "+1" and ".length" (instead of ".length-1") is because slice gets up to but not including the second value
				var avg = parseFloat(set.reduce((a, b) => a + b, 0))/set.length; // yes, this actually takes the average
				av_counts.push(avg);
			}
			return [wavs, av_counts];
		}
	);

	return that;
}

SavGol = function(){
	that = new Preprocess(
		// name
		'Savitzky-Golay Filter',
		// fields
		{
			'window': new Field('sg_window', 'Window size (5-11 only)', 'number', {'value':5, 'step':2, 'min':5, 'max':11,	 'title':'Sav-gol window (must be between 5 and 11)'})
			// 'order': new Field('sg_order', 'Order', 'number', {'value':3, 'step':1, 'min':0, 'title':'Order of polynomial for sav-gol filter'});
		},
		function(data){
			// coefficients taken from here: http://www.statistics4u.info/fundstat_eng/cc_savgol_coeff.html
			var coeffs = {
				5:  [-3,12,17,12,-3],
				7:  [-2,3,6,7,6,3,-2],
				9:  [-21,14,39,54,59,54,39,14,-21],
				11: [-36,9,44,69,84,89,84,69,44,9,-36]
			}

			var wavs = data[0];
			var counts = data[1];
			var win_size = parseInt(this.fields['window'].getValue());
			var half_win = (win_size-1)/2;

			// make sure the window size is valid (and as such has coefficients)
			if(!(win_size in coeffs)){
				console.log('Something went wrong with the sav-gol filter. Skipping it for now.')
				return data;
			}
			var my_coeffs = coeffs[win_size];
			var norm_fact = 1. / my_coeffs.reduce((a,b) => a + b, 0); // normalization factor
			var smooth_counts = [];
			var cur_ind = 0;
			var set;
			var to_push;

			// run moving average on first points
			while(cur_ind < half_win){
				set = counts.slice(0, cur_ind + half_win + 1);
				to_push = parseFloat(set.reduce((a, b) => a + b, 0))/set.length;
				smooth_counts.push(to_push);
				cur_ind += 1;
			}

			// run sg until we hit the last few points
			while(cur_ind < (counts.length - half_win)){
				set = counts.slice(cur_ind - half_win, cur_ind + half_win + 1)
				to_push = 0.;
				for(var i = 0; i < set.length; i++){
					to_push += set[i] * my_coeffs[i] * norm_fact;
				}
				smooth_counts.push(to_push);
				cur_ind += 1;
			}

			// moving average on last few points
			while(cur_ind < counts.length){
				set = counts.slice(cur_ind - half_win, counts.length);
				to_push = parseFloat(set.reduce((a,b) => a + b, 0))/set.length;
				smooth_counts.push(to_push);
				cur_ind += 1;
			}

			return [wavs, smooth_counts];
		}
	)
	return that;
}

// not currently implemented or in use
BaselineRemoval = function(){
	that = new Preprocess(
		//name
		'Baseline Removal',
		// field(s)
		{
			'window': new Field('window', 'Window size', 'number', {'value':5, 'step':2, 'min':3, 'title':'Size of baseline removal window'}),
		},
		// algorithm
		function(data){
			//var wavs = data[0];
			//var counts = data[1];

			// bypass for now
			return data;

			// simple (zeroth order fit)
			/*
			// advanced (first-order fit instead of zeroth order)
			// grab the window size
			var win_size = parseInt(this.fields['window'].getValue());
			var win_start = 0;
			// here's the big boy loop
			while((win_start + win_size) < counts.length){
				// walk through the window, from left to right, creating the highest straight line under all the points
				var left = win_start;
				var right = win_start + 1;
				// start with corners being the left and left+1 points
				var lowCorner = new Point(wavs[left],counts[left]);
				var highCorner = new Point(wavs[right],counts[right])
				// line-fit the local slice (convex hull!)
				// subtract that ish off
				// iterate
				win_start++;
			}
			return data;
			*/
		},
		// debug flag - DEVELOPMENT ONLY
		true
	);
	return that;
}

Crop = function(){
	that = new Preprocess(
		// name
		'Crop',
		// field(s)
		{
			'cropMin': new Field('cropMin', 'Minimum wavenumber', 'number', {'value':0, 'step':'any', 'title':'Lowest wavenumber to include in plot'}),
			'cropMax': new Field('cropMax', 'Maximum wavenumber', 'number', {'value':1200, 'step':'any', 'title':'Highest wavenumber to include in plot'}),
		},
		// algorithm
		function(data){
			var wavs = data[0];
			var counts = data[1];
			var xmin = parseFloat(this.fields['cropMin'].getValue());
			var xmax = parseFloat(this.fields['cropMax'].getValue());
			// this is slow-ish, but it works: just walk up and walk down
			var lo_ind = 0;
			var hi_ind = wavs.length - 1;
			// walk up to the min
			while(lo_ind < wavs.length && wavs[lo_ind] < xmin){
				lo_ind ++;
			}
			// go back one (will always overshoot by one unless we literally didn't move)
			if(lo_ind > 0){
				lo_ind --;
			}
			// walk down to the max
			// the lo_ind-2 makes it so no data shows up if xmin == xmax
			while(hi_ind > lo_ind-2 && wavs[hi_ind] > xmax){
				hi_ind --;
			}
			if(hi_ind < wavs.length-1){
				hi_ind ++;
			}
			return [wavs.slice(lo_ind, hi_ind), counts.slice(lo_ind, hi_ind)];
		}
	);
	return that;
}

Offset = function(){
	that = new Preprocess(
		// name
		'Offset',
		// field
		{
			'offset': new Field('offset', 'Offset', 'number', {'value':0.1, 'title':'Value by which to offset'}),
		},
		function(data){
			var wavs = data[0];
			var counts = data[1];
			var offset = parseFloat(this.fields['offset'].getValue());

			for(var i = 0; i < counts.length; i++){
				counts[i] += offset;
			}

			return [wavs,counts];
		}
	);
	return that;
}

/********************************** SPECCONFIG, PLOTCONFIG CLASSES **************************************/

// Vue rewrite







// end Vue rewrite

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
		this.fields['show'] = new Field();
		this.fields['legend_name'] = new Field();
		this.fields['line_width'] = new Field();
		this.fields['color'] = new Field();
		this.fields['opacity'] = new Field();
	}

	// same as plotconfig bind
	bind(field_key, target){
		// make sure the field key is valid
		if(!(field_key in this.fields)){
			console.log(field_key + ' is not a valid field');
			return false;
		}
		var sel = $(target);
		// make sure the selector is valid
		if(sel.length < 1){
			console.log(target + ' is not a valid element. could not bind ' + field_key);
			return false;
		}
		else if(sel.length > 1){
			console.log(target + ' selects multiple elements. could not bind ' + field_key);
			return false;
		}
		this.fields[field_key].bindTo(sel);
		return true;
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

	getData(){
		var cur_data = JSON.parse(JSON.stringify(this.spec_data));
		for(var p in this.preprocesses){
			cur_data = this.preprocesses[p].runProcess(cur_data);
		}
		return cur_data;
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
		var table = $('<table>').addClass('tools_table');

		// add all the fields
		for(var field in this.fields){
			table.append(this.fields[field].toTableRow(self.spec_id));
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
		var preproc = $('<div>').addClass('spec_config_preprocs');

		for(var p in this.preprocesses){
			preproc.append(this.preprocesses[p].generatePreprocessHtml());
		}


		// this is the container for the table and the preprocessing that we're going to return at the end
		var container = $('<div>').addClass('tools').attr('id',this.getConfigId());
		container.append(table);
		container.append(preproc);


		// show or hide to start (based, ultimately, whether or not there's one showing already, but here it's just based on a flag)
		if(this.selected){
			container.addClass('showing_config');
		}
		else{
			container.addClass('hidden_config');
		}

		return container;

	}

	// returns a plotly-friendly data object
	getPlotlyData(){
		// check here if 'show' is true or not (if not, return null immediately)
		var data = this.getData();
		if(!this.valueOf('show')){return null;}
		return {
			x: data[0],
			y: data[1],
			name: this.valueOf('legend_name'),
			showlegend: !(this.valueOf('legend_name') == ''), // only show in legend if field isn't blank
			line: {
				color: this.getColor(), // color and opacity (convert to rgba)
				width: this.valueOf('line_width'), // line width in pixels
			}
		}
	}

}

class VerticalLine{
	constructor(){
		this.fields = {};

		// functional fields
		this.fields['show'] = new Field('show', 'Show', 'checkbox', {'checked':true, 'title': 'Show / hide this line'});
		this.fields['xval'] = new Field('xval', 'Position', 'number', {'value': 100, 'title': 'Position of vertical line'});
		this.fields['ymin'] = new Field('ymin', 'Minimum Y', 'number', {'placeholder':'auto', 'title': 'Y value of minimum point of vertical line (default is high enough to almost always show line stretching across plot)'});
		this.fields['ymax'] = new Field('ymax', 'Maximum Y', 'number', {'placeholder':'auto', 'title': 'Y value of maximum point of veritcal line (default is high enough to almost always show line stretching across plot)'})

		// cosmetic fields
		this.fields['label'] = new Field('label', 'Label', 'text', {'placeholder':'No label', 'title':'Label to display by line'});
		this.fields['width'] = new Field('width', 'Width', 'number', {'value': 2, 'title': 'line width'});
		this.fields['color'] = new Field('color_box', 'Color', 'color', {'value': randomColor(), 'title': 'Line color'});
		this.fields['opacity'] = new Field('opacity', 'Opacity', 'number', {'value': 1, 'min': 0, 'max': 1, 'title': 'Line opacity'});

		this.yMin = -999999;	// minimum y value (to extend well below field of view)
		this.yMax = 999999;		// maximum y value (to extend well above field of view)
	}

	// get the current color of the vertical line as rgba string
	getColor(){
		var r, g, b, a;
		var hex = this.fields['color'].getValue(); // always gets a hex string (ex., #rrggbb)
		a = this.fields['opacity'].getValue();
		r = parseInt(hex.substring(1,3), 16);
		g = parseInt(hex.substring(3,5), 16);
		b = parseInt(hex.substring(5,7), 16);
		return 'rgba('+r+','+g+','+b+','+a+')';
	}

	// update the background color of the vertical line based on the color & opacity of the 
	/*
	// 		don't think we need this
	updateColor(){
		var _this = this;
		var rowId = this.getRowSelector();
		$(rowId).find('.color_box').css('background-color',_this.getColor());
	}
	*/

	vlListHtml(){
		// html to represent line object in list of line objects
	}
	vlConfigHtml(){
		var _this = this;
		// html to represent & handle line object and its options / settings
		var container = $('<div>').addClass('vl_container');

		var table = $('<table>').addClass('tools_table');

		// add all the fields
		for(var field in this.fields){
			table.append(this.fields[field].toTableRow());
		}

		// function to update the 'show' checkbox in spec list based on a change in the one in the spec config table
		this.fields['show'].element.change(function(){
			var checked = _this.valueOf('show');
			$(rowId).find('input').attr('checked',checked);
		});
		
		container.append(table);
		return container;

	}

	// returns a plotly shape object formatted to be inserted into layout
	getPlotlyShape(y0, y1){
		console.log(this.fields['ymin'].getValue()); // use this value if it's not blank (and ymax too)
		var x = this.fields['xval'].getValue();
		var shape = {
			type: 'line',
			x0: x,
			y0: y0,
			x1: x,
			y1: y1,
			line: {
				color: this.getColor(),
				width: this.fields['width'].getValue(),
			}
		};
		return shape;
	}

}

// PlotConfig
class PlotConfig{
	constructor(){
		// set values to defaults
		this.fields = {};
		this.fields['title'] = new Field();
		this.fields['xlabel'] = new Field();
		this.fields['ylabel'] = new Field();
		this.fields['xmin'] = new Field();
		this.fields['xmax'] = new Field();
		this.fields['ymin'] = new Field();
		this.fields['ymax'] = new Field();
		this.fields['show_legend'] = new Field();
		this.fields['show_grid'] = new Field();
		this.fields['show_ticks'] = new Field();

	}

	bind(field_key, target){
		// make sure the field key is valid
		if(!(field_key in this.fields)){
			console.log(field_key + ' is not a valid field');
			return false;
		}
		var sel = $(target);
		// make sure the selector is valid
		if(sel.length < 1){
			console.log(target + ' is not a valid element. could not bind ' + field_key);
			return false;
		}
		else if(sel.length > 1){
			console.log(target + ' selects multiple elements. could not bind ' + field_key);
			return false;
		}
		this.fields[field_key].bindTo(sel);
		return true;
	}

	// returns the value of a field
	valueOf(field, value){
		if(value === undefined){
			return this.fields[field].getValue();
		}
		else{
			this.fields[field].setValue(value);
		}
	}
}

// handler for plot config and all spec configs for a given page
class PlotHandler{
	// TODO: remove all targets from this except plot_target (even that we can bind in bindAll, tbh. maybe leave it here though)
	constructor(plot_target){
		// targets are all jquery objects
		this.spec_list_target = $('#speclist_target');
		//this.spec_config_target = spec_config_target;

		this.plot_target = plot_target;

		this.cur_spec_id = 0; 							// use this as spec ids as you go, to make sure they're identifiable
		this.plotConfig = new PlotConfig();				// global settings etc.
		this.specConfigList = [];						// list of spec config objects
		this.vlList = [];								// list of vertical line objects
		this.annotationsList = [						// list of annotations, stored as native plotly objects
/*
			// this creates one (editable) annotation, but at the moment I haven't developed a good way to add or remove annotations, so for this push I'm leaving it out
			{
				x: 1,
				y: 1,
				xref: 'x',
				yref: 'y',
				text: 'test annotation',
				showarrow: 'true',
				arrowhead: 7,
				ax: 0,
				ay: -40
			}
*/
		];
		// register preprocesses here to automatically add them to specconfigs
		// unfortunately, the order here matters. this is the order in which, if used, preprocesses will be applied
		// (actually, dictionaries don't necessarily preserve order in js, but for virtually all practical applications they will)
		this.preprocs = {
			'Crop': Crop,
			//'Baseline Removal': BaselineRemoval,
			'Savitzky-Golay Filter': SavGol,
			//'Moving Average': MovingAverage,
			'Normalization': Normalization,
			'Offset': Offset,
		};
	}

	getElementId(){
		return this.plot_target.attr('id');
	}
	getElement(){
		return document.getElementById(this.getElementId());
	}
	getDivData(){
		// plot_target is a jquery object, so we need to pull the native DOM out of it
		if(this.plot_target[0]){
			return this.plot_target[0].data;
		}
		return null;
	}
	getDivLayout(){
		if(this.plot_target[0]){
			return this.plot_target[0].layout;
		}
		return null;
	}
	getDivXRange(){
		if(this.getDivLayout()){
			return this.getDivLayout().xaxis.range;
		}
		return [null,null];
	}
	getDivYRange(){
		if(this.getDivLayout()){
			return this.getDivLayout().yaxis.range;
		}
		return [null,null];
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
			pp.push(new this.preprocs[p]);
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
		
		// redraw the plot -> move this to something that just updates the necessary parts of the plot
		this.updatePlot();

	}

	// add a vertical line object to the list of vertical lines
	addVL(){
		// add to list
		this.vlList.push(new VerticalLine());
		// add to html
		this.vl_target.append(this.vlList[this.vlList.length-1].vlConfigHtml());
		// start listening
		this.addToolListeners();
	}

	getVLs(){
		var [y0, y1] = this.getDivYRange();
		if(!y0){
			return [];
		}

		var shapes = [];
		for(var i = 0; i < this.vlList.length; i++){
			shapes.push(this.vlList[i].getPlotlyShape(y0, y1));
		}
		return shapes;
	}


	// updates the plot drawing -> move this to startPlot and only have it start the plot
	updatePlot(){
		var _this = this;
		var plot_div = this.getElement();

		// spectral data -> list of data
		var data = [];
		for(var i = 0; i < this.specConfigList.length; i++){
			var cur_data = this.specConfigList[i].getPlotlyData();
			// if <show> is false, this will return null, so we'll skip it
			if(cur_data != null){
				data.push(cur_data);
			}
		}

		// get values for x and y range
		var to_xmin = parseFloat(this.plotConfig.valueOf('xmin'));
		var to_xmax = parseFloat(this.plotConfig.valueOf('xmax'));
		var to_ymin = parseFloat(this.plotConfig.valueOf('ymin'));
		var to_ymax = parseFloat(this.plotConfig.valueOf('ymax'));

		var [x0, x1] = this.getDivXRange();
		var [y0, y1] = this.getDivYRange();
		// update x and y range once it's plotted
		// var xrange = this.getDivXRange();
		// var yrange = this.getDivYRange();
		// this.plotConfig.valueOf('xmin', xrange[0].toFixed(1));
		// this.plotConfig.valueOf('xmax', xrange[1].toFixed(1));
		// this.plotConfig.valueOf('ymin', yrange[0].toFixed(1));
		// this.plotConfig.valueOf('ymax', yrange[1].toFixed(1));

		// if only one in a pair (xmin vs xmax) is filled in, set other one to current value in plot
		if(!isNaN(to_xmin) && isNaN(to_xmax)){
			to_xmax = this.getDivXRange()[1];
			// also set the html element so the user knows why the plot is behaving the way it is
			this.plotConfig.valueOf('xmax', x1.toFixed(1));
		}
		else if(isNaN(to_xmin) && !isNaN(to_xmax)){
			to_xmin = this.getDivXRange()[0];
			this.plotConfig.valueOf('xmin', x0.toFixed(1));
		}
		if(!isNaN(to_ymin) && isNaN(to_ymax)){
			to_ymax = this.getDivYRange()[1];
			this.plotConfig.valueOf('ymax', y1.toFixed(1));
		}
		else if(isNaN(to_ymin) && !isNaN(to_ymax)){
			to_ymin = this.getDivYRange()[0];
			this.plotConfig.valueOf('ymin', y0.toFixed(1));
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
				size: 24,
				family: "'Helvetica', sans-serif"
			},
			// x axis dictionary (expand to advanced features later)
			xaxis: {
				title: this.plotConfig.valueOf('xlabel'),
				titlefont: {
					size: 20,
					family: "'Helvetica', sans-serif"
				},
				range: [to_xmin, to_xmax]
			},
			yaxis: {
				title: this.plotConfig.valueOf('ylabel'),
				titlefont: {
					size: 20,
					family: "'Helvetica', sans-serif"
				},
				range: [to_ymin, to_ymax]
			},
			showlegend: this.plotConfig.valueOf('show_legend'),
			annotations: this.annotationsList,
		}

		Plotly.newPlot(plot_div, data, layout, {showLink:false, displaylogo:false, editable:true});

		Plotly.relayout(plot_div, {shapes: this.getVLs()});

		// hook in a function to update settings on zoom / pan, or annotation(s) change
		plot_div.on('plotly_relayout',function(eventdata){
			//debugger;
			if(!('shapes' in eventdata)){

				// set annotations
				_this.annotationsList = _this.getElement().layout.annotations;

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

				// now update shapes (which shouldn't re-trigger this block because of the if statement)
				Plotly.relayout(plot_div, {shapes: _this.getVLs()})
			}
			
		});

		// hook in a resize function
		$(window).on('resize',function(){
			Plotly.Plots.resize(plot_div);
		});
	}

	// adds an event listener to all .tool changes to update the plot
	addToolListeners(){
		var _this = this;
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

	// bindings for all of the fields (page-specific)
	bindPlotConfig(){
		var pc = this.plotConfig;
		// pc.bind takes the field name and then the jquery selector
		//pc.fields['title'].bindTo($('#title_target'));
		pc.bind('title','#title_target');
		pc.bind('xlabel', '#xlabel_target');
		pc.bind('ylabel', '#ylabel_target');
		pc.bind('xmin', '#xmin_target');
		pc.bind('xmax', '#xmax_target');
		pc.bind('ymin', '#ymin_target');
		pc.bind('ymax', '#ymax_target');
		pc.bind('show_legend', '#showlegend_target');
		pc.bind('show_grid', '#showgrid_target');
		pc.bind('show_ticks', '#showticks_target');
	}

	// binds a specConfig to an html specConfig, 
	bindSpecConfig(sc,html){

	}

	// adds event listeners to the add and remove buttons and vertical line add/remove
	startAddRemove(){
		var _this = this;
		// add spectrum
		$('#add_button').click(function(){
			_this.showAddModal();
		});

		// quick add from db (autofill on quick_add)
		$('#quickadd_target').autocomplete({
			source: quick_add_list,
			minLength: 2,
			select: function(event, ui){
				$('#quickadd_target').val('');
				var selected = ui.item.value;
				_this.addSpecByDbId(selected); // oh my god this is so cool and so easy
				return false;
			}
		})

		// remove spectrum
		$('#remove_button').click(function(){
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

		// vertical lines
		/*_this.plotConfig.fields['add_vl'].element.click(function(){
			_this.addVL();
		});*/

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
		//this.insertPlotConfigHtml();
		// add event listeners for plot updates
		this.bindAll();
		this.addToolListeners();
		// add event listeners to add & remove spectra and key commands
		this.startAddRemove();
		this.startArrowShortcuts();

		this.updatePlot();
	}

}