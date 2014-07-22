#!/usr/bin/env node
( function () {
"use strict";

var express = require( 'express' ),
	yargs = require( 'yargs' ),
	fs = require('fs'),
	Util = require('../lib/differ.utils.js').Util,
	Differ = require('../lib/differ.js').VisualDiffer;

var defaults = {};

// Command line options
var opts = yargs.usage( 'Usage: $0 [connection parameters]' )
	.options( 'help', {
		'boolean': true,
		'default': false,
		describe: "Show usage information."
	} )
	.options( 'P', {
		alias: 'port',
		describe: 'Port number to use for connection.'
	} );

var argv = opts.argv;

if ( argv.help ) {
	opts.showHelp();
	process.exit( 0 );
}

// Settings file
var settings;
try {
	settings = require('./diffserver.settings.js');
} catch ( e ) {
	console.error("Aborting! Got exception processing diffserver.settings.js: " + e);
	console.error(e.stack);
	return;
}

// Make an app
var app = express.createServer();

// Declare static directory
app.use("/" + settings.outdir, express.static(__dirname + "/" + settings.outdir));

// Add in the bodyParser middleware (because it's pretty standard)
app.use( express.bodyParser() );

// robots.txt: no indexing.
app.get(/^\/robots.txt$/, function ( req, res ) {
	res.end( "User-agent: *\nDisallow: /\n" );
});

app.get(/^\/diff\/([^/]*)\/(.*)/, function(req, res) {
	var wiki = req.params[0],
		title = req.params[1],
		oldId = req.query.oldId,
		logger = settings.quiet ? function(){} : function(msg) { console.log(msg); };

	settings.wiki = wiki;
	settings.title = title;
	settings = Util.computeOpts(settings);
	Differ.genVisualDiff(settings, logger,
		function(err, diffData) {
			if (err) {
				console.error( "ERROR for " + wiki + ':' + title + ': ' + err );
			}

			// Dump diff
			var png_data = diffData.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
			var png_buffer = new Buffer(png_data, 'base64');
			fs.writeFileSync(settings.diffFile, png_buffer);

			// HTML
			var pageTitle = "Visual diff for " + wiki + ":" + title;
			var page = "<html>";
			page += "<head><title>" + pageTitle + "</title></head>";
			page += "<body>";
			page += "<h1>" + pageTitle + "</h1>";
			page += "<ul>";
			page += "<li><a href='/" + settings.phpScreenShot + "'>PHP parser Screenshot</a></li>";
			page += "<li><a href='/" + settings.psdScreenShot + "'>Parsoid Screenshot</a></li>";
			page += "<li><a href='/" + settings.diffFile + "'>Visual Diff</a></li>";
			page += "</ul></body>";
			page += "</html>";

			// Send response
			res.setHeader( 'Content-Type', 'text/html; charset=UTF-8' );
			res.send( page, 200 );
		}
	);
});

// Start the app
app.listen( 8001 );

}() );
