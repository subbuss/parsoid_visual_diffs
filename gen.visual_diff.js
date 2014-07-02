"use strict";

var resemble = require('resemble').resemble,
	c = require('./node_modules/resemble/node_modules/canvas/lib/canvas.js'),
	fs = require('fs'),
	getopts = require('./getopts.js').getopts;

var customOpts = {
	'indir': {
		description: 'Directory to get screenshots to? (default: ./<wiki>/)',
		'boolean': false,
		'default': null,
	},
	'fileprefix': {
		description: 'Prefix of files to get screenshots from and output diffs to?' +
			'(default:  <title>.parsoid.png, <title>.php.png, <title>.diff.png)',
		'boolean': false,
		'default': null,
	},
};

var opts = getopts(customOpts);
if (opts !== null) {
	var prefix = opts.prefix;
	var indir = (opts.indir || "./" + opts.wiki + "/").replace(/\/$/, '') + "/";
	var phpSS = indir + prefix + ".php.png";
	var psdSS = indir + prefix + ".parsoid.png";

	resemble(phpSS).compareTo(psdSS).
		ignoreAntialiasing(). // <-- muy importante
		onComplete(function(data){
		    // analysis stats
			console.error("STATS: " + JSON.stringify(data));

			// Save the base64 data
			var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
			var png_buffer = new Buffer(png_data, 'base64');
			var png_file = opts.outdir + prefix + ".diff.png";
			fs.writeFileSync(png_file, png_buffer);
		});
}
