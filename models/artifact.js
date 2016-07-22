"use strict";

var config = require("../config/config"),
	l = config.logger,
	KeyMapper = require("./key-mapper"),
	ElasticOrm = require("./elastic-orm"),
	artifactRawOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.raw_artifact
	),
	artifactOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.artifact
	);

var artifactMapper = new KeyMapper({
	_ref: "Ref",
	ObjectUUID: "_id",
	CreationDate: true,
	ObjectID: true,
	FormattedID: true,
	Name: true,
	ScheduleState: true,
	AcceptedDate: true,
	InProgressDate: true,
	c_KanbanState: "KanbanState",
	c_L3KanbanStage: "L3KanbanStage",
	LastUpdateDate: true
});

class Artifact {
	constructor(fields, id) {
		if (id) this._id = id;
		this.model = fields;
	}

	static saveRaw(rawArtifact) {
		/*rawArtifact.thing = rawArtifact._type;
		delete rawArtifact._type;

		artifactRawOrm.create(rawArtifact).catch((err) => {
			l.error("Failed to save raw artifact with id " + rawArtifact.ObjectUUID);
		});*/
	}

	static fromElastic(id) {
		return artifactOrm.getById(id)
			.catch((err) => {
				var errMsg = "Could not find artifact with id " + id + " in elastic.";
				l.error(errMsg);
				throw new Error(errMsg);
			})
			.then((resp) => new Artifact(resp._source, resp._id));
	}

	static fromAPI(artifactObj) {
		if (config.debug) Artifact.saveRaw(artifactObj);

		var fields = artifactMapper.translate(artifactObj);

		fields.L3KanbanStage = { Value: fields.L3KanbanStage };

		if ( fields.L3KanbanStage.Value ) {
			fields.L3KanbanStage.States = [{
				Value: fields.L3KanbanStage.Value,
				OldValue: null,
				Entered: artifactObj.LastUpdateDate,
				Exited: null
			}]
		}

		return new Artifact(fields, fields.ObjectUUID);
	}

	static fromHook(hook) {
		var fields = {};

		hook.state.forEach(function (field) {
			fields[field.name] = field.value;
		});

		if (config.debug) Artifact.saveRaw(fields);

		fields = artifactMapper.translate(fields);

		return new Artifact(fields, fields.ObjectUUID);
	}

	static latestRevDuration (fieldRevs) {
		var lastRev = fieldRevs[0],
			preLastRev = fieldRevs[1];

		return new Date(lastRev.date).getTime() - new Date(preLastRev.date).getTime();
	}

	updateFields (changes) {
		var fields = this.model || {};

		/*for (var field in changes) {
			if (!fields[field]) fields[field] = {};

			// Set current state
			var state = {
				Duration: -1,
				Entered: changes[field].date,
				Exited: "TODO",
				OldValue: changes[field].old_value,
				Value: changes[field].value
			};

			fields[field].States.unshift(state);

			// Update the previous state's duration
			fields[field].States[1].Duration =
				new Date(fields[field].States[0].Entered).getTime() - new Date(fields[field].States[1].Entered).getTime();
		}*/

		// Set current state
		fields.L3KanbanStage.States.unshift({
			Value: changes.c_L3KanbanStage.value,
			OldValue: fields.L3KanbanStage.States[0].Value,
			Entered: changes.c_L3KanbanStage.date,
			Duration: null,
			Exited: null
		});

		fields.L3KanbanStage.States[1].Exited = fields.L3KanbanStage.States[0].Entered;
		fields.L3KanbanStage.States[1].Duration = 
			new Date(fields.L3KanbanStage.States[1].Exited).getTime() - 
				new Date(fields.L3KanbanStage.States[1].Entered).getTime();

		console.log("new revisions: ", fields.L3KanbanStage.States);

		var self = this;
		artifactOrm.update(fields, this._id)
			.then((res) => {
				self.model = fields;

				return res;
			})
			.catch((err) => {
				l.error("Failed to update nested revisions in artifact with id " + this._id);
			});

		return this;
	}

	getObj() {
		return this.model;
	}

	save() {
		artifactOrm.index(this.model, this._id);

		return this;
	}
}

module.exports = Artifact;