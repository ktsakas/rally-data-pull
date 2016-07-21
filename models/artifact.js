var config = require("../config"),
	l = config.logger,
	KeyMapper = require("./key-mapper"),
	ElasticOrm = require("./elastic-orm"),
	artifactOrm = new ElasticOrm(config.esClient, "rally", "rawArtifact"),
	artifactOrm = new ElasticOrm(config.esClient, "rally", "artifact");

var artifactMapper = new KeyMapper({
	_ref: "Ref",
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
		if (config.debug) this.raw = artifactObj;

		this.model = artifactMapper.translate(artifactObj);
	}

	static fromHook(hook) {
		var artifactObj = {};

		hook.state.forEach(function (field) {
			artifactObj[field.name] = field.value;
		});

		return new Artifact(artifactObj);
	}

	addRevisions (nestedRevisions) {
		if (!this.model.revisions) this.model.revisions = {};

		for (var field in revisions.getObj()) {
			this.model.revisions[field].push(revisions[field]);
		}

		this.save();
	}

	getObj() {
		return this.model;
	}

	save() {
		if (config.debug) artifactRawOrm.index(this.raw);

		artifactOrm.index(this.model);
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