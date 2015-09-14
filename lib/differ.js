'use strict';

var p = require('phantom');
var resemble = require('resemble').resemble;
var fs = require('fs');
var yaml = require('libyaml');
var Util = require('./differ.utils.js').Util;

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
	}
	if (html1.done && html2.done) {
		browser.exit();
		cb();
	}
}

VisualDiffer.takeScreenShot = function(browser, logger, cb, opts, htmlOpts) {
	// HTML1 rendering
	browser.createPage(function (page) {
		page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
			logger(htmlOpts.name + ' viewport set to: ' + result.width + 'x' + result.height);
		});

		page.set('onConsoleMessage', function(msg) {
			console.log('FROM WEBPAGE: ' + msg);
		});

		page.open(htmlOpts.url, function (status) {
			if (status !== 'success') {
				htmlOpts.err = "Couldn't open page " + htmlOpts.baseHref + '. Got result ' + status;
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
				page.injectJs('./dumper.js');
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

			if (htmlOpts.injectJQuery) {
				page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', processPage);
			} else {
				processPage();
			}
		});
	});
};

VisualDiffer.takeScreenshots = function(opts, logger, cb) {
	var html1 = opts.html1;
	html1.err = null;
	html1.done = false;
	if (!html1.server) {
		cb('Unknown server ' + html1.server + ' for ' + html1.name);
		return;
	}

	var html2 = opts.html2;
	html2.err = null;
	html2.done = false;
	if (!html2.server) {
		cb('Unknown server ' + html2.server + ' for ' + html2.name);
		return;
	}

	var self = this;

	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_IP_AND_PORT || '').replace(/^https?:\/\//, '');
	p.create('--ssl-protocol=TLSv1', '--proxy=' + proxy, function (browser) {
		// HTML1 screenshot
		self.takeScreenShot(browser, logger, cb, opts, opts.html1);

		// Read any (temporary) custom CSS
		var customStyles = yaml.readFileSync(opts.stylesYamlFile || 'styles.yaml')[0];
		opts.html2.customCSS = customStyles[opts.wiki];

		// HTML2 screenshot
		self.takeScreenShot(browser, logger, cb, opts, opts.html2);
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
			if (opts.outputSettings) {
				resemble.outputSettings(opts.outputSettings);
			}
			resemble(opts.html1.screenShot).compareTo(opts.html2.screenShot).
				ignoreAntialiasing(). // <-- muy importante
				onComplete(function(data){
					cb(null, data);
				});
		}
	});
};
