"use strict";

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
		// Ensure dates are in ISO format
		// NOTE: dates sometimes use a different format for different timezones
		if ( this.obj.Iteration ) {
			this.obj.Iteration.StartDate = new Date(this.obj.Iteration.StartDate).toISOString();
			this.obj.Iteration.EndDate = new Date(this.obj.Iteration.EndDate).toISOString();
		}

		if ( this.obj.Release ) {
			this.obj.Release.StartDate = new Date(this.obj.Release.StartDate).toISOString();
			this.obj.Release.ReleaseDate = new Date(this.obj.Release.ReleaseDate).toISOString();
		}

		// Set exited date to NULL if the year is 8098
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