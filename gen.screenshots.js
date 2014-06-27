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

			// Hide top header + site byline
			$("h1.firstHeading").hide();
			$("div#siteSub").hide();

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

		  // Add php-style wrapper around parsoid output
		  var div1 = document.createElement("div");
		  div1.setAttribute("class", "mw-body");
		  div1.setAttribute("id", "content");

		  // Migrate content into the div
		  while (content) {
			next = content.nextSibling;
			div1.appendChild(content);
			content = next;
		  }
		  body.appendChild(div1);

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
