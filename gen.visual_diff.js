"use strict";

var resemble = require('resemble').resemble,
	c = require('./node_modules/resemble/node_modules/canvas/lib/canvas.js'),
	fs = require('fs'),
	getopts = require('./getopts.js').getopts,
	takeScreenshots = require('./screenshots.js').takeScreenshots;

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
	'dumpParsoidHTML': {
		description: "Dump Parsoid HTML after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
};

var opts = getopts(customOpts);
if (opts !== null) {
	var prefix = opts.prefix;
	var dir    = (opts.outdir || "./" + opts.wiki + "/").replace(/\/$/, '') + "/";
	var phpSS  = dir + prefix + ".php.png";
	var psdSS  = dir + prefix + ".parsoid.png";

	takeScreenshots(opts, function() {
		console.warn("--screenshotting done--");
		resemble(phpSS).compareTo(psdSS).
			ignoreAntialiasing(). // <-- muy importante
			onComplete(function(data){
				// analysis stats
				console.error("STATS: " + JSON.stringify(data));

				// Save the base64 data
				var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
				var png_buffer = new Buffer(png_data, 'base64');
				var png_file = dir + prefix + ".diff.png";
				fs.writeFileSync(png_file, png_buffer);
			});
	});
}
