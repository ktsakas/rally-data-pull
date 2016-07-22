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

"use strict";

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
	c_L3KanbanStage: "L3KanbanStage"
});

class Artifact {
	constructor(artifactObj) {
		this.model = artifactObj;
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
			.then((resp) => new Artifact(resp));
	}

	static fromAPI(artifactObj) {
		if (config.debug) Artifact.saveRaw(artifactObj);

		artifactObj = artifactMapper.translate(artifactObj);

		return new Artifact(artifactObj);
	}

	static fromHook(hook) {
		var artifactObj = {};

		hook.state.forEach(function (field) {
			artifactObj[field.name] = field.value;
		});

		if (config.debug) Artifact.saveRaw(artifactObj);

		artifactObj = artifactMapper.translate(artifactObj);

		return new Artifact(artifactObj);
	}

	addNestedRevisions (nestedRevisions) {
		if (!this.model.revisions) this.model.revisions = {};

		for (var field in revisions.getObj()) {
			this.model.revisions[field].push(revisions[field]);
		}

		return this.save();
	}

	getObj() {
		return this.model;
	}

	save() {
		artifactOrm.index(this.model, this.model.ObjectUUID);

		return this;
	}
}


/*
Artifact.fromHook({
	state: [
		{
			"value": null,
			"type": "String",
			"name": "c_PMS",
			"display_name": "PMS",
			"ref": null,
			"key": "8f5b69ae-90ce-4b3f-ba92-653957f15a8b"
		},
		{
			"value": null,
			"type": "String",
			"name": "c_InTheHands",
			"display_name": "In The Hands",
			"ref": null,
			"key": "de98cfa4-a551-46e8-b427-7b2f28a1c8ca"
		},
		{
			"value": null,
			"type": "Text",
			"name": "c_FinancialImpactCalculation",
			"display_name": "Financial Impact Calculation",
			"ref": null,
			"key": "ef696b2e-c305-4852-aa56-a4c086666712"
		},
		{
			"value": "05d9f598-d7c0-484b-b5cf-752f03df7227",
			"type": "Raw",
			"name": "ObjectUUID",
			"display_name": "ObjectUUID",
			"ref": null,
			"key": "c3d4f057-0781-4660-8ce7-bc8514bf0945"
		}
	]
}).save();*/

module.exports = Artifact;