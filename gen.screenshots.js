"use strict";

var getopts = require('./getopts.js').getopts,
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
	takeScreenshots(opts, function(msg) {
			console.log(msg);
		}, function(err) {
			if (err) {
				console.warn(err);
			} else {
				console.warn("--all done--");
			}
		});
}
