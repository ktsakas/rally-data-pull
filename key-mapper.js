var flatten = require('flat'),
	unflatten = flatten.unflatten;

var obj, mapTable = {};

/**
 * @class KeyMapper
 */
class KeyMapper {
	/**
	 * Constructs a key mapper based using the mapTable given.
	 * <pre>
	 * Example map table:
	 * {
	 *	 "_type": "type"
	 *	 "test.try": "tryTest"
	 *	 "Name": true  // this will simply retain the same key (does not remove it)
	 * }
	 * That would map _type to type and test.try (nested) to tryTest.
	 * </pre>
	 * 
	 * @param  {object} The table that determines how to map keys.
	 */
	constructor(mapTbl) {
		mapTable = mapTbl;
	}

	/**
	 * Maps keys in the object based on the map table.
	 * If the map value is set to true it simply retains the same key.
	 * 
	 * @param  {object}
	 * @return {object}
	 */
	mapKeys (obj) {
		Object.keys(mapTable).map(function (fromKey) {
			var toKey = mapTable[fromKey];
			if (typeof toKey != "string") return;

			obj[toKey] = obj[fromKey];
			delete obj[fromKey];
		});

		return obj;
	}

	/**
	 * Removes any keys in the object that are not in mapTable.
	 * 
	 * @param  {object}
	 * @return {object}
	 */
	removeUnmapped (obj) {
		Object.keys(obj).map(function (key) {
			if ( !mapTable[key] ) delete obj[key];
		});

		return obj;
	}

	/**
	 * Maps keys of an object based on the map table and removes keys not in the map table.
	 * Works with nested objects by flattening and unflattening the object.
	 * 
	 * @param  {object}
	 * @return {object}
	 */
	translate (obj) {
		return unflatten(this.mapKeys(this.removeUnmapped(flatten(obj))));
	}
}

module.exports = KeyMapper;