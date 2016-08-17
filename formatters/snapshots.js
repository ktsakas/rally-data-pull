var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	assert = require('assert'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	SnapshotFormatter = require('./snapshot');

class SnapshotsFormatter {
	constructor (obj) {
		assert(obj);
		assert(obj.length);

		this.obj = obj;
	}

	addFormattedID (formattedID) {
		this.obj.forEach((snapshot, i) => {
			this.obj[i].FormattedID = formattedID;
		});

		return this;
	}

	existsCurrentSnapshot() {
		for (var i= 0; i < this.obj.length; i++) {
			if ( !this.obj[i].Exited ) return true;
		}

		l.error("Could not get the latest state for user story.\n");
		l.error(this.obj);
		process.exit(1);
	}

	formatSnapshots () {
		var self = this,
			proms = self.obj.map((snapshot, i) => {
				return new SnapshotFormatter(snapshot)
					.formatSnapshot()
					.then((snapshot) => {
						self.obj[i] = snapshot;
					});
			});

		return Promise.all(proms)
			.then( this.existsCurrentSnapshot.bind(this) )
			.then(() => self.obj);
	}
}

new SnapshotsFormatter(testObj.Results).formatSnapshots().then((obj) => {
	// l.debug(obj);
});

module.exports = SnapshotsFormatter;