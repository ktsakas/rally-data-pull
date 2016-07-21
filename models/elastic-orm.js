var config = require('../config/config');

/**
 * @class ESWrapper
 * @extends ES
 */
class ElasticOrm {
	constructor(esClient, index, type) {
		if (!esClient || !index || !type) {
			l.error("Missing required argument in ElasticOrm constructor.");
		}

		this.esClient = esClient;

		this._index = index;
		this._type = type;
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
			batch.push({ index: { _index: self._index, _type: self._type, _id: item._id } });
			delete item._id;
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
}

module.exports = ElasticOrm;