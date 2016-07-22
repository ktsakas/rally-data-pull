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
	c_L3KanbanStage: "L3KanbanStage"
});

class Artifact {
	constructor(artifactObj, id) {
		if (id) this._id = id;
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
			.then((resp) => new Artifact(resp._source, resp._id));
	}

	static fromAPI(artifactObj) {
		if (config.debug) Artifact.saveRaw(artifactObj);

		artifactObj = artifactMapper.translate(artifactObj);

		return new Artifact(artifactObj, artifactObj.ObjectUUID);
	}

	static fromHook(hook) {
		var artifactObj = {};

		hook.state.forEach(function (field) {
			artifactObj[field.name] = field.value;
		});

		if (config.debug) Artifact.saveRaw(artifactObj);

		artifactObj = artifactMapper.translate(artifactObj);

		return new Artifact(artifactObj, artifactObj.ObjectUUID);
	}

	static latestRevDuration (revisions) {
		var lastRev = revisions[ revisions.length - 1 ],
			preLastRev = revisions[ revisions.length - 2 ];

		return new Date(lastRev.date).getTime() - new Date(preLastRev.date).getTime();
	}

	addNestedRevisions (nestedRevs) {
		nestedRevs = this.model.revisions || {};

		for (var field in nestedRevs) {
			if (!nestedRevs[field]) nestedRevs[field] = [];

			nestedRevs[field].unshift(nestedRevs[field]);
		}

		nestedRevs[ nested.length - 2 ].duration = Artifact.latestRevDuration(nestedRevs);

		console.log("new revisions: ", this.model.revisions);

		artifactOrm.update({ revisions: nestedRevs }, this._id)
			.then((res) => {
				this.model.revisions = nestedRevs;

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