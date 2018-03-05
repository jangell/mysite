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
	constructor(){
		this.element = null;
	}

	bindTo(element){
		this.element = element;
		this.element.addClass('tool');
	}
	
	// gets the value from the current element that this field has generated
	getValue(){
		// start by making sure the element exists
		if(this.element){
			if(this.element.attr('type') == 'checkbox')
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
}

// abstract class to be inherited by all Preprocess classes
// args: a dictionary containing arguments for the preprocess (for sav-gol, window size and exponent, for example)
// processor: a function that takes in an array ([wavs,counts]) and returns an array of the same dimensions

// I've gotta switch from the class declarations I've been using to a function- / prototype-based approach because I can't figure out how to do it the other way
Preprocess = function(name, el_name, fields, bindings, processor){
	// make sure fields is an object and processor is a function
	if(typeof fields !== 'object' || typeof processor !== 'function'){throw 'Preprocesses must be instantiated with name (string), args (dictionary), and processor (function)';}
	this.name = name;
	this.el_name = el_name;
	this.fields = fields;
	this.fields['run'] = new Field();
	this.bindings = bindings; // binding function
	this.processor = processor;
}
// binds all of this preprocess's bindings to the [target=<bindings[i]>] elements within <target>
// reminder: bindings are dictionaries, where the field name is the key and the element target is the value
Preprocess.prototype.bindAll = function(target){
	var el = target.find('[name=' + this.el_name + ']');
	for(let b in this.bindings){
		this.fields[b].bindTo(el.find('[target='+this.bindings[b]+']'))
	}
}
// the actual algorithm that preprocesses <data>, the spectral data
Preprocess.prototype.runProcess = function(data){
	// only run if the run_me flag is true
	if(this.fields['run'].getValue() || this.debug){
		return this.processor(data);
	}
	// otherwise, don't do anything and just return the data
	return data;
}

// these are the actual preprocesses

Normalization = function(){
	// "parasitic inheritance" sounds like a thrash band
	that = new Preprocess(
		// name
		'Normalization',
		// element name
		'norm',
		// fields (run gets added automatically)
		{	
			'lower': new Field(),
			'upper': new Field(),
		},
		// bindings
		{	
			'run': 'run',
			'lower': 'lower',
			'upper': 'upper',
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
		// element name
		'mov_avg',
		// fields
		{
			'window': new Field('window', 'Window size', 'number', {'value':5, 'step':2, 'min':3, 'placeholder':'odd only', 'title':'Width of the window to take the moving average. Each point is replaced by the average of itself and the surrounding points, and the total number of points used is this value. So for a window value of 5, each point becomes the average of itself, the two preceeding values, and the two following values. At the ends, when there are not enough points on one side, the average takes only the existing points. For example, the first point is replaced with an average of itself and the (({window size} - 1) / 2) points that follow.'}),
		},
		// bindings
		{
			'run':'run',
			'window':'window',
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
		// element name
		'savgol',
		// fields
		{
			'window': new Field()
			// 'order': new Field('sg_order', 'Order', 'number', {'value':3, 'step':1, 'min':0, 'title':'Order of polynomial for sav-gol filter'});
		},
		// bindings
		{
			'run': 'run',
			'window': 'window',
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
		// element name
		'br',
		// field(s)
		{
			'window': new Field('window', 'Window size', 'number', {'value':5, 'step':2, 'min':3, 'title':'Size of baseline removal window'}),
		},
		// bindings
		{
			'run': 'run',
			'window': 'window',
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
	);
	return that;
}

Crop = function(){
	that = new Preprocess(
		// name
		'Crop',
		// element name
		'crop',
		// field(s)
		{
			'cropMin': new Field('cropMin', 'Minimum wavenumber', 'number', {'value':0, 'step':'any', 'title':'Lowest wavenumber to include in plot'}),
			'cropMax': new Field('cropMax', 'Maximum wavenumber', 'number', {'value':1200, 'step':'any', 'title':'Highest wavenumber to include in plot'}),
		},
		// bindings
		{
			'run': 'run',
			'cropMin': 'xmin',
			'cropMax': 'xmax',
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
		// element name
		'offset',
		// field
		{
			'offset': new Field('offset', 'Offset', 'number', {'value':0.1, 'title':'Value by which to offset'}),
		},
		// bindings
		{
			'run': 'run',
			'offset': 'offset',
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

// vertical line
class VertLine{
	constructor(vl_id){
		this.id = vl_id;
		this.fields = {};
		this.fields['xval'] = new Field('xval', 'X Value', 'number', {'value':100});
		this.fields['ymin'] = new Field('ymin', 'y<sub>min</sub>', 'number', {'value':0});
		this.fields['ymax'] = new Field('ymax', 'y<sub>max</sub>', 'number', {'value':10000});
	}

	// return html for vertical line
	vlHtml(){
		var container = $('<div>').addClass('vl_config');
		for(var f in this.fields){
			container.append(this.fields[f].toTableRow());
		}
		return container;
	}

	// return nice, plotly.js-ified line
	getPlotly(){
		var x = this.fields['xval'].getValue();
		var y0 = this.fields['ymin'].getValue();
		var y1 = this.fields['ymax'].getValue();
		return {
			x: [x,x],
			y: [y0,y1],
			name: x,
			line: {
				color: '#8921d5',
				width: 2,
			}
		};
	}

	getPlotlyData(){
		// check here if 'show' is true or not (if not, return null immediately)
		var data = this.getData();
		if(!this.valueOf('show')){return null;}
		return {
			x: data[0],
			y: data[1],
			name: this.valueOf('label'),
			showlegend: !(this.valueOf('label') == ''), // only show in legend if field isn't blank
			line: {
				color: this.getColor(), // color and opacity (convert to rgba)
				width: this.valueOf('line_width'), // line width in pixels
			}
		}
	}
}

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
		this.fields['label'] = new Field();
		this.fields['line_width'] = new Field();
		this.fields['color'] = new Field();
		this.fields['opacity'] = new Field();

		this.target_element = $('#spec_tools');
		this.template_element = $('#spec_config_example').clone().removeClass('spec_config_example');

	}

	bindAll(element){
		if(!(element instanceof $)){
			alert('plotConfig bindings failed');
			return;
		}
		// helper function for the rest of this
		function finder(s){
			let e = element.find('[target='+s+']');
			return e;
		}

		finder('spec_name').html(this.spec_name);
		this.fields['show'].bindTo(finder('show'));
		this.fields['label'].bindTo(finder('label'));
		this.fields['line_width'].bindTo(finder('line_width'));
		this.fields['color'].bindTo(finder('color'));
		this.fields['opacity'].bindTo(finder('opacity'));

		// delegate preprocess binding to each preprocess
		for(let p in this.preprocesses){
			this.preprocesses[p].bindAll(element);
		}

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
		let row = $('<div>').addClass('table_row').addClass('speclist_row').attr('id',this.getRowId());
		row.append($('<div>').addClass('text').html(this.spec_name));
		row.append($('<div>').addClass('color').append($('<div>').addClass('color_patch').css({'background-color':'blue'})));
		row.append($('<div>').addClass('showing').append($('<input>').attr('type','checkbox').attr('checked',true).attr('disabled',true)));

		// get the html id of the config table and the speclist row (we need them for the functions)
		var configSel = this.getConfigSelector();
		var rowSel = this.getRowSelector();

		// function for when this spec is clicked on in the list
		row.on('click',function(){
			// hide showing config(s) (the $(this).find is necessary because there are selected rows in other tables (like the add-from-db table))
			$('.showing_config').removeClass('showing_config').addClass('hidden_config');
			// show the one that was clicked
			$(configSel).removeClass('hidden_config').addClass('showing_config');
			// unselect all rows (the $(this).find is necessary because there are selected rows in other tables (like the add-from-db table))
			$(this).siblings('.selected_row').removeClass('selected_row').addClass('unselected_row');
			// select this one
			$(rowSel).removeClass('unselected_row').addClass('selected_row');
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
		var rowSel = this.getRowSelector();
		$(rowSel).find('.color_patch').css('background-color',_this.getColor());
	}

	// generates an html table for spec configuration
	generateSpecConfigHtml(){
		var _this = this; // see complaint in generateSpecListHtml()
		// get the html id of the config table and the speclist row (we need them for the functions)
		var configSel = this.getConfigSelector();
		var rowSel = this.getRowSelector();

		// div for spec tools
		var el = this.template_element.clone().attr('id',this.getConfigId());

		// append el to the spec_tools (and hide all others and show this)
		this.target_element.append(el);
		// bind all of the fields for this specconfig to the fields in el
		this.bindAll(el);

		// function to update the 'show' checkbox in spec list based on a change in the one in the spec config table
		el.change(function(){
			var checked = _this.valueOf('show');
			$(rowSel).find('input').attr('checked',checked);
		});
		
		// function to update the 'color' box in spec list based on a change to color or opacity in spec config
		this.fields['color'].element.change(function(){
			_this.updateColor();
		});
		this.fields['opacity'].element.change(function(){
			_this.updateColor();
		});
		// set random color
		this.fields['color'].setValue(randomColor());
		this.updateColor();

		// show or hide to start (based, ultimately, whether or not there's one showing already, but here it's just based on a flag)
		if(this.selected){
			el.addClass('showing_config');
		}
		else{
			el.addClass('hidden_config');
		}

		return el;

	}

	// returns a plotly-friendly data object
	getPlotlyData(){
		// check here if 'show' is true or not (if not, return null immediately)
		var data = this.getData();
		if(!this.valueOf('show')){return null;}
		return {
			x: data[0],
			y: data[1],
			name: this.valueOf('label'),
			showlegend: !(this.valueOf('label') == ''), // only show in legend if field isn't blank
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
		this.fields['title'] = new Field();
		this.fields['xlabel'] = new Field();
		this.fields['ylabel'] = new Field();
		this.fields['xmin'] = new Field();
		this.fields['xmax'] = new Field();
		this.fields['ymin'] = new Field();
		this.fields['ymax'] = new Field();
		this.fields['show_legend'] = new Field();
		this.fields['show_grid'] = new Field();

	}

	// binds the plotconfig to all of the target tools within a particular div (the given element)
	bindAll(element){
		if(!(element instanceof $)){
			alert('plotConfig bindings failed');
			return;
		}
		// helper function for the rest of this
		function finder(s){
			let e = element.find('[target='+s+']');
			return e;
		}

		this.fields['title'].bindTo(finder('title'));
		this.fields['xlabel'].bindTo(finder('xlabel'));
		this.fields['ylabel'].bindTo(finder('ylabel'));
		this.fields['xmin'].bindTo(finder('xmin'));
		this.fields['xmax'].bindTo(finder('xmax'));
		this.fields['ymin'].bindTo(finder('ymin'));
		this.fields['ymax'].bindTo(finder('ymax'));
		this.fields['show_legend'].bindTo(finder('showlegend'));
		this.fields['show_grid'].bindTo(finder('showgrid'));

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
	constructor(plot_config_target, spec_list_target, spec_config_target, plot_target, preprocesses){
		this.plot_config_target = $('#global_tools');
		this.spec_list_target = $('#spec_list .scrollable');
		this.spec_config_target = spec_config_target;
		this.plot_target = plot_target;
		this.annotations_target = $('#anno_config');
		this.annotations_list_target = $('#anno_list');
		this.annotation_template = $('#example_annotation_tool').clone().attr('id', null);
		this.vl_template = $('#example_vl_tool').clone().attr('id', null);

		this.cur_spec_id = 0; // use this as spec ids as you go, to make sure they're identifiable
		this.cur_annotation_id = 0; // same deal but with vertical lines
		this.plotConfig = new PlotConfig();
		this.specConfigList = [];
		this.vlList = [];
		this.shapesList = [];
		this.annotationsList = [];

		// register preprocesses here to automatically add them to specconfigs
		// the order here matters. this is the order in which, if used, preprocesses will be applied (dictionaries don't necessarily preserve order in js, but for virtually all practical applications they will)
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

	getAnnotations(){
		return this.getElement().layout.annotations;
	}
	getShapes(){
		return this.getElement().layout.shapes;
	}

	getDivData(){
		// plot_target is a jquery object, so we need to pull the native DOM out of it
		return this.plot_target[0].data;
	}
	getDivLayout(){
		return this.plot_target[0].layout;
	}
	getDivXRange(){
		var xr = this.getDivLayout().xaxis.range;
		return xr;
	}
	getDivYRange(){
		var yr = this.getDivLayout().yaxis.range;
		return yr;
	}
	// returns the center of the current plot
	getCenter(){
		let element = this.element;
		let to_ret = {};
		to_ret.x = this.getDivXRange().reduce((a,b) => a+b) / 2.; // take the average of the length-two array <range>
		to_ret.y = this.getDivYRange().reduce((a,b) => a+b) / 2.;
		return to_ret;
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
		if($('#spec_list').find('.selected_row').length){
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

	// adds a spectrum with a given name and data (in the form [wavs, counts])
	addSpec(spec_name, spec_data){
		var _this = this;
		// generate set of preprocesses at defaults
		var pp = [];
		for(var p in this.preprocs){
			pp.push(new this.preprocs[p]);
		}
		var sc = new SpecConfig(this.cur_spec_id, spec_name, spec_data, pp);
		this.cur_spec_id++; // make sure each is unique (assume we never have over 2 gajillion spectra showing simultaneously so no int overflow)
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

	// add a spectrum from a file (for now, just .csv)
	addSpecFromFile(spec_name, file){
		// parse csv, including checking that the domain is in output[0] and ordered low to high
		// parse the data in a filereader (it's async and it's reeeeal ugly)
		let _this = this;
		let wavs, counts;
		let lista = [];
		let listb = [];
		let reader = new FileReader;
		reader.onload = function(){
			// parse into lists
			let data = reader.result.split(/\r|\n/); // this regex is to make sure we don't run into the windows vs mac newline issue
			for(let i = 0; i < data.length; i++){
				try{
					let points = data[i].split(',');
					let to_a = parseFloat(points[0]);
					let to_b = parseFloat(points[1]);
					if(to_a && to_b){
						lista.push(to_a);
						listb.push(to_b);
					}
				}
				catch(err){
					console.log(err);
					console.log('skipped line: '+data[i]);
				}
			}
			// find the one that's going up or down by a consistent amount (assume it's the one where the point in the middle is closest to halfway between the start and end values. there's a very small chance this is wrong. TODO: fix this issue)
			// span is the difference between the first and last values
			let lista_span = lista[lista.length - 1] - lista[0]
			let listb_span = listb[listb.length - 1] - listb[0]
			// mid is the value in the middle
			let lista_mid = lista[lista.length / 2]
			let listb_mid = listb[listb.length / 2]
			// gap is the difference between the mid and half the span
			let lista_gap = Math.abs(lista_mid - (lista[0] + (lista_span/2)));
			let listb_gap = Math.abs(listb_mid - (listb[0] + (listb_span/2)));
			// the smaller gap is the wavenumbers
			if(lista_gap < listb_gap){
				wavs = lista;
				counts = listb;
			}
			else{
				wavs = listb;
				counts = lista;
			}
			// check if wavs (and therefore both) need reversing
			if(wavs[1] < wavs[0]){
				wavs.reverse();
				counts.reverse();
			}
			data = [wavs,counts];

			_this.addSpec(spec_name, data);
		}

		reader.readAsText(file);
	}

	removeSpecByRowId(row_id){
		for(let i = 0; i < this.specConfigList.length; i++){
			if(this.specConfigList[i].getRowId() === row_id){
				let row = this.specConfigList[i];
				let to_ret = {'success':true, 'row_sel':row.getRowSelector(), 'config_sel':row.getConfigSelector()};
				this.specConfigList.splice(i,1);
				this.updatePlot();
				return to_ret;
			}
		}
		return {'success':false};
	}

	/*
	generateAnnotationHtml(anno){
		let el = this.annotation_template.clone().attr('id', 'annotation_'+anno.id);
		// hide any other showing annotation(s)
		$('.showing_annotation_tool').removeClass('showing_annotation_tool');
		this.bindAnnotation(anno, el);
		el.addClass('showing_annotation_tool');
		return el;
	}
	*/

	// create a new text annotation in the middle of the plot
	// things like font size and color are there as explicit defaults to fill in fields in selected_annotation
	addTextAnnotation(){
		// put it in the middle
		let center = this.getCenter();
		let to_an = {
			id: this.cur_annotation_id,
			x: center.x,
			y: center.y,
			text: 'text annotation',
			showarrow: false,
			opacity: 1.,
			font: {
				color: '#ff0000',
				size: 15
			}
		};
		this.cur_annotation_id ++;
		Plotly.relayout(this.getElement(), {'annotations[0]': to_an});
		this.refreshAnnotationMarkup();
		this.annotations_list_target.last().click();
	}

	// create a new arrow annotation in the middle of the plot
	addArrowAnnotation(){
		// put the arrowhead in the middle
		let center = this.getCenter();
		let to_an = {
			id: this.cur_annotation_id,
			x: center.x,
			y: center.y,
			text: 'arrow annotation',
			showarrow: true,
			opacity: 1.,
			arrowhead: 1,
			arrowcolor: '#0000ff',
			ax: 40,
			ay: -30,
			font: {
				color: '#0000ff',
				size: 15
			}
		};
		this.cur_annotation_id ++;
		Plotly.relayout(this.getElement(), {'annotations[0]': to_an});
		this.refreshAnnotationMarkup();
		this.annotations_list_target.last().click();
	}

	// vertical lines are shapes that go from 0 to 1 in y (yref: paper) at a particular value of x
	addVertLine(){
		// start in center of the x-range
		let pos = Math.floor(this.getCenter().x * 10) / 10.;	// round to nearest .1
		let to_shape = {
			id: this.cur_annotation_id,
			name: 'Spike ('+pos+')',
			type: 'rect',
			xref: 'x',
			yref: 'paper',
			x0: pos,
			x1: pos,
			y0: 0,
			y1: 1,	// go from bottom to top of plot part of window
			line: {
				color: '#4227ff',
				opacity: 1.,
				width: 1,
			},
		}
		this.cur_annotation_id ++;
		Plotly.relayout(this.getElement(), {'shapes[0]': to_shape});
		this.refreshAnnotationMarkup();
		this.annotations_list_target.last().click();
	}

	// returns the annotation with the given ID or <null> if no annotation exists with that ID
	getAnnotationById(id){
		let anno_list = this.getAnnotations();
		for(let i = 0; i < anno_list.length; i++){
			if(anno_list.id === id){
				return anno_list[i];
			}
		}
		return null;
	}
	getShapeById(id){
		let shape_list = this.getShapes();
		for(let i = 0; i < shape_list.length; i++){
			if(shape_list.id === id){
				return shape_list[i]
			}
		}
		return null;
	}

	// binds annotation <anno> to the annotation settings
	bindAnnotation(anno, target){
		let _this = this;

		// set tools to current values
		target.find('[target=anno_text]').val(anno.text ? anno.text : '');
		target.find('[target=anno_fontsize]').val(anno.font && anno.font.size ? anno.font.size : '');
		target.find('[target=anno_fontcolor]').val(anno.font && anno.font.color ? anno.font.color : '#000000'); // default to black
		target.find('[target=anno_opacity]').val(anno.opacity ? anno.opacity : 1); // default to completely opaque
		
		// update functions trigger a relayout event
		// they're all separate, which ties back to the idea of the plot being the single source of truth

		target.find('[target=anno_text]').change(function(){
			let anno_ind = _this.getAnnotations().map(function(e){return e.id;}).indexOf(anno.id);
			let anno_str = 'annotations['+anno_ind+']';
			let anno_key = anno_str + '.text';
			let update = {};
			update[anno_key] = $(this).val();	// dear future reader: $(this) is a jquery selector based on the target.find function at the beginning of this loop. _this refers to the plothandler object. I'm so, so sorry
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=anno_fontsize]').change(function(){
			let anno_ind = _this.getAnnotations().map(function(e){return e.id;}).indexOf(anno.id);
			let anno_str = 'annotations['+anno_ind+']';
			let anno_key = anno_str + '.font.size';
			let update = {};
			update[anno_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=anno_fontcolor]').change(function(){
			let anno_ind = _this.getAnnotations().map(function(e){return e.id;}).indexOf(anno.id);
			let anno_str = 'annotations['+anno_ind+']';
			let font_anno_key = anno_str + '.font.color';
			let arrow_anno_key = anno_str + '.arrowcolor';
			let update = {};
			update[font_anno_key] = $(this).val();
			update[arrow_anno_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=anno_opacity]').change(function(){
			let anno_ind = _this.getAnnotations().map(function(e){return e.id;}).indexOf(anno.id);
			let anno_str = 'annotations['+anno_ind+']';
			let anno_key = anno_str + '.opacity';
			let update = {};
			update[anno_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		// this never deletes the example annotation because it never binds to it
		target.find('[target=anno_remove]').click(function(){
			let anno_ind = _this.getAnnotations().map(function(e){return e.id;}).indexOf(anno.id);
			let anno_str = 'annotations['+anno_ind+']';
			let anno_key = anno_str;
			let update = {};
			update[anno_key] = null;
			Plotly.relayout(_this.getElement(), update);
			_this.refreshAnnotationMarkup();
		});

		return target;

	}

	// checks whether a vertical line still has the default name (Spike (<pos>))
	hasDefaultName(vl){
		return vl.name.search(/Spike \(\d+\.?\d*\)/) != -1;
	}

	// binds annotation <anno> to the annotation settings
	// all of these updates are taking changes to the <input> divs and pushing them into the plot
	bindVL(vl, target){
		let _this = this;

		// set tools to current values
		target.find('[target=vl_name]').val(vl.name ? vl.name : 'Spike ('+vl.x0+')');
		target.find('[target=vl_pos]').val(vl.x0 && vl.x0 ? vl.x0 : '');
		target.find('[target=vl_width]').val(vl.line.width ? vl.line.width : '')
		target.find('[target=vl_color]').val(vl.line.color && vl.line.color ? vl.line.color : '#000000'); // default to black
		target.find('[target=vl_opacity]').val(vl.line.opacity ? vl.line.opacity : 1); // default to completely opaque
		
		// update functions trigger a relayout event
		// they're all separate, which ties back to the idea of the plot being the single source of truth

		target.find('[target=vl_name]').change(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let shp_key = shp_str + '.name';
			let update = {};
			update[shp_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=vl_pos]').change(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let lo_key = shp_str + '.x0';
			let hi_key = shp_str + '.x1';
			let name_key = shp_str + '.name';
			let update = {};
			let need_refresh = false;
			update[lo_key] = $(this).val();
			update[hi_key] = $(this).val();
			// only update name if still the default
			if(_this.hasDefaultName(vl)){
				update[name_key] = 'Spike ('+$(this).val()+')';
				need_refresh = true;
			}
			Plotly.relayout(_this.getElement(), update);
			// refresh here if we changed the name
			if(need_refresh){_this.refreshAnnotationMarkup();}
		});

		target.find('[target=vl_width]').change(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let shp_key = shp_str + '.line.width';
			let update = {};
			update[shp_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=vl_color]').change(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let shp_key = shp_str + '.line.color';
			let update = {};
			update[shp_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		target.find('[target=vl_opacity]').change(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let shp_key = shp_str + '.opacity';
			let update = {};
			update[shp_key] = $(this).val();
			Plotly.relayout(_this.getElement(), update);
		});

		// this never deletes the example annotation because it never binds to it
		target.find('[target=vl_remove]').click(function(){
			let shp_ind = _this.getShapes().map(function(e){return e.id;}).indexOf(vl.id);
			let shp_str = 'shapes['+shp_ind+']';
			let shp_key = shp_str;
			let update = {};
			update[shp_key] = null;
			Plotly.relayout(_this.getElement(), update);
			_this.refreshAnnotationMarkup();													// refresh to get rid of this annotation
		});

		return target;

	}

	refreshAnnotationMarkup(){
		// get currently selected id
		let selected_before = this.annotations_list_target.find('.selected_row').attr('id');

		// clear existing annotations markup
		this.annotations_target.html('');
		this.annotations_list_target.html('');

		// add new annotations markup
		let annos = this.getElement().layout.annotations ? this.getElement().layout.annotations : [];
		let shapes = this.getElement().layout.shapes ? this.getElement().layout.shapes : [];
		let last_row = null;
		let rows = [];
		let configs = [];

		// this isn't great, because it lists *all* the annotations and then *all* the shapes, instead of going by add order
		// TODO: change this to order by id
		

		for(let i = 0; i < annos.length; i++){

			// create row and config markup
			let row = $('<div>').addClass('table_row').attr('id', 'anno_row_'+annos[i].id).append($('<div>').addClass('anno_list_text').html(annos[i].text));
			//last_row = row;
			let config = this.bindAnnotation(annos[i], this.annotation_template.clone()).attr('id', 'anno_config_'+annos[i].id);
			
			// connect row to config
			row.click(function(){
				// select row
				$('#anno_list').find('.selected_row').removeClass('selected_row');
				row.addClass('selected_row');
				// select config
				$('.showing_annotation_tool').removeClass('showing_annotation_tool');
				config.addClass('showing_annotation_tool');
			});
			config.find('[target=anno_text]').change(function(){
				row.find('.anno_list_text').html($(this).val());
			});

			// insert into page
			// this.annotations_target.append(config);
			// this.annotations_list_target.append(row);
			rows.push(row);
			configs.push(config);
		}

		// add shapes markup for vertical lines
		for(let i = 0; i < shapes.length; i++){
			// create row and config markup
			let row = $('<div>').addClass('table_row').attr('id', 'anno_row_'+shapes[i].id).append($('<div>').addClass('anno_list_text').html(shapes[i].name));
			//last_row = row;
			let config = this.bindVL(shapes[i], this.vl_template.clone()).attr('id', 'anno_config_'+shapes[i].id);
			
			// connect row to config
			row.click(function(){
				// select row
				$('#anno_list').find('.selected_row').removeClass('selected_row');
				row.addClass('selected_row');
				// select config
				$('.showing_annotation_tool').removeClass('showing_annotation_tool');
				config.addClass('showing_annotation_tool');
			});
			config.find('[target=vl_name]').change(function(){
				row.find('.anno_list_text').html($(this).val());
			});

			// insert into page
			// this.annotations_target.append(config);
			// this.annotations_list_target.append(row);
			rows.push(row);
			configs.push(config);
		}

		// fill in example config if annotations list is empty (and disable everything)
		if(rows.length == 0){
			this.annotations_target.append(this.annotation_template.clone());
		}
		// otherwise, sort and append rows and configs, and click on the last one
		else{
			rows.sort(function(a,b){
				let aa = a.attr('id').split('_');
				let bb = b.attr('id').split('_');
				return aa[aa.length-1] - bb[bb.length-1];
			});
			configs.sort(function(a,b){
				return a.attr('id').split('_')[-1] - b.attr('id').split('_')[-1];
			});
			for(let i in rows){
				this.annotations_list_target.append(rows[i]);
			}
			for(let i in configs){
				this.annotations_target.append(configs[i]);
			}
			$('#'+selected_before).click();
		}
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

		// vertical lines -> list of plotly traces, just like the spectra
		for(var i = 0; i < this.vlList.length; i++){
			var cur_data = this.vlList[i].getPlotly();
			data.push(cur_data);
		}

		// get values for x and y range
		var to_xmin = parseFloat(this.plotConfig.valueOf('xmin'));
		var to_xmax = parseFloat(this.plotConfig.valueOf('xmax'));
		var to_ymin = parseFloat(this.plotConfig.valueOf('ymin'));
		var to_ymax = parseFloat(this.plotConfig.valueOf('ymax'));

		// if only one in a pair (xmin vs xmax) is filled in, set other one to current value in plot
		if(!isNaN(to_xmin) && isNaN(to_xmax)){
			to_xmax = this.getDivXRange()[1];
			// also set the html element so the user knows why the plot is behaving the way it is
			this.plotConfig.valueOf('xmax', to_xmax.toFixed(1));
		}
		else if(isNaN(to_xmin) && !isNaN(to_xmax)){
			to_xmin = this.getDivXRange()[0];
			this.plotConfig.valueOf('xmin', to_xmin.toFixed(1));
		}
		if(!isNaN(to_ymin) && isNaN(to_ymax)){
			to_ymax = this.getDivYRange()[1];
			this.plotConfig.valueOf('ymax', to_ymax.toFixed(1));
		}
		else if(isNaN(to_ymin) && !isNaN(to_ymax)){
			to_ymin = this.getDivYRange()[0];
			this.plotConfig.valueOf('ymin', to_ymin.toFixed(1));
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
				showgrid: this.plotConfig.valueOf('show_grid'),
				range: [to_xmin, to_xmax]
			},
			yaxis: {
				title: this.plotConfig.valueOf('ylabel'),
				titlefont: {
					size: 20,
					family: "'Helvetica', sans-serif"
				},
				showgrid: this.plotConfig.valueOf('show_grid'),
				range: [to_ymin, to_ymax]
			},
			showlegend: this.plotConfig.valueOf('show_legend'),
			annotations: this.annotationsList,
			shapes: this.shapesList,
		}

		Plotly.newPlot(plot_div, data, layout, {showLink:false, displaylogo:false, editable:true, modeBarButtonsToRemove: ['sendDataToCloud']});

		// hook in a function to update settings on zoom / pan, or annotation(s) change
		
		plot_div.on('plotly_restyle', function(eventdata){
			// an update is going to be a length-two array, with the first item being a dictionary {name: '<name>'} and the second being a list with the index of the spectrum
			// check for name (label) update
			if('name' in eventdata[0]){
				let sc_ind = eventdata[1][0];
				let sc = _this.specConfigList[sc_ind];
				let new_name = eventdata[0]['name'];
				sc.fields['label'].setValue(new_name);
			}
			//debugger;
		});

		plot_div.on('plotly_relayout', function(eventdata){

			// check if this relayout is happening because of a change to an annotation. if so, select it
			let anno_text_regex = /annotations\[.+\]\.text/;
			let vl_pos_regex = /shapes\[.+\]\.x0/;


			for(let k in eventdata){
				// check for text update to push upstream and get anno id to actually click the thing
				if(k.indexOf('annotations[') != -1){
					// only refresh markup if text was changed
					if(k.search(anno_text_regex) != -1){
						_this.refreshAnnotationMarkup();
					}
					let anno_ind = k.split('annotations[')[1].split(']')[0]; // this gets the index of the annotation in the plot-held list
					let id = _this.getAnnotations()[anno_ind].id;
					let target_row = $('#anno_row_'+id);
					target_row.click();
				}
				else if(k.indexOf('shapes[') != -1){
					let shp_ind = k.split('shapes[')[1].split(']')[0];
					let shp = _this.getShapes()[shp_ind];
					let id = _this.getShapes()[shp_ind].id;

					// make sure the line goes 0 to 1 (calling a relayout within a relayout feels dirty, but ya gotta do what ya gotta do)
					if(shp.y0 != 0){
						shp.y0 = 0;
						shp.y1 = 1;
						let update = {}
						update['shapes['+shp_ind+'].y0'] = 0;
						update['shapes['+shp_ind+'].y1'] = 1;
						Plotly.relayout(_this.getElement(), update);
					}

					// if the position was changed with a drag, change the name in the config and the row
					if(k.search(vl_pos_regex) != -1){
						// round down to nearest .1
						let pos = Math.floor(shp.x0 * 10) / 10.;
						shp.x0 = pos;
						shp.x1 = pos;
						// if the name follows the default form, it should be changed here. Otherwise, leave it
						if(_this.hasDefaultName(shp)){
							shp.name = 'Spike ('+pos+')';
						}
						_this.refreshAnnotationMarkup();
					}
					let target_row = $('#anno_row_'+id);
					target_row.click();
				}
			}

			// catch relayout events on plot-wide editable fields, like title, xaxis, yaxis, 
			if('title' in eventdata){_this.plot_config_target.find('[target=title]').val(eventdata['title']);}
			if('xaxis.title' in eventdata){_this.plot_config_target.find('[target=xlabel]').val(eventdata['xaxis.title']);}
			if('yaxis.title' in eventdata){_this.plot_config_target.find('[target=ylabel]').val(eventdata['yaxis.title']);}

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
	// TODO: move this to a single on function (see script in index.html)
	addToolListeners(){
		var _this = this;
		$('.tool').change(function(){
			_this.updatePlot();
		});
	}

	initialize(){
		// insert plot configuration html
		this.plotConfig.bindAll($('#global_tools'));

		this.updatePlot();
	}

	dumpToUrl(){
		// get entire plotly plot object and literally just chuck it in a url
		let plot = this.getElement();
		debugger;
	}

}