var resemble = require('resemble').resemble,
	c = require('./node_modules/resemble/node_modules/canvas/lib/canvas.js');

resemble("mp.php.png").compareTo("mp.parsoid.png").
	ignoreAntialiasing(). // <-- muy importante
	onComplete(function(data){
	  console.error("STATS: " + JSON.stringify(data));
	  console.log(data.getImageDataUrl("").replace(/^data:image\/png;base64,/, ''));
	});
