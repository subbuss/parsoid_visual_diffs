var resemble = require('resemble').resemble,
	c = require('./node_modules/resemble/node_modules/canvas/lib/canvas.js'),
	sys = require('sys'),
	exec = require('child_process').exec,
	fs = require('fs'),
	getopts = require('./getopts.js').getopts;

var customOpts = {
	'indir': {
		description: 'Directory to get screenshots to? (default: ./<wiki>/)',
		'boolean': false,
		'default': null,
	},
	'fileprefix': {
		description: 'Prefix of files to get screenshots from and output diffs to?' +
			'(default:  <title>.parsoid.png, <title>.php.png, <title>.diff.png)',
		'boolean': false,
		'default': null,
	},
	'base64': {
		description: 'Path of base64 executable',
		'boolean': false,
		'default': "/usr/bin/base64"
	},
	'tmpdir' : {
		description: 'Tmp dir to write intermediate png data to',
		'boolean': false,
		'default': "/tmp/",
	}
};

var opts = getopts(customOpts);
if (opts !== null) {
	var prefix = opts.prefix;
	var indir = (opts.indir || "./" + opts.wiki + "/").replace(/\/$/, '') + "/";
	var phpSS = indir + prefix + ".php.png";
	var psdSS = indir + prefix + ".parsoid.png";

	resemble(phpSS).compareTo(psdSS).
		ignoreAntialiasing(). // <-- muy importante
		onComplete(function(data){
		    // analysis stats
		    console.error("STATS: " + JSON.stringify(data));

		    // convert png data to a jpeg
		    var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
		    var png_file = opts.tmpdir + prefix + ".diff.png.data";
		    var jpg_file = opts.outdir + prefix + ".diff.jpg";
		    fs.writeFileSync(png_file, png_data, "utf8");
		    function puts(error, stdout, stderr) { sys.puts(stdout); }
		    exec(opts.base64 + " -d < " + png_file + " > " + jpg_file, puts);
		});
}
