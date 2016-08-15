var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	translation = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
	testObj = JSON.parse(fs.readFileSync('trash/test-obj.json', 'utf8'));

var flatten = require('flat'),
	unflatten = flatten.unflatten;

class FormatUtils {
	/*static normalizeFieldNames (fieldsObj) {
		fieldsObj._id = fieldsObj.ObjectUUID;
		delete fieldsObj.ObjectUUID;

		return fieldsObj;
	}*/

	static merge (obj1, obj2) {

	}

	static addDummyData (fieldsObj) {
		var randCustomers = ['Penn', 'Hilton', 'Serai', 'Gondola', 'Transick', 'Beddom'];
		var randRegion = ['North America', 'South America', 'Europe', 'Asia', 'Australia'];

		// Use th Story ID to get consistent data across revisions on the same story
		fieldsObj.Customer = randCustomers[fieldsObj.Story.ID % 6];
		fieldsObj.Region = randRegion[fieldsObj.Story.ID % 5];
	}

	static nullMissingFields (fieldsObj) {
		for (var field in fieldsObj) {
			if ( !fieldsObj[ field ] && tracked.indexOf(field) == -1 ) {
				fieldsObj[ field ] = null;
			}
		}
	}

	static renameFields (fieldsObj, mode) {
		for (var newName in translation) {
			var fieldName = translation[newName][mode];

			if ( typeof fieldsObj[fieldName] != "undefined" && fieldName != newName ) {
				fieldsObj[newName] = fieldsObj[fieldName];
				delete fieldsObj[fieldName];
			}
		}

		return fieldsObj;
	}

	static parseDates (fieldsObj) {
		var Entered = fieldsObj.Entered,
			Exited = fieldsObj.Exited;

		if ( new Date(fieldsObj.Exited).getYear() == 8098 ) {
			fieldsObj.Exited = null;
			fieldsObj.DurationDays = null;
		} else {
			var durationMs =
				new Date(fieldsObj.Exited).getTime() - new Date(fieldsObj.Entered).getTime();

			fieldsObj.DurationDays = durationMs / 1000 / 60 / 60 / 24;
		}
	}

	static removeUnused (fieldsObj) {
		var usedFields = Object.keys(translation);
		// l.debug("used fields: ", usedFields);

		for (var fieldName in fieldsObj) {
			if ( usedFields.indexOf(fieldName) == -1 )
				delete fieldsObj[fieldName];
		}

		return fieldsObj;
	}

	// TODO: implement these to be in place
	static flatten (obj) { return flatten(obj, { safe: true }); }

	static unflatten (obj) { return unflatten(obj); }
}

testObj = FormatUtils.flatten(testObj);
// l.debug( "flattened obj: ", testObj );

FormatUtils.renameFields(testObj, 'api');
// l.debug( "renamed fields: ", testObj );

FormatUtils.removeUnused(testObj);
// l.debug( "removed unused: ", testObj );

FormatUtils.parseDates(testObj);
// l.debug( "parsed custom: ", testObj );


testObj = FormatUtils.unflatten(testObj);
// l.debug( "unflattened obj: ", testObj );
// l.debug( "keys: ", Object.keys(testObj) );

module.exports = FormatUtils;