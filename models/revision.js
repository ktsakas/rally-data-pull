"use strict";

var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	),
	stateUtils = require('./utils.js');

var fs = require('fs'),
	fieldConfig = JSON.parse(fs.readFileSync('config/state-fields.json', 'utf8'));

class Revision {
	constructor (stateObj, type, id) {
		if (id) this._id = id;
		if (type) this._type = type;

		this.model = stateObj;
	}

	static createMapping() {
		var mapping = {};

		for (var fieldName in fieldConfig.keep) {
			mapping[fieldName] = {
				type: fieldConfig.keep[fieldName]
			};

			if (fieldConfig.keep[fieldName] == "string") {
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
		var fields = Object.keys(fieldConfig.keep),
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
			if ( fieldConfig.track.indexOf(change.name) == -1 ) continue;

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
		console.log("saving model: ", this.model);

		return stateOrm.setType(this._type).index(this.model);
	}
}

class Revisions {
	constructor (statesArr) {
		this.models = statesArr;
	}

	createTypes() {
		this.models.push(type);
	}

	static existsIndex() {
		return stateOrm.existsIndex().catch((err) => {
			console.log(err);
		});
	}

	static deleteIndex() {
		return stateOrm.deleteIndex();
	}

	static parseMapping (schema) {
		schema = schema || fieldConfig.schema;
		var mapping = {};

		for (var fieldName in schema) {
			var field = schema[fieldName];

			if (typeof field == "string") {
				mapping[fieldName] = { type: field };
			} else if (typeof field == "object") {
				mapping[fieldName] = {
					type: "object",
					properties: Revisions.parseMapping(field)
				};
			}

			if (field == "string") {
				mapping[fieldName].index = "not_analyzed";
			}
		}

		return mapping;
	}

	static createMapping (schema) {
		var map = Revisions.parseMapping(fieldConfig.schema);

		return stateOrm.putMapping({
				properties: map
			})
			.catch((err) => {
				l.error("Failed to create mapping for revision.");
				l.error(err);
			});
	}

	appendArtifactStates(artifactObj) {
		var fields = stateUtils.removeUnusedFields(artifactObj);

		fieldConfig.track.forEach((fieldName) => {
			if (fields[fieldName]) {
				var state = Object.assign({
					Entered: artifactObj.LastUpdateDate,
					Exited: null,
				}, fields);

				state["Old" + fieldName] = fields[fieldName];

				this.models.push( new State(state, fieldName) );
			}
		});
	}

	static fromArtifacts(artifacts) {
		var states = new States([]);

		artifacts.forEach((artifact) => {
			states.appendArtifactStates(artifact);
		});

		return states;
	}

	appendSnapshotStates(snapshotObj) {
		var fields = stateUtils.getKeptFields(snapshotObj);

		for (var fieldName in snapshotObj._PreviousValues) {

			if ( fieldConfig.track.indexOf(fieldName) == -1 ) continue;

			var state = Object.assign({
				Entered: snapshotObj._ValidFrom,
				Exited: snapshotObj._ValidTo,
			}, fields);

			state["Old" + fieldName] = snapshotObj._PreviousValues[fieldName];

			// l.debug("field: ", fieldName, state);

			this.models.push( new State(state, fieldName, snapshotObj._ObjectUUID) );
		}
	}

	static fromSnapshots(snapshots) {
		var states = new States([]);

		snapshots.forEach((snapshot) => {
			states.appendSnapshotStates(snapshot);
		});

		return states;
	}

	toBulkQuery () {
		var bulkQuery = [];

		this.models.forEach((state) => {
			bulkQuery.push({
				index: {
					_index: config.elastic.index,
					_type: state._type
				}
			});

			bulkQuery.push(state.getObj());
		});

		return bulkQuery;
	}

	save() {
		return stateOrm.esClient.bulk({
			body: this.toBulkQuery()
		});
	}
}

module.exports = {
	Revision: Revision, 
	Revisions: Revisions
};