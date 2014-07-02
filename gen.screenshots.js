"use strict";

var getopts = require('./getopts.js').getopts,
	takeScreenshots = require('./screenshots.js').takeScreenshots;

var opts = getopts();
if (opts !== null) {
	takeScreenshots(opts, function() {
		console.warn("--all done--");
	});
}
