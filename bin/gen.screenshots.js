"use strict";

var Util = require('../lib/differ.utils.js').Util,
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
	'dumpParsoidHTML': {
		description: "Dump Parsoid HTML after wrappers have been adjusted",
		'boolean': true,
		'default': false
	},
};

var opts = Util.getopts(customOpts);
if (opts !== null) {
	Differ.takeScreenshots(opts, function(msg) {
			console.log(msg);
		}, function(err) {
			if (err) {
				console.warn(err);
			} else {
				console.warn("--all done--");
			}
		});
}
