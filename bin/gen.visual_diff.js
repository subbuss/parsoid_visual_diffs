"use strict";

var fs = require('fs'),
	Util = require('../lib/differ.utils.js').Util,
	Differ = require('../lib/differ.js').VisualDiffer;

var customOpts = {
	'viewportWidth': {
		description: "Viewport width",
		'boolean': false,
		'default': 1920
	},
	'viewportHeight': {
		description: "Viewport height",
		'boolean': false,
		'default': 1080
	},
	'dumpPhpHTML': {
		description: "Dump PHP HTML after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
	'dumpParsoidHTML': {
		description: "Dump Parsoid HTML after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
};

var opts = Util.getopts(customOpts);
if (opts !== null) {
	Differ.genVisualDiff(opts, function(msg) {
		console.log(msg);
	}, function(err, data) {
		if (!err) {
			// analysis stats
			console.error("STATS: " + JSON.stringify(data));

			// Save the base64 data
			var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
			var png_buffer = new Buffer(png_data, 'base64');
			fs.writeFileSync(opts.diffFile, png_buffer);
		}
	});
}
