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

	var wiki = opts.wiki;
	var title = opts.title;
	var outdir = opts.outdir;
	var prefix = opts.prefix;

	function testCompletion(browser, cb) {
		if (html1.err || html2.err) {
			browser.exit();
			cb(html1.err || html2.err);
		}
		if (html1.done && html2.done) {
			browser.exit();
			cb();
		}
	}

	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_IP_AND_PORT || '').replace(/^https?:\/\//, '');
	var browser;
	p.create('--ssl-protocol=TLSv1', '--proxy=' + proxy, function (ph) {
		browser = ph;

		// HTML1 rendering
		ph.createPage(function (page) {
			page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
				logger(html1.name + ' viewport set to: ' + result.width + 'x' + result.height);
			});

			page.set('onConsoleMessage', function(msg) {
				console.log('FROM WEBPAGE: ' + msg);
			});

			page.open(html1.url, function (status) {
				if (status !== 'success') {
					html1.err = "Couldn't open page " + html1.baseHref + '. Got result ' + status;
					testCompletion(browser, cb);
					return;
				}

				// Fallback if nothing to inject or injection fails
				page.evaluate(function() {
					window.postprocessDOM = function() {};
				});
				if (html1.postprocessorScript) {
					page.injectJs(html1.postprocessorScript);
				}

				page.evaluate(function(opts) {
					postprocessDOM();
					if (opts.dumpCSS1) {
						var elements = document.getElementsByTagName('*'),
							output = [];
						for (var j = 0; j < elements.length; j++) {
							var i, el = elements[j];

							// skip links and metas
							if (el.nodeName in {'HTML': 1, 'HEAD':1, 'LINK':1, 'META':1, 'BASE':1, 'SCRIPT':1, 'STYLE':1}) {
								continue;
							}

							var style = window.getComputedStyle(el),
								attributes = {};
							for (i = 0; i < style.length; i++) {
								var propertyName = style.item(i);
								if (propertyName.match(/^(display|float|width|height|left|right|top|bottom|background|border|padding|margin|font)/)) {
									attributes[propertyName] = style.getPropertyValue(propertyName);
								}
							}

							output.push({
								id: el.id || 'ELT-' + j,
								className: el.className,
								nodeName: el.nodeName,
								offsetHeight: el.offsetHeight,
								offsetWidth: el.offsetWidth,
								offsetTop: el.offsetTop,
								offsetLeft: el.offsetLeft,
								computedStyle: attributes
							});

							// Sort by element name
							output.sort(function(a,b) { return a.nodeName < b.nodeName; });
						}
					}

					if (opts.dumpHTML1) {
						var header = document.head.innerHTML.replace(/href="\/\//g, 'href="http://');
						var baseHref = "<base href='" + html1.baseHref + "'>\n";
						var styles = opts.dumpCSS1 ? '<script>' + JSON.stringify(output, null, 4) + '</script>\n' : '';
						return '<!DOCTYPE html>\n<html><head>\n' + baseHref + styles + header + '\n</head>' + document.body.outerHTML;
					} else {
						return '';
					}
				}, function(result) {
					if (result === 'REDIRECT') {
						html1.err = html1.name + ' screenshot is a redirect! No diffs.';
						testCompletion(browser, cb);
						return;
					}

					if (opts.dumpHTML1) {
						var prefix = opts.prefix;
						var dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
						fs.writeFileSync(dir + prefix + '.' + html1.name + '.html', result);
					}

					page.render(html1.screenShot, function() {
						logger(html1.name + ' done!');
						html1.done = true;
						testCompletion(browser, cb);
					});
				}, opts
				);
			});
		});

		// Read any (temporary) custom CSS
		var customStyles = yaml.readFileSync(opts.stylesYamlFile || 'styles.yaml')[0];
		var customCSS = customStyles[wiki];
		ph.createPage(function (page) {
			page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
				logger(html2.name + ' viewport set to: ' + result.width + 'x' + result.height);
			});
			page.open(html2.url, function (status) {
				if (status !== 'success') {
					html2.err = "Couldn't open page " + html2.baseHref + '. Got result ' + status;
					testCompletion(browser, cb);
					return;
				}

				page.includeJs('http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', function() {

					// Fallback if nothing to inject or injection fails
					page.evaluate(function() {
						window.postprocessDOM = function() {};
					});
					if (html2.postprocessorScript) {
						page.injectJs(html2.postprocessorScript);
					}
					page.evaluate(function(opts, customCSS) {
						var ret = postprocessDOM(customCSS);
						if (ret) {
							return ret;
						}

						if (opts.dumpHTML2) {
							if (opts.dumpCSS2) {
								var elements = document.getElementsByTagName('*'),
									output = [];
								for (var j = 0; j < elements.length; j++) {
									var i, el = elements[j];

									// skip some things
									if (el.nodeName in {'HTML': 1, 'HEAD':1, 'LINK':1, 'META':1, 'BASE':1, 'SCRIPT':1, 'STYLE':1}) {
										continue;
									}

									var style = window.getComputedStyle(el),
										attributes = {};

									for (i = 0; i < style.length; i++) {
										var propertyName = style.item(i);
										if (propertyName.match(/^(display|float|width|height|left|right|top|bottom|background|border|padding|margin|font)/)) {
											attributes[propertyName] = style.getPropertyValue(propertyName);
										}
									}

									output.push({
										id: el.id || 'ELT-' + j,
										className: el.className,
										nodeName: el.nodeName,
										offsetHeight: el.offsetHeight,
										offsetWidth: el.offsetWidth,
										offsetTop: el.offsetTop,
										offsetLeft: el.offsetLeft,
										computedStyle: attributes
									});

									// Sort by element name
									output.sort(function(a,b) { return a.nodeName < b.nodeName; });
								}
							}

							var header = document.head.innerHTML.replace(/href="\/\//g, 'href="http://');
							var styles = opts.dumpCSS2 ? '\n<script>' + JSON.stringify(output, null, 4) + '</script>\n' : '';
							return '<!DOCTYPE html>\n<html><head>\n' + styles + header + '\n</head>' + document.body.outerHTML;
						} else {
							return '';
						}
					}, function(result) {
						if (result === 'REDIRECT') {
							html2.err = html2.name + ' screenshot is a redirect! No diffs.';
							testCompletion(browser, cb);
							return;
						}

						if (opts.dumpHTML2) {
							var prefix = opts.prefix;
							var dir    = (opts.outdir || './' + opts.wiki + '/').replace(/\/$/, '') + '/';
							fs.writeFileSync(dir + prefix + '.' + html2.name + '.html', result);
						}

						page.render(html2.screenShot, function() {
							logger(html2.name + ' done!');
							html2.done = true;
							testCompletion(browser, cb);
						});
					},
					opts,
					customCSS
					);
				});
			});
		});
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
