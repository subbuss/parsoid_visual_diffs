var p = require('phantom'),
    resemble = require('resemble').resemble,
	yargs = require('yargs');

var phpDone = false;
var parsoidDone = false;
var browser;

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
		description: 'Where to dump output?',
		'boolean': false,
		'default': '.'
	},
	'parsoidServer': {
		description: 'What parsoid server to fetch Parsoid Html from?',
		'boolean': false,
		'default': 'http://localhost:8000/'
	}
};

function checkUnknownArgs(standardOpts, argv, aliases) {
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
}

var opts   = yargs.usage('Usage: node gen.screenshots.js [options]', standardOpts).check(checkUnknownArgs.bind(null, standardOpts));
var argv   = opts.argv;
var title  = argv.title;
var outdir = (argv.outdir || "./").replace(/\/$/, '') + "/";
var prefix = argv.fileprefix || title;
var wiki   = argv.wiki;
var phpServer = wikiBaseUrl[wiki];
var psdServer = argv.parsoidServer;

if (argv.help) {
	opts.showHelp();
	return;
}

p.create(function (ph) {
  browser = ph;

  // PHP output
  ph.createPage(function (page) {
	page.set('viewportSize', { width: 1920, height: 1080 }, function (result) {
	  console.log("Viewport set to: " + result.width + "x" + result.height);
	});
    page.open(phpServer + title, function (status) {
	  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
	    page.evaluate(function() {
			// Open navboxes
			$("table.collapsible tr").show();

			// Hide navigation
			$("div#mw-page-base").hide();
			$("div#mw-head-base").hide();
			$("div#mw-navigation").hide();
			$("div#footer").hide();
			$("div.suggestions").hide();

			// Hide site notice and other anchors
			$("a#top").hide();
			$("div#siteNotice").hide();

			// Hide top header + site byline + other non-display/navigational elts. not present in parsoid output.
			$("h1.firstHeading").hide();
			$("div#siteSub").hide();
			$("div#contentSub").hide();
			$("div#jump-to-nav").hide();

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
		});
	    page.render(outdir + prefix + ".php.png", function() {
			console.warn("php done!");
			phpDone = true;
			if (parsoidDone) {
				browser.exit();
			}
      	});
      });
    });
  });

  ph.createPage(function (page) {
	page.set('viewportSize', { width: 1920, height: 1080 }, function (result) {
	  console.log("Viewport set to: " + result.width + "x" + result.height);
	});
    page.open(psdServer + wiki + "/" + title, function (status) {
	  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
	    page.evaluate(function() {
		  var body = document.body;
		  var content = body.firstChild;

		  // Add php-style wrappers around parsoid output
		  var div1 = document.createElement("div");
		  div1.setAttribute("class", "mw-body");
		  div1.setAttribute("id", "content");

		  var div2 = document.createElement("div");
		  div2.setAttribute("class", "mw-body-content");
		  div2.setAttribute("id", "bodyContent");

		  var div3 = document.createElement("div");
		  div3.setAttribute("class", "mw-content-ltr");
		  div3.setAttribute("id", "mw-content-text");

		  // Migrate content into the div
		  while (content) {
			next = content.nextSibling;
			div3.appendChild(content);
			content = next;
		  }

		  div2.appendChild(div3);
		  div1.appendChild(div2);
		  body.appendChild(div1);

		  // Overwrite parsoid classes with php classes on body
		  body.setAttribute("class", "mediawiki ltr sitedir-ltr");

		  // Open navboxes
		  $("table.collapsible tr").show();

		  // Fix problem with parsoid css to reduce rendering diffs
		  $('<style type="text/css">span.reference {line-height: 1;} sup,sub {line-height:1;}</style>').appendTo('head');
		}
		);

	    page.render(outdir + prefix + ".parsoid.png", function() {
			console.warn("parsoid done!");
			parsoidDone = true;
			if (phpDone) {
				browser.exit();
			}
      	});
      });
    });
  });
});
