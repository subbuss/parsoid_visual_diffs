module.exports = {
  // Production wikipedia PHP parser output
  html1: {
    name: 'php',
    postprocessorScript: '../../lib/php_parser.postprocess.js',
    injectJQuery: false,
  },

  // Production/local-dev Parsoid HTML output
  html2: {
    name: 'parsoid',
    stylesYamlFile: '../../lib/parsoid.custom_styles.yaml',
    postprocessorScript: '../../lib/parsoid.postprocess.js',
    server: 'http://localhost:8000/',
    injectJQuery: true,
    computeURL: function(server, wiki, title) {
        return server + wiki + '/' + encodeURIComponent(title);
    },
  },
};
