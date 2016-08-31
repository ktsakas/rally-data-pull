"use strict";

var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	mappings = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8'));

const assert = require('assert');

var flatten = require('flat'),
	unflatten = flatten.unflatten;

/**
 * Formatting utilities.
 */
class FormatUtils {
	/**
	 * Removes all fields that do not exist on mappings.json.
	 * 
	 * @return {object}
	 */
	static removeUnused (obj) {
		var usedFields = Object.keys(mappings);
		// l.debug("used fields: ", usedFields);

		for (var fieldName in obj) {
			if ( usedFields.indexOf(fieldName) == -1 )
				delete obj[fieldName];
		}

		return obj;
	}

	/**
	 * Renames the keys of an object from the api,
	 * based on mappings.json.
	 * 
	 * @return {object}
	 */
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

	/**
	 * Nulls fields that do not have a value.
	 * 
	 * @return {object}
	 */
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

	/**
	 * Flattens a nested object to a single level.
	 * 
	 * @return {object}
	 */
	static unflatten (obj) {
		return unflatten(obj);
	}

	/**
	 * Runs all the format utilities in order on a given object.
	 * 
	 * @param  {object} obj
	 * @param  {string} mode 'api' or 'hook'
	 * @return {object}      resulting object
	 */
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