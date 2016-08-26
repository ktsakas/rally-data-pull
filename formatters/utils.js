var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	mappings = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
	testObj = JSON.parse(fs.readFileSync('trash/test-obj.json', 'utf8'));

const assert = require('assert');

var flatten = require('flat'),
	unflatten = flatten.unflatten;

class FormatUtils {

	static removeUnused (obj) {
		var usedFields = Object.keys(mappings);
		// l.debug("used fields: ", usedFields);

		for (var fieldName in obj) {
			if ( usedFields.indexOf(fieldName) == -1 )
				delete obj[fieldName];
		}

		return obj;
	}

	static renameFields (obj, mode) {
		assert(mode, "Missing mode argument.");

		for (var newName in mappings) {
			var fieldName = mappings[newName][mode];

			if ( typeof obj[fieldName] != "undefined" && fieldName != newName ) {
				obj[newName] = obj[fieldName];
				delete obj[fieldName];
			}
		}

		return obj;
	}

	static nullMissingFields (obj) {
		for (var field in obj) {
			if ( typeof obj[ field ] == "undefined" && tracked.indexOf(field) == -1 ) {
				obj[ field ] = null;
			}
		}

		return obj;
	}

	// TODO: implement these to be in place
	static flatten (obj) {
		return flatten(obj, { safe: true });
	}

	static unflatten (obj) {
		return unflatten(obj);
	}

	static format (obj, mode) {
		obj = FormatUtils.flatten(obj);
		obj = FormatUtils.renameFields(obj, mode);
		obj = FormatUtils.removeUnused(obj);
		obj = FormatUtils.nullMissingFields(obj);
		obj = FormatUtils.unflatten(obj);

		return obj;
	}

};

module.exports = FormatUtils;