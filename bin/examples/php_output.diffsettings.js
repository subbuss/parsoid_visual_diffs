module.exports = {
  html1: {
    name: 'php1',
    postprocessorScript: '../../lib/php_parser.postprocess.js',
    injectJQuery: false,
    // server:
    //
    // If you are pointing to a production wikipedia:
    //
    // computeURL: function(server, wiki, title) {
    //    var U = require('../../lib/differ.utils.js').Util;
    //    return U.getWikiBaseURL(wiki) + encodeURIComponent(title);
    // }
  },
  html2: {
    name: 'php2',
    postprocessorScript: '../../lib/php_parser.postprocess.js',
    injectJQuery: false,
    // server:
  },
};
