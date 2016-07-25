var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	fieldConfig = JSON.parse(fs.readFileSync('config/artifact-fields.json', 'utf8'));

class Utils {
	static normalizeFieldNames (fieldsObj) {
		fieldsObj._id = fieldsObj.ObjectUUID;
		delete fieldsObj.ObjectUUID;

		return fieldsObj;
	}

	static removeUnusedFields (fieldsObj) {

		for (var fieldName in fieldsObj) {
			if ( fieldConfig.keep.indexOf(fieldName) == -1 )
				delete fieldsObj[fieldName];
		}

		return fieldsObj;
	}

	static translate (fieldsObj) {
		return Utils.normalizeFieldNames(Utils.removeUnusedFields(fieldsObj));
	}
}

module.exports = Utils;