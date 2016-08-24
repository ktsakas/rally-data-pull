var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	FormatBase = require('./base');

class SnapshotFormatter extends FormatBase {
	constructor (obj) {
		super(obj);
	}

	hydrateAuthor () {
		return RallyAPI
			.getUserName(this.obj.Author)
			.then((userName) => {				
				this.obj.Author = userName;
			});
	}

	parseDates () {
		if ( new Date(this.obj.Exited).getYear() == 8098 ) {
			this.obj.Exited = null;
		}

		if (this.obj.Story.ID == 59466256565 && this.obj.Exited == null) {
			l.debug("found one: ", this.obj);
		}

		super.parseDates();
	}

	formatSnapshot () {
		var proms = [],
			self = this;

		proms.push( this.format('api') );
		proms.push( this.hydrateAuthor() );
		proms.push( this.parseDates() );

		return Promise
			.all(proms)
			.then(() => self);

	}
}

/*new SnapshotFormatter(testObj.Results[0]).formatSnapshot().then((obj) => {
	// l.debug(obj);
});*/

module.exports = SnapshotFormatter;