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
		var keepFields = Object.keys(fieldConfig.keep);

		for (var fieldName in fieldsObj) {
			if ( keepFields.indexOf(fieldName) == -1 )
				delete fieldsObj[fieldName];
		}

		return fieldsObj;
	}

	static translateArtifact (fieldsObj) {
		return Utils.normalizeFieldNames(Utils.removeUnusedFields(fieldsObj));
	}
}

module.exports = Utils;