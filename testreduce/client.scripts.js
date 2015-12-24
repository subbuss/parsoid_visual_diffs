'use strict';

var Util = require('../lib/differ.utils.js').Util;
var Differ = require('../lib/differ.js').VisualDiffer;
var Promise = require('prfun/wrap')(require('babybird'));

function generateVisualDiff(opts, test) {
	return new Promise(function(resolve, reject) {
		try {
			// Make a copy since we are going to modify it
			opts = Util.clone(opts);
			opts.wiki = test.prefix;
			opts.title = test.title;
			opts = Util.computeOpts(opts);

			var logger = opts.quiet ? function(){} : function(msg) { console.log(msg); };
			logger("Diffing " + test.prefix + ":" + test.title);
			Differ.genVisualDiff(opts, logger,
				function(err, diffData) {
					if (err) {
						console.error( "ERROR for " + test.prefix + ':' + test.title + ': ' + err );
						reject(err);
					} else {
						resolve(diffData);
					}
				}
			);
		} catch (err) {
			console.error( "ERROR in " + test.prefix + ':' + test.title + ': ' + err );
			console.error( "stack trace: " + err.stack);
			reject(err);
		}
	});
}

function gitCommitFetch(opts, cb) {
	opts = Util.clone(opts);
	var parsoidServer = Util.computeOpts(opts).html2.server;
	var requestOptions = {
		uri: parsoidServer + "_version",
		proxy: process.env.HTTP_PROXY_IP_AND_PORT || "",
		method: 'GET'
	};
	Util.retryingHTTPRequest(10, requestOptions, function(error, response, body) {
		if (error || !response) {
			console.log("Error couldn't find the current commit from " + parsoidServer);
			cb(null, null);
		} else if (response.statusCode === 200) {
			try {
				var resp = JSON.parse( body );
				var lastCommit = resp.sha;
				var lastCommitTime = (new Date()).toISOString();
				cb(lastCommit, lastCommitTime);
			} catch (e) {
				console.log("Got response: " + body + " from " + requestOptions.uri);
				console.log("Error extracing commit SHA from it: " + e);
				cb(null, null);
			}
		} else {
			console.log(requestOptions.uri + " responded with a HTTP status " + response.statusCode);
			cb(null, null);
		}
	});
}

if ( typeof module === 'object' ) {
	module.exports.gitCommitFetch = gitCommitFetch;
	module.exports.generateVisualDiff = generateVisualDiff;
}
