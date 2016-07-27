"use strict";

var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index
	),
	stateUtils = require('./utils.js');

var fs = require('fs'),
	fieldConfig = JSON.parse(fs.readFileSync('config/state-fields.json', 'utf8'));

class State {
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

class States {
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

	static createMappings () {
		var mappings = {};

		fieldConfig.track.forEach((type) => {
			mappings[type] = {
				properties: {}
			};

			for (var fieldName in fieldConfig.keep) {
				var fieldType = fieldConfig.keep[fieldName];

				mappings[type].properties[fieldName] = {
					type: fieldType
				};

				if (fieldType == "string") {
					mappings[type].properties[fieldName].index = "not_analyzed";
				}
			}
		});

		return stateOrm.putMappings(mappings).catch((err) => {
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
					OldValue: null,
					Value: fields[fieldName],
				}, fields);

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
		var fields = snapshotObj.removeUnusedFields(snapshotObj);

		for (var fieldName in snapshot._PreviousValues) {
			var state = Object.assign({
				Entered: snapshotObj.LastUpdateDate,
				Exited: null,
				OldValue: null,
				Value: fields[fieldName],
			}, fields);

			this.models.push( new State(state, fieldName, snapshot._ObjectUUID) );
		}
	}

	static fromSnapshots(snapshots) {
		var states = new States([]);

		res.Results.forEach((snapshot) => {
			states.appendSnapshotStates(snapshotObj);
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
	State: State, 
	States: States
};