"use strict";

var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	),
	parseUtils = require('./utils');

var fs = require('fs'),
	mappings = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	mappings = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
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

		Revision.computeStatus(stateObj);

		this.model = stateObj;
	}

	static computeStatus (artifact) {
		if (
			artifact.Project.Name.indexOf("L3") != -1 &&
			artifact.L3KanbanStage != "To Be Scheduled" &&
			artifact.L3KanbanStage != "Verified" &&
			artifact.L3KanbanStage != "Closed") {
			artifact.Status = "Res L3";
		} else if (
			artifact.Project.Name.indexOf("L3") == -1 &&
			artifact.L3KanbanStage != "Verified" &&
			artifact.L3KanbanStage != "Closed"
		) {
			artifact.Status = "Product";
		} else if (
			artifact.L3KanbanStage == "Verified" ||
			artifact.L3KanbanStage == "Closed"
		) {
			artifact.Status = "Resolved";
		} else {
			artifact.Status = null;
		}
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

	static isUpdateHook(hook) {
		if (hook.action == "Created") {
			l.error("Tried to a revision from a newly created story.");

		} else if (hook.action == "Removed") {
			l.error("Unsupported removed action hook.");

		} else if (hook.action == "Updated") {
			return true;

		} else {
			l.error("Unknown hook action.");
		}

		return false;
	}

	static hookGetArtifact(hookObj) {
		var fields = Object.keys(mappings),
			artifactObj = {};

		// console.log("fields: ", fields);
		for (var id in hookObj.state) {
			var state = hookObj.state[id];
			// console.log("name: ", state.name);

			if (fields.indexOf(state.name) != -1) {
				if (typeof state.value == "string")
					artifactObj[state.name] = state.value;
				else if (state.value != null && typeof state.value == "object") 
					artifactObj[state.name] = state.value.name;
			}
		}

		return artifactObj;
	}

	static fromHook(parentID, hookObj) {
		// if (!State.isUpdateHook(hookObj)) return;

		var hookDate = hookObj.transaction.timestamp;
		for (var id in hookObj.changes) {
			var change = hookObj.changes[id];

			// Drop untracked fields
			if ( tracked.indexOf(change.name) == -1 ) continue;

			var stateObj = Object.assign({
					DisplayName: change.display_name,
					Value: change.value,
					OldValue: change.old_value,
					Entered: new Date(hookDate).toISOString()
				}, State.hookGetArtifact(hookObj)),

				state = new State(stateObj, change.name);

			console.log("ITEM: ", State.hookGetArtifact(hookObj));

			return state;
		}
	}

	static findByArtifactID(id) {
		return stateOrm.setType(this._id).filter([
			{ term: { ObjectUUID: id } }
		]).then((stateObj) => {
			console.log(stateObj.hits.hits);

			return new State(stateObj);
		});
	}

	getObj() {
		return this.model;
	}

	save() {
		return stateOrm.setType(this._type).index(this.model);
	}
}

module.exports = Revision;