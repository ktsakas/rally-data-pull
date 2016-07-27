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

	static renameFields (fieldsObj) {
		for (var newName in translation) {
			var fieldName = translation[newName];

			if ( fieldsObj[fieldName] && fieldName != newName ) {
				fieldsObj[newName] = fieldsObj[fieldName];
				delete fieldsObj[fieldName];
			}
		}

		return fieldsObj;
	}

	static removeUnused (fieldsObj) {
		var usedFields = Object.keys(translation);

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
	static flatten (obj) { return flatten(obj); }

	static unflatten (obj) { return unflatten(obj); }

	/*static translateArtifact (fieldsObj) {
		return Utils.normalizeFieldNames(Utils.removeUnusedFields(fieldsObj));
	}*/
}

testObj = Utils.flatten(testObj);
// l.debug( "flattened obj: ", testObj );

Utils.renameFields(testObj);
// l.debug( "renamed fields: ", testObj );

Utils.removeUnused(testObj);
// l.debug( "removed unused: ", testObj );

testObj = Utils.unflatten(testObj);
// l.debug( "unflattened obj: ", testObj );

module.exports = Utils;