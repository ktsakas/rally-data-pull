"use strict";

var config = require('../config/config'),
	l = config.logger,
	Promise = require('bluebird');

/**
 * @class ESWrapper
 * @extends ES
 */
class ElasticOrm {
	constructor(esClient, index, type) {
		if (!esClient || !index) {
			l.error("Missing required argument in ElasticOrm constructor.");
		}

		this.esClient = esClient;

		this._index = index;
		this._type = type || null;
	}

	setType(type) {
		this._type = type;

		return this;
	}

	/**
	 * Given an array of objects it returns an array that can be passed into elastic bulk.
	 * 
	 * @param  {array} Array of objects.
	 * @return {array} Bulk query compliant array.
	 */
	arrayToBulk(array) {
		var self = this,
			batch = [];
		
		array.forEach(function (item) {
			batch.push({ index: {
				_index: self._index,
				_type: self._type,
				_id: item._id
			}});

			batch.push(item);
		});

		return batch;
	}

	/**
	 * Given an array of objects performs a bulk index operation on elastic.
	 * 
	 * @param  {array} Array of objects.
	 * @return {promise}
	 */
	bulkIndex(array) {
		return this.esClient.bulk({ body: this.arrayToBulk(array) });
	}

	putMappings(mappings) {
		var proms = [];

		for (var type in mappings) {
			var mapping = mappings[type],
				p = this.esClient.indices.putMapping({
					index: this._index,
					type: type,
					body: mapping
				});

			proms.push(p);
		}

		return Promise.all(proms);
	}

	putSettings(settings) {
		var self = this;

		return this.esClient.indices
			.close({
				index: this._index
			})
			.then((res) => {
				return self.esClient.indices.putSettings({
					index: self._index,
					body: settings
				}).then(() => {
					return self.esClient.indices.open({
						index: this._index
					});
				});
			});
	}

	putMapping(mapping) {
		return this.esClient.indices.putMapping({
			index: this._index,
			type: this._type,
			body: mapping
		});
	}

	getById(id) {
		return this.esClient.get({
			index: this._index,
			type: this._type,
			id: id
		});
	}

	create(obj, id) {
		var params = {
			index: this._index,
			type: this._type,
			body: obj
		};

		// The id is optional
		if (id) params.id = id;

		return this.esClient.create(params);
	}

	deleteIndex() {
		return this.esClient.indices.delete({
			index: this._index
		});
	}

	existsIndex() {
		var params = {
			index: this._index
		};

		return this.esClient.indices.exists(params);
	}

	createIndex(obj) {
		var params = {
			index: this._index,
			type: this._type,
			body: obj
		};

		return this.esClient.indices.create(params);
	}

	index(obj, id) {
		var params = {
			index: this._index,
			type: this._type,
			body: obj
		};

		// The id is optional
		if (id) params.id = id;

		return this.esClient.index(params);
	}

	update(partialObj, id) {
		var params = {
			index: this._index,
			type: this._type,
			body: { doc: partialObj }
		};

		// The id is optional
		if (id) params.id = id;

		return this.esClient.update(params);
	}

	count(query) {
		var params = {
			index: this._index,
			type: this._type,
			body: {
				query: {
					bool: {
						filter: query
					}
				}
			}
		};

		return this.esClient.count(params);
	}

	filter(query) {
		var params = {
			index: this._index,
			type: this._type,
			body: {
				query: {
					bool: {
						filter: query
					}
				}
			}
		};

		return this.esClient.search(params).then((res) => {
			l.debug("search res: ", res);
			return res;
		});
	}

	typeExists(type) {
		var params = {
			index: this._index,
			type: type,
			body: {}
		};

		return this.esClient.exists(params);
	}
}

module.exports = ElasticOrm;