var config = require('./config'),
	ES = require('elasticsearch');

/**
 * @class ESWrapper
 * @extends ES
 */
class ESwrapper extends ES {
	constructor(index, type) {
		super(config.elastic);

		this.index = index;
		this.type = type;
	}

	/**
	 * Check whether elastic search is running.
	 * 
	 * @return {promise}
	 */
	isRunning () {
		return esClient.ping()
			.catch(function (err) {
				l.error("Unable to connect to elastic at " + config.elastic.host);
			})
			.then(function () {
				l.info("Connected to elastic at: " + config.elastic.host);
			});
	}

	/**
	 * Given an array of objects it returns an array that can be passed into elastic bulk.
	 * 
	 * @param  {array} Array of objects.
	 * @return {array} Bulk query compliant array.
	 */
	static arrayToBulk(array) {
		var batch = [];
		artifacts.forEach(function (array) {
			batch.push({ index: { "_index": this.index, "_type": this.type } });
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
	batchIndex(array) {
		return esClient.bulk({ body: this.arrayToBulk(array) });
	}
}

module.export = ESwrapper;