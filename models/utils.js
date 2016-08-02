var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	translation = JSON.parse(fs.readFileSync('config/state-fields.json', 'utf8')).translation,
	testObj = JSON.parse(fs.readFileSync('trash/test-obj.json', 'utf8'));

var flatten = require('flat'),
	unflatten = flatten.unflatten;

class Utils {
	/*static normalizeFieldNames (fieldsObj) {
		fieldsObj._id = fieldsObj.ObjectUUID;
		delete fieldsObj.ObjectUUID;

		return fieldsObj;
	}*/

	static merge (obj1, obj2) {

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

	static parseCustomFields (fieldsObj) {
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

	static getKeptFields (fieldsObj) {
		var keepFields = Object.keys(translation),
			keptFields = {};

		for (var fieldName in fieldsObj) {
			if ( keepFields.indexOf(fieldName) != -1 )
				keptFields[fieldName] = fieldsObj[fieldName];
		}

		return keptFields;
	}

	// TODO: implement these to be in place
	static flatten (obj) { return flatten(obj, { safe: true }); }

	static unflatten (obj) { return unflatten(obj); }

	/*static translateArtifact (fieldsObj) {
		return Utils.normalizeFieldNames(Utils.removeUnusedFields(fieldsObj));
	}*/
}

testObj = Utils.flatten(testObj);
// l.debug( "flattened obj: ", testObj );

Utils.renameFields(testObj, 'api');
// l.debug( "renamed fields: ", testObj );

Utils.removeUnused(testObj);
// l.debug( "removed unused: ", testObj );

Utils.parseCustomFields(testObj);
// l.debug( "parsed custom: ", testObj );


testObj = Utils.unflatten(testObj);
// l.debug( "unflattened obj: ", testObj );
// l.debug( "keys: ", Object.keys(testObj) );

module.exports = Utils;