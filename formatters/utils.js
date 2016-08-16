var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	translation = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
	testObj = JSON.parse(fs.readFileSync('trash/test-obj.json', 'utf8'));

const assert = require('assert');

var flatten = require('flat'),
	unflatten = flatten.unflatten;

class FormatUtils {
	constructor (obj) {
		assert(obj);

		this.obj = obj;
	}

	schemaFormat (mode) {
		assert(mode, "Missing mode argument.");

		this.flatten()
			.renameFields(mode)
			.removeUnused()
			.nullMissingFields()
			.unflatten()
			.addDummyData();

		return this.obj;
	}

	addDummyData () {
		var randCustomers = ['Penn', 'Hilton', 'Serai', 'Gondola', 'Transick', 'Beddom'];
		var randRegion = ['North America', 'South America', 'Europe', 'Asia', 'Australia'];

		// Use th Story ID to get consistent data across revisions on the same story
		this.obj.Customer = randCustomers[this.obj.Story.ID % 6];
		this.obj.Region = randRegion[this.obj.Story.ID % 5];

		return this;
	}

	nullMissingFields () {
		for (var field in this.obj) {
			if ( !this.obj[ field ] && tracked.indexOf(field) == -1 ) {
				this.obj[ field ] = null;
			}
		}

		return this;
	}

	renameFields (mode) {
		assert(mode, "Missing mode argument.");

		for (var newName in translation) {
			var fieldName = translation[newName][mode];

			if ( typeof this.obj[fieldName] != "undefined" && fieldName != newName ) {
				this.obj[newName] = this.obj[fieldName];
				delete this.obj[fieldName];
			}
		}

		return this;
	}

	parseDates () {
		var Entered = this.obj.Entered,
			Exited = this.obj.Exited;

		if ( this.obj.Exited == null ) {
			this.obj.DurationDays = null;
		} else {
			var durationMs =
				new Date(this.obj.Exited).getTime() - new Date(this.obj.Entered).getTime();

			this.obj.DurationDays = durationMs / 1000 / 60 / 60 / 24;
		}

		return this;
	}

	removeUnused () {
		var usedFields = Object.keys(translation);
		// l.debug("used fields: ", usedFields);

		for (var fieldName in this.obj) {
			if ( usedFields.indexOf(fieldName) == -1 )
				delete this.obj[fieldName];
		}

		return this;
	}

	// TODO: implement these to be in place
	flatten (obj) {
		this.obj = flatten(this.obj, { safe: true });

		return this;
	}

	unflatten (obj) {
		this.obj = unflatten(this.obj);

		return this;
	}
}

var formatter = new FormatUtils(testObj);

formatter.flatten(testObj);
// l.debug( "flattened obj: ", testObj );

formatter.renameFields(testObj, 'api');
// l.debug( "renamed fields: ", testObj );

formatter.removeUnused(testObj);
// l.debug( "removed unused: ", testObj );

formatter.parseDates(testObj);
// l.debug( "parsed custom: ", testObj );


testObj = formatter.unflatten(testObj);
// l.debug( "unflattened obj: ", testObj );
// l.debug( "keys: ", Object.keys(testObj) );

module.exports = FormatUtils;