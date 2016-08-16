var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	FormatUtils = require('./base');

class SnapshotFormatter extends FormatUtils {
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

		super.parseDates();
	}

	formatSnapshot () {
		var proms = [],
			self = this;
		
		proms.push( this.format('api') );
		proms.push( this.hydrateAuthor() );

		return Promise
			.all(proms)
			.then(() => self.obj);

	}
}

new SnapshotFormatter(testObj.Results[0]).formatSnapshot().then((obj) => {
	l.debug(obj);
});

module.exports = SnapshotFormatter;