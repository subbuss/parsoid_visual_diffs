/**
 * Example configuration for the visual diffing client.
 *
 * Copy this file to config.js and change the values as needed.
 */
'use strict';

if ( typeof module === 'object' ) {
	module.exports = {
		server: {
			// The address of the master HTTP server (for getting titles and posting results) (no protocol)
			host: 'localhost',

			// The port where the server is running
			port: 8002
		},
		opts: {
			viewportWidth: 1920,
			viewportHeight: 1080,

			wiki: 'enwiki',
			title: 'Main_Page',
			filePrefix: null,
			outdir: null,

			html1: {
				name: 'php',
				dumpHTML: false,
				postprocessorScript: '../lib/php_parser.postprocess.js',
				injectJQuery: false,
			},
			// HTML2 generator options
			html2: {
				name: 'parsoid',
				server: 'http://localhost:8000',
				dumpHTML: false,
				postprocessorScript: '../lib/parsoid.postprocess.js',
				stylesYamlFile: '../lib/parsoid.custom_styles.yaml',
				injectJQuery: true,
			},
			// resemblejs options
			outputSettings: {
				errorType: 'flat',
				largeImageThreshold: 1000,
			},
		}
	};
}
