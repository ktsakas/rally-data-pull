var config = require('../config');

/**
 * @class ESWrapper
 * @extends ES
 */
class ESObject {
	constructor(esClient, index, type) {
		this.esClient = esClient;

		this.index = index;
		this.type = type;
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
		
		array.forEach(function (array) {
			batch.push({ index: { "_index": self.index, "_type": self.type } });
			batch.push(array);
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

	index(obj) {
		return client.index({
			index: this.index,
			type: this.type,
			body: obj
		});
	}
}

module.exports = ESObject;