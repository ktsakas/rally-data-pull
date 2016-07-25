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
	fieldConfig = JSON.parse(fs.readFileSync('config/artifact-fields.json', 'utf8'));

class State {
	constructor (stateObj, type, id) {
		if (id) this._id = id;
		if (type) this._type = type;

		this.model = stateObj;
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

	static findArtifact(params) {

	}

	static fromArtifact(artifactObj) {
		var fields = stateUtils.removeUnusedFields(artifactObj);
		var states = [];

		fieldConfig.track.forEach((fieldName) => {
			if (fields[fieldName]) {
				var state = Object.assign({
					Entered: artifactObj.LastUpdateDate,
					Exited: null,
					OldValue: null,
					Value: fields[fieldName],
				}, fields);

				states.push( new State(state, fieldName) );
			}
		});

		return states;
	}

	static fromHook(parentID, hookObj) {
		if (!Revisions.isUpdateHook(hookObj)) return;

		var hookDate = hookObj.transaction.timestamp;
		var revisions = [];
		for (var id in hookObj.changes) {
			var change = hookObj.changes[id];

			// Drop untracked fields
			if ( fieldConfig.track.indexOf(change.name) == -1 ) continue;

			var state = new State({
				DisplayName: change.display_name,
				Value: change.value,
				OldValue: change.old_value,
				Entered: new Date(hookDate).toISOString()
			}, change.name);

			state.save();
		}

		return new State(revisions);
	}

	getObj() {
		return this.model;
	}

	save() {
		stateOrm.setType(this._type).index(this.model, this._id);

		return this;
	}
}

module.exports = State;