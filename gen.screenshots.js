var p = require('phantom'),
    resemble = require('resemble').resemble;

var phpDone = false;
var parsoidDone = false;
var browser;

p.create(function (ph) {
  browser = ph;

  // PHP output
  ph.createPage(function (page) {
	page.set('viewportSize', { width: 1920, height: 1080 }, function (result) {
	  console.log("Viewport set to: " + result.width + "x" + result.height);
	});
    page.open("https://en.wikipedia.org/wiki/Medha_Patkar", function (status) {
	  page.includeJs("http://ajax.googleapis.com/ajax/libs/jquery/1.6.1/jquery.min.js", function() {
	    page.evaluate(function() {
			// Hide navigation
			$("div#mw-page-base").hide();
			$("div#mw-head-base").hide();
			$("div#mw-navigation").hide();
			$("div#footer").hide();

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

			// Hide catlinks
			$("div#catlinks").hide();

			// Open navboxes
			$("table.collapsible tr").show();
		});
	    page.render("mp.php.png", function() {
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
    page.open("http://parsoid-lb.eqiad.wikimedia.org/enwiki/Medha_Patkar?oldid=614077263", function (status) {
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
		});

	    page.render("mp.parsoid.png", function() {
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
