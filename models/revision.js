"use strict";

var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	);

var fs = require('fs'),
	mappings = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
	schema = JSON.parse(fs.readFileSync('config/schema.json', 'utf8'));

const assert = require('assert');

// Create a null valued object of all schema fields
var nulledValues = {};
for (var field in schema) {
	nulledValues[field] = null;
}

class Revision {
	constructor (stateObj, id) {
		if (id) this._id = id;

		this.model = stateObj;
	}

	static createMapping() {
		var mapping = {};

		for (var fieldName in mappings) {
			mapping[fieldName] = {
				type: mappings[fieldName]
			};

			if (mappings[fieldName] == "string") {
				mapping[fieldName].index = "not_analyzed";
			}
		}

		return mapping;
	}

	findLatestRevision() {
		return stateOrm.filter([
			{ term: { "Story.ID": this.model.Story.ID } },
			{ missing: { "field": "Exited" } }
		]).then((result) => {

			return (result.hits.total == 0) ? null :
					new Revision(result.hits.hits[0]);
		});
	}

	hasTrackedFields() {
		var fields = Object.keys(this.model);
		for (var i= 0; i < tracked.length; i++) {
			if ( fields.indexOf(tracked[i]) != -1 ) return true;
		}

		return false;
	}

	getObj() {
		return this.model;
	}

	setDates(exitedDate) {
		this.model.Exited = exitedDate;
		var durationMs = new Date(this.model.Exited).getTime() - new Date(this.model.Entered).getTime();

		this.model.DurationDays = durationMs / 1000 / 60 / 60 / 24;
		this.update();
	}

	update(revisionObj) {
		assert(this._id);

		this.model = revisionObj;
		stateOrm.update(this.model, this._id);
	}

	save() {
		var self = this;

		return self
			.findLatestRevision()
			.then((latestRevision) => {
				if ( self.hasTrackedFields() ) {
					if (latestRevision) latestRevision.setExited(self.model.Entered);

					stateOrm.index(self.model, self._id);
				} else {
					// Latest revision must exist here
					assert(latestRevision);
					assert(latestRevision.hasTrackedFields());

					self.model.Entered = latestRevision.getObj().Entered;
					latestRevision.update(self.model);
				}
			});
	}
}

module.exports = Revision;