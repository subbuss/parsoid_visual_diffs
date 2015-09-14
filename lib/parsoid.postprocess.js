window.postprocessDOM = function(customCSS) {
	var body = document.body;
	var content = body.firstChild;
	if (content.nodeName === 'LINK' && content.getAttribute('rel') === 'mw:PageProp/redirect') {
		return 'REDIRECT';
	} else {
		// Open navboxes
		$('table.collapsible tr').show();
		$('*.NavContent').show();

		// Fix problem with Parsoid CSS to reduce rendering diffs
		$('<style type="text/css">' + customCSS + '</style>').appendTo('head');

		// Work-around for body.mediawiki matches in
		// https://en.wikipedia.org/wiki/MediaWiki:Common.css
		// until those are fixed
		document.body.classList.add('mediawiki');

		return null;
	}
}
