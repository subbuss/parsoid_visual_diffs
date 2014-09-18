"use strict";

var p = require('phantom'),
    resemble = require('resemble').resemble,
	fs = require('fs');
var yaml = require('libyaml');
var styles = yaml.readFileSync('../styles.yaml')[0];

// Export the differ module
var VisualDiffer = {};
if ( typeof module === 'object' ) {
	module.exports.VisualDiffer = VisualDiffer;
}

VisualDiffer.takeScreenshots = function(opts, logger, cb) {
	var phpServer = opts.phpServer;
	if (!phpServer) {
		cb("Unknown PHP server to generate PHP parser html screenshot");
		return;
	}

	var psdServer = opts.parsoidServer;
	if (!psdServer) {
		cb("Unknown Parsoid server to generate Parsoid parser html screenshot");
		return;
	}

	var wiki = opts.wiki;
	var title = opts.title;
	var outdir = opts.outdir;
	var prefix = opts.prefix;

	var phpDone = false;
	var parsoidDone = false;
	var phpErr = null;
	var parsoidErr = null;
	var browser;

	function testCompletion(browser, cb) {
		if (phpErr || parsoidErr) {
			browser.exit();
			cb(phpErr || parsoidErr);
		}
		if (phpDone && parsoidDone) {
			browser.exit();
			cb();
		}
	}

	// Phantom doesn't like protocols in its proxy ips
	// But, node.js request wants http:// proxies ... so dance around all that.
	var proxy = (process.env.HTTP_PROXY_IP_AND_PORT || "").replace(/^https?:\/\//, '');
	p.create("--proxy=" + proxy, function (ph) {
		browser = ph;

		// PHP output
		ph.createPage(function (page) {
			page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
				logger("PHP viewport set to: " + result.width + "x" + result.height);
			});

			page.set('onConsoleMessage', function(msg) {
				console.log("FROM WEBPAGE: " + msg);
			});

			page.open(phpServer + encodeURIComponent(title), function (status) {
				if (status !== "success") {
					phpErr = "Couldn't open page " + phpServer + title + ". Got result " + status;
					testCompletion(browser, cb);
					return;
				}

				page.evaluate(function(opts) {
					// Open navboxes and other collapsed content
					$("table.collapsible tr").show();
					$(".NavContent").show();

					// Hide toc
					$("div.toc").hide();

					// Hide edit links
					$("span.mw-editsection").hide();

					// Hide catlinks + footer
					$("div.printFooter").hide();
					$("div#catlinks").hide();
					$("div#catlinks+div.visualClear").hide();

					// Hide show/hide buttons
					$("span.collapseButton").hide();
					$("a.NavToggle").hide();

					// Finally remove all chrome, only keep the actual
					// content.
					document.body.innerHTML = $("div#mw-content-text").html();
					document.body.classList.add('mw-body');
					document.body.classList.add('mw-body-content');

					// window.callPhantom('php-dom-ready');

					if (opts.dumpPhpCSS) {
						var elements = document.getElementsByTagName("*"),
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

					if (opts.dumpPhpHTML) {
						var header = document.head.innerHTML.replace(/href="\/\//g, 'href="http://');
						var baseHref = "<base href='" + opts.phpServer + opts.title + "'>\n";
						var styles = opts.dumpPhpCSS ? "<script>" + JSON.stringify(output, null, 4) + "</script>\n" : '';
						return "<!DOCTYPE html>\n<html><head>\n" + baseHref + styles + header + "\n</head>" + document.body.outerHTML;
					} else {
						return "";
					}
				}, function(result) {
					if (result === "REDIRECT") {
						parsoidErr = "Parsoid screenshot is a redirect! No diffs.";
						testCompletion(browser, cb);
						return;
					}

					if (opts.dumpPhpHTML) {
						var prefix = opts.prefix;
						var dir    = (opts.outdir || "./" + opts.wiki + "/").replace(/\/$/, '') + "/";
						fs.writeFileSync(dir + prefix + ".php.html", result);
					}

					page.render(opts.phpScreenShot, function() {
						logger("php done!");
						phpDone = true;
						testCompletion(browser, cb);
					});
				}, opts
				);

			});
		});

		var customCSS = styles[wiki];
		ph.createPage(function (page) {
			page.set('viewportSize', { width: opts.viewportWidth, height: opts.viewportHeight }, function (result) {
				logger("Parsoid viewport set to: " + result.width + "x" + result.height);
			});
			page.open(psdServer + wiki + "/" + encodeURIComponent(title), function (status) {
				if (status !== "success") {
					parsoidErr = "Couldn't open page " + psdServer + wiki + "/" + title + ". Got result " + status;
					testCompletion(browser, cb);
					return;
				}

				page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js", function() {
					page.evaluate(function(opts, customCSS) {
						var body = document.body;
						var content = body.firstChild;
						if (content.nodeName === 'LINK' && content.getAttribute("rel") === "mw:PageProp/redirect") {
							return "REDIRECT";
						} else {
							// Open navboxes
							$("table.collapsible tr").show();
							$("*.NavContent").show();

							// Fix problem with parsoid css to reduce rendering diffs
							$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

							// Work-around for body.mediawiki matches in
							// https://en.wikipedia.org/wiki/MediaWiki:Common.css
							// until those are fixed
							document.body.classList.add('mediawiki');

							if (opts.dumpParsoidHTML) {
								if (opts.dumpParsoidCSS) {
									var elements = document.getElementsByTagName("*"),
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
								var styles = opts.dumpParsoidCSS ? "\n<script>" + JSON.stringify(output, null, 4) + "</script>\n" : '';
								return "<!DOCTYPE html>\n<html><head>\n" + styles + header + "\n</head>" + document.body.outerHTML;
							} else {
								return "";
							}
						}
					}, function(result) {
						if (result === "REDIRECT") {
							parsoidErr = "Parsoid screenshot is a redirect! No diffs.";
							testCompletion(browser, cb);
							return;
						}

						if (opts.dumpParsoidHTML) {
							var prefix = opts.prefix;
							var dir    = (opts.outdir || "./" + opts.wiki + "/").replace(/\/$/, '') + "/";
							fs.writeFileSync(dir + prefix + ".parsoid.html", result);
						}

						page.render(opts.psdScreenShot, function() {
							logger("parsoid done!");
							parsoidDone = true;
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
				logger("--screenshotting done--");
			}
			if (opts.outputSettings) {
				resemble.outputSettings(opts.outputSettings);
			}
			resemble(opts.phpScreenShot).compareTo(opts.psdScreenShot).
				ignoreAntialiasing(). // <-- muy importante
				onComplete(function(data){
					cb(null, data);
				});
		}
	});
};
