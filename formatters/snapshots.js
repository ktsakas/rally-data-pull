"use strict";

var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	assert = require('assert'),
	// testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	SnapshotFormatter = require('./snapshot'),
	deepAssign = require('deep-assign');

/**
 * Snapshots are all objects as they are fetched from the Lookback API.
 *
 * This formatter converts them to revisions that are stored into Elastic.
 */
class SnapshotsFormatter {
	constructor (obj) {
		assert(obj);
		assert(obj.length);

		this.obj = obj;
	}

	/**
	 * This is used to inject properties from the Rally Webservice API
	 * to the results returned by the Lookback API.
	 * 
	 * @return {object}
	 */
	append (object) {
		this.obj = this.obj.map((snapshot) => deepAssign({}, object, snapshot));
		
		return this;
	}

	/**
	 * Use this to validate that the latest state of a story exists in the revisions.
	 * That means there is a revision, where the Exited date is null.
	 */
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
			proms = this.obj.map((snapshot, i) => {
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

	/**
	 * Call this function to format all snapshots to revisions.
	 * 
	 * @return {promise}
	 */
	getRevisions () {
		return this
			.formatSnapshots()
			.then((snapshots) => {
				var revisions = [];

				this.obj.forEach((snapshot) => {
					var revision = snapshot.obj;

					if ( snapshot.hasTrackedFields() ) {
						// If there is a previous revision update it's exited date
						if (revisions.length > 0) {
							revisions[ revisions.length - 1 ].Exited = revision.Entered;

							var prevRev = revisions[ revisions.length - 1 ],
								msInRevision = new Date(prevRev.Exited).getTime() - new Date(prevRev.Entered).getTime(),
								daysInRevision = msInRevision / 1000 / 60 / 60 / 24;

							revisions[ revisions.length - 1 ].DaysUntilExit = daysInRevision;
							revision.DaysInPreviousRevision = daysInRevision;
						}

						revisions.push(revision);
					} else {
						delete revision.Entered;
						delete revision.Exited;

						revisions[ revisions.length - 1 ] = deepAssign(
							revisions[ revisions.length - 1 ],
							revision
						);
					}
				});

				return revisions;
			});
	}
}

/*new SnapshotsFormatter(testObj.Results).formatSnapshots().then((obj) => {
	// l.debug(obj);
});*/

module.exports = SnapshotsFormatter;