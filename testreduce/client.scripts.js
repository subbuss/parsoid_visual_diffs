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
			logger('Diffing ' + test.prefix + ':' + test.title);
			Differ.genVisualDiff(opts, logger,
				function(err, diffData) {
					if (err) {
						console.error( 'ERROR for ' + test.prefix + ':' + test.title + ': ' + err );
						reject(err);
					} else {
						resolve(diffData);
					}
				}
			);
		} catch (err) {
			console.error( 'ERROR in ' + test.prefix + ':' + test.title + ': ' + err );
			console.error( 'stack trace: ' + err.stack);
			reject(err);
		}
	});
}

function gitCommitFetch(opts) {
	opts = Util.clone(opts);
	var parsoidServer = Util.computeOpts(opts).html2.server;
	var requestOptions = {
		uri: parsoidServer + '_version',
		proxy: process.env.HTTP_PROXY_IP_AND_PORT || '',
		method: 'GET'
	};

	return new Promise(function(resolve, reject) {
		Util.retryingHTTPRequest(10, requestOptions, function(error, response, body) {
			var err;
			if (error || !response) {
				err = 'Error could not find the current commit from ' + parsoidServer;
				console.log(err);
				reject(err);
			} else if (response.statusCode === 200) {
				try {
					var resp = JSON.parse(body);
					var lastCommit = resp.sha;
					var lastCommitTime = (new Date()).toISOString();
					resolve([lastCommit, lastCommitTime]);
				} catch (e) {
					err = 'Got response: ' + body + ' from ' + requestOptions.uri;
					err = err + '\nError extracing commit SHA from it: ' + e;
					console.log(err);
					reject(err);
				}
			} else {
				err = requestOptions.uri + ' responded with a HTTP status ' + response.statusCode;
				console.log(err);
				reject(err);
			}
		});
	});
}

if (typeof module === 'object') {
	module.exports.gitCommitFetch = gitCommitFetch;
	module.exports.generateVisualDiff = generateVisualDiff;
}
