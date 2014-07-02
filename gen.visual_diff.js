var resemble = require('resemble').resemble,
	c = require('./node_modules/resemble/node_modules/canvas/lib/canvas.js'),
	sys = require('sys'),
	exec = require('child_process').exec,
	fs = require('fs');

var argv   = process.argv;
var prefix = argv.length > 2 ? argv[2] : "Medha_Patkar";

resemble(prefix + ".php.png").compareTo(prefix + ".parsoid.png").
	ignoreAntialiasing(). // <-- muy importante
	onComplete(function(data){
	  // analysis stats
	  console.error("STATS: " + JSON.stringify(data));

	  // convert png data to a jpeg
	  var png_data = data.getImageDataUrl("").replace(/^data:image\/png;base64,/, '');
	  var png_file = "/tmp/" + prefix + ".diff.png.data";
	  var jpg_file = prefix + ".diff.jpg";
	  fs.writeFileSync(png_file, png_data, "utf8");
	  function puts(error, stdout, stderr) { sys.puts(stdout); }
	  exec("/usr/bin/base64 -d < " + png_file + " > " + jpg_file, puts);
	});
