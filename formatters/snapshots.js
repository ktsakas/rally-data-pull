var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	SnapshotFormatter = require('./snapshot');

class SnapshotsFormatter {
	constructor (obj) {
		this.obj = obj;
	}

	addFormattedID (formattedID) {
		this.obj.forEach((snapshot, i) => {
			this.obj[i].FormattedID = formattedID;
		});

		return this;
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

		return Promise.all(proms).then(() => self.obj);
	}
}

new SnapshotsFormatter(testObj.Results).formatSnapshots().then((obj) => {
	// l.debug(obj);
});

module.exports = SnapshotsFormatter;