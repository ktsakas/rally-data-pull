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

	addDiscussionCount () {
		var self = this;

		return RallyAPI
			.getDiscussions(self.obj[0].ObjectID)
			.then((discussions) => {
				var totalPosts = 0;

				self.obj.forEach((revision, i) => {
					var exitDate = new Date(revision._ValidTo);

					discussions.forEach((discussion) => {
						var postDate = new Date(discussion.CreationDate);

						if (postDate.getTime() <= exitDate.getTime()) totalPosts++;
					});
					
					self.obj[i].TotalPosts = totalPosts;
				});
			});
	}

	formatSnapshots () {
		var self = this,
			proms = self.obj.map((snapshot, i) => {
				return new SnapshotFormatter(snapshot)
					.formatSnapshot()
					.then((snapshot) => {
						self.obj[i] = snapshot;
						self.addDiscussionCount();
					});
			});

		return Promise.all(proms).then(() => self.obj);
	}
}

new SnapshotsFormatter(testObj.Results).formatSnapshots().then((obj) => {
	// l.debug(obj);
});

module.exports = SnapshotsFormatter;