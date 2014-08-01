/**
 * Example configuration for the visual diffing client.
 *
 * Copy this file to config.js and change the values as needed.
 */
"use strict";

if ( typeof module === 'object' ) {
	module.exports = {
		server: {
			// The address of the master HTTP server (for getting titles and posting results) (no protocol)
			host: 'localhost',

			// The port where the server is running
			port: 8002
		},
		opts: {
			parsoidServer: "http://localhost:8000",
			viewportWidth: 1920,
			viewportHeight: 1080,
			dumpParsoidHTML: false,
			wiki: "enwiki",
			title: "Main_Page",
			filePrefix: null,
			outdir: null,
			// resemblejs options
			errorType: "flat",
			// Skip pixels on all images bigger than this dimension on any side
			// Clients don't generate diff images, so better to do it more
			// efficiently.
			largeImageThreshold: 1000
		}
	};
}
