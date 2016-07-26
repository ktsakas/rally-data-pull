var Multiprogress = require("multi-progress");
var multi = new Multiprogress(process.stderr);

var fetchBar = multi.newBar('Fetching artifacts      [:bar] :percent ETA: :etas', {
	complete: '=',
	incomplete: ' ',
	total: 40
});

var historyBar = multi.newBar('Fetching change history [:bar] :percent ETA: :etas', {
	complete: '=',
	incomplete: ' ',
	total: 40,
	clear: true
});


var t = 0 ;
setInterval(function () {
	if (t < 5) {
		fetchBar.tick(2);
	} else if (t == 5) {
		fetchBar.terminate();
		console.log("\nFailed!");
	}

	t++;
	historyBar.tick(1);
}, 500);