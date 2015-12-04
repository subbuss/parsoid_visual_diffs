'use strict';

var phantom = require('phantom');
var resemble = require('resemble').resemble;
var fs = require('fs');
var yaml = require('libyaml');
var Util = require('./differ.utils.js').Util;
var child_process = require('child_process');

// Export the differ module
var VisualDiffer = {};
if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}

function testCompletion(browser, cb, opts) {
	var html1 = opts.html1;
	var html2 = opts.html2;
	if (html1.err || html2.err) {
		browser.exit();
		cb(html1.err || html2.err);
	} else if (html1.done && html2.done) {
		browser.exit();
		cb();
	} else {
		cb();
	}
}

VisualDiffer.takeScreenShot = function(browser, logger, cb, opts, htmlOpts) {
	// Read custom CSS for this screenshot, if provided.
	if (htmlOpts.stylesYamlFile) {
		var customStyles = yaml.readFileSync(htmlOpts.stylesYamlFile)[0];
		htmlOpts.customCSS = customStyles[opts.wiki];
	}

	opts.scriptDir = __dirname;
	browser.createPage(function (page) {
		page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
			//logger(htmlOpts.name + ' viewport set to: ' + result.width + 'x' + result.height);
		});

		page.set('onConsoleMessage', function(msg) {
			console.log('console-log-from-' + htmlOpts.name + ':' + msg);
		});

		page.open(htmlOpts.url, function (status) {
			if (status !== 'success') {
				htmlOpts.err = 'Could not open page ' + htmlOpts.url + '. Got result ' + status;
				testCompletion(browser, cb, opts);
				return;
			}

			var processPage = function() {
				page.evaluate(function() {
					// Fallback if nothing to inject or injection fails
					window.postprocessDOM = function() {};
					window.dumpHTML = function() { return ''; };
				});

				// HTML & CSS dumper script
				page.injectJs(opts.scriptDir + '/dumper.js');
				// DOM post-processing script
				if (htmlOpts.postprocessorScript) {
					page.injectJs(htmlOpts.postprocessorScript);
				}

				// In the page context, run the above scripts
				// and save the screenshot
				page.evaluate(
					function(opts, htmlOpts) {
						var ret = postprocessDOM(htmlOpts.customCSS);
						if (ret) {
							return ret;
						}
						return dumpHTML(htmlOpts);
					}, function(result) {
						if (result === 'REDIRECT') {
							htmlOpts.err = htmlOpts.name + ' screenshot is a redirect! No diffs.';
							testCompletion(browser, cb, opts);
							return;
						}

						if (htmlOpts.dumpHTML) {
							var prefix = opts.filePrefix;
							var dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
							fs.writeFileSync(dir + prefix + '.' + htmlOpts.name + '.html', result);
						}

						// Save the screenshot
						console.log("Rendering", htmlOpts.screenShot);
						page.render(htmlOpts.screenShot, function() {
							logger(htmlOpts.name + ' done!');
							htmlOpts.done = true;
							testCompletion(browser, cb, opts);
						});
					},
					opts,
					htmlOpts
				);
			};

			setTimeout(
				function() {
					if (htmlOpts.injectJQuery) {
						page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', processPage);
					} else {
						processPage();
					}
				},
				opts.screenShotDelay
			);

		});
	});
};

VisualDiffer.takeScreenshots = function(opts, logger, cb) {
	var html1 = opts.html1;
	html1.err = null;
	html1.done = false;
	if (!html1.url) {
		cb('Missing page url for ' + html1.name);
		return;
	}

	var html2 = opts.html2;
	html2.err = null;
	html2.done = false;
	if (!html2.url) {
		cb('Missing page url for ' + html2.name);
		return;
	}

	var self = this;

	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_IP_AND_PORT || '').replace(/^https?:\/\//, '');
	phantom.create('--debug=true', '--ssl-protocol=TLSv1', '--proxy=' + proxy, function (browser) {
		function ss1(cb1) {
			// HTML1 screenshot
			self.takeScreenShot(browser, logger, cb1, opts, opts.html1);
		}

		function ss2() {
			// HTML2 screenshot
			self.takeScreenShot(browser, logger, cb, opts, opts.html2);
		}
		ss1(ss2);
	});
};

VisualDiffer.genVisualDiff = function(opts, logger, cb) {
	this.takeScreenshots(opts, logger, function(err) {
		if (err) {
			logger(err);
			cb(err, null);
		} else {
			if (logger) {
				logger('--screenshotting done--');
			}
			if (opts.diffEngine == "uprightdiff") {
				VisualDiffer.compareWithUprightDiff(opts, logger, cb);
			} else {
				VisualDiffer.compareWithResemble(opts, logger, cb);
			}
		}
	});
};

VisualDiffer.compareWithResemble = function(opts, logger, cb) {
	if (opts.outputSettings) {
		resemble.outputSettings(opts.outputSettings);
	}


	resemble(opts.html1.screenShot).compareTo(opts.html2.screenShot).
		ignoreAntialiasing(). // <-- muy importante
		onComplete(function(data){
			var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
			var png_buffer = new Buffer(png_data, 'base64');
			fs.writeFileSync(opts.diffFile, png_buffer);
			cb(null, data);
		});
};

VisualDiffer.compareWithUprightDiff = function(opts, logger, cb) {
	child_process.execFile('/usr/local/bin/uprightdiff',
		[
			'--format=json',
			opts.html1.screenShot, opts.html2.screenShot, opts.diffFile
		],
		function (error, stdout, stderr) {
			if (error && error.code !== 0) {
				error.stderr = stderr;
				logger("UprightDiff exited with error: " + JSON.stringify(error));
				cb(error, null);
			} else {
				cb(null, JSON.parse(stdout));
			}
		}
	);
};
