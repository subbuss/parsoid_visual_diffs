"use strict";

var yargs = require('yargs');

// The util object that will be exported out
var Util = {};
if (typeof module === "object") {
	module.exports.Util = Util;
}

// This functionality copied from parsoid/lib/mediawiki.ParsoidConfig.js
var wikiBaseUrl = {};
var wikipedias = "en|de|fr|nl|it|pl|es|ru|ja|pt|zh|sv|vi|uk|ca|no|fi|cs|hu|ko|fa|id|tr|ro|ar|sk|eo|da|sr|lt|ms|eu|he|sl|bg|kk|vo|war|hr|hi|et|az|gl|simple|nn|la|th|el|new|roa-rup|oc|sh|ka|mk|tl|ht|pms|te|ta|be-x-old|ceb|br|be|lv|sq|jv|mg|cy|lb|mr|is|bs|yo|an|hy|fy|bpy|lmo|pnb|ml|sw|bn|io|af|gu|zh-yue|ne|nds|ku|ast|ur|scn|su|qu|diq|ba|tt|my|ga|cv|ia|nap|bat-smg|map-bms|wa|kn|als|am|bug|tg|gd|zh-min-nan|yi|vec|hif|sco|roa-tara|os|arz|nah|uz|sah|mn|sa|mzn|pam|hsb|mi|li|ky|si|co|gan|glk|ckb|bo|fo|bar|bcl|ilo|mrj|fiu-vro|nds-nl|tk|vls|se|gv|ps|rue|dv|nrm|pag|koi|pa|rm|km|kv|udm|csb|mhr|fur|mt|wuu|lij|ug|lad|pi|zea|sc|bh|zh-classical|nov|ksh|or|ang|kw|so|nv|xmf|stq|hak|ay|frp|frr|ext|szl|pcd|ie|gag|haw|xal|ln|rw|pdc|pfl|krc|crh|eml|ace|gn|to|ce|kl|arc|myv|dsb|vep|pap|bjn|as|tpi|lbe|wo|mdf|jbo|kab|av|sn|cbk-zam|ty|srn|kbd|lo|ab|lez|mwl|ltg|ig|na|kg|tet|za|kaa|nso|zu|rmy|cu|tn|chr|got|sm|bi|mo|bm|iu|chy|ik|pih|ss|sd|pnt|cdo|ee|ha|ti|bxr|om|ks|ts|ki|ve|sg|rn|dz|cr|lg|ak|tum|fj|st|tw|ch|ny|ff|xh|ng|ii|cho|mh|aa|kj|ho|mus|kr|hz|tyv|min";

wikipedias.split('|').forEach(function(lang) {
	// Wikipedia
	var dbLangPrefix = lang.replace(/-/g, '_');
	wikiBaseUrl[dbLangPrefix + 'wiki'] = 'http://' + lang +
			'.wikipedia.org/wiki/';

	// Wiktionary
	wikiBaseUrl[dbLangPrefix + 'wiktionary'] = 'http://' + lang +
			'.wiktionary.org/wiki/';

	// Wikivoyage, Wikibooks, Wikisource, Wikinews, Wikiquote & Wikiversity
	// all follow the same pattern
	['voyage', 'books', 'source', 'news', 'quote', 'versity']
		.forEach(function(suffix) {
			wikiBaseUrl[dbLangPrefix + 'wiki' + suffix] = 'http://' +
				lang + '.wiki' + suffix + '.org/wiki/';
		});

	wikiBaseUrl["mediawikiwiki"] = 'http://www.mediawiki.org/wiki/';
});

var standardOpts = {
	'help': {
		description: 'Show this help message',
		'boolean': true,
		'default': false,
		alias: 'h'
	},
	'wiki': {
		description: 'Which wiki prefix to use; e.g. "enwiki" for English wikipedia, "eswiki" for Spanish, "mediawikiwiki" for mediawiki.org',
		'boolean': false,
		'default': 'enwiki'
	},
	'title': {
		description: 'Which page title to use?',
		'boolean': false,
		'default': 'Main_Page'
	},
	'fileprefix': {
		description: 'Prefix of files to output screenshots to? (default: <title>.php.png and <title>.parsoid.png)',
		'boolean': false,
		'default': null,
	},
	'outdir': {
		description: 'Where to dump output? (default: ./)',
		'boolean': false,
		'default': null,
	},
	'parsoidServer': {
		description: 'What parsoid server to fetch Parsoid Html from?',
		'boolean': false,
		'default': 'http://localhost:8000/'
	}
};


// Copied from parsoid/lib/mediawiki.Util.js
Util.checkUnknownArgs = function(standardOpts, argv, aliases) {
	var knownArgs = Object.keys(aliases).reduce(function (prev, next) {
		return prev.concat(aliases[next]);
	}, ["_", "$0"].concat(Object.keys(standardOpts).map(function(arg) {
		return arg.split(" ")[0];
	})));

	Object.keys(argv).forEach(function (arg) {
		if ( knownArgs.indexOf(arg) < 0 ) {
			throw "Unknown argument: " + arg;
		}
	});
};

// Copied from parsoid/lib/mediawiki.Util.js
/**
 * @method
 *
 * Update only those properties that are undefined or null in the target.
 *
 * @param {Object} tgt The object to modify.
 * @param {Object} subject The object to extend tgt with. Add more arguments to the function call to chain more extensions.
 * @returns {Object} The modified object.
 */
Util.extendProps = function () {
	function internalExtend(target, obj) {
		var allKeys = [].concat(Object.keys(target),Object.keys(obj));
		for (var i = 0, numKeys = allKeys.length; i < numKeys; i++) {
			var k = allKeys[i];
			if (target[k] === undefined || target[k] === null) {
				target[k] = obj[k];
			}
		}
		return target;
	}

	var n = arguments.length;
	var tgt = arguments[0];
	for (var i = 1; i < n; i++) {
		internalExtend(tgt, arguments[i]);
	}
	return tgt;
};

Util.computeOpts = function(opts) {
	opts.prefix = opts.fileprefix || opts.title;
	opts.outdir = (opts.outdir || ".").replace(/\/$/, '') + "/" + opts.wiki + "/";
	opts.phpServer = wikiBaseUrl[opts.wiki];
	opts.parsoidServer = opts.parsoidServer.replace(/\/$/, '') + "/";
	opts.phpScreenShot = opts.outdir + opts.prefix + ".php.png";
	opts.psdScreenShot = opts.outdir + opts.prefix + ".parsoid.png";
	opts.diffFile = opts.outdir + opts.prefix + ".diff.png";
	return opts;
};

Util.getopts = function(customOpts, defaults) {
	// allow overriding defaults
	Object.keys(defaults || {}).forEach(function(name) {
		if (standardOpts[name]) {
			standardOpts[name]['default'] = defaults[name];
		}
	});

	var allOpts = Util.extendProps(customOpts || {}, standardOpts);

	var usageStr = 'Usage: node ' + process.argv[1] + ' [options]';
	var opts = yargs.usage(usageStr, allOpts).check(Util.checkUnknownArgs.bind(null, allOpts));
	var argv = opts.argv;

	if (argv.help) {
		opts.showHelp();
		return null;
	}

	return Util.computeOpts(argv);
};
