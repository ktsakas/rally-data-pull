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

var fs = require('fs'),
	fieldConfig = JSON.parse(fs.readFileSync('config/artifact-fields.json', 'utf8'));

var artifactUtil = require('./utils.js');

class Artifact {
	constructor(fields, id) {
		if (id) this._id = id;
		this.model = fields;
	}

	static createMapping() {
		var mapping = {};

		/*for (var fieldName in fieldConfig.keep) {
			mapping[fieldName] = {
				type: fieldConfig.keep[fieldName]
			};
		}*/

		// Mapping for tracked fields
		fieldConfig.track.forEach((fieldName) => {
			mapping[fieldName] = {
				properties: {
					Value: { type: fieldConfig.keep[fieldName] },

					States: {
						type: "nested",

						properties: {
							Value: { type: fieldConfig.keep[fieldName] },
							OldValue: { type: fieldConfig.keep[fieldName] },
							Entered: { type: "date" },
							Exited: { type: "date" }
						}
					}
				}
			};
		});

		return mapping;
	}

	static createIndex () {
		var createObj = { mappings: {} };
		createObj.mappings[config.elastic.types.artifact] = {
			properties: Artifact.createMapping()
		};

		return artifactOrm.createIndex(createObj);
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

		var fields = artifactUtil.translate(artifactObj);

		// Initialize all fields that we are tracking
		// if they are available in the artifact
		fieldConfig.track.forEach((fieldName) => {

			if (fields[fieldName]) {
				fields[fieldName] = { Value: fields[fieldName] };

				if ( fields[fieldName].Value ) {
					// Duration and OldValue are always null
					// in the most current state
					fields[fieldName].States = [{
						Value: fields[fieldName].Value,
						OldValue: null,
						Entered: artifactObj.LastUpdateDate,
						Exited: null
					}]
				}
			}
		});

		return new Artifact(fields, fields.ObjectUUID);
	}

	static fromHook(hook) {
		var fields = {};

		hook.state.forEach((field) => {
			fields[field.name] = field.value;
		});

		if (config.debug) Artifact.saveRaw(fields);

		fields = artifactUtil.translate(fields);

		return new Artifact(fields, fields.ObjectUUID);
	}

	static latestRevDuration (fieldRevs) {
		var lastRev = fieldRevs[0],
			preLastRev = fieldRevs[1];

		return new Date(lastRev.date).getTime() - new Date(preLastRev.date).getTime();
	}

	updateFields (changes) {
		var fields = this.model || {};

		fieldConfig.track.forEach((fieldName) => {
			if ( !changes[fieldName] ) return;

			// Set current state
			fields[fieldName].States.unshift({
				Value: changes[fieldName].value,
				OldValue: fields[fieldName].States[0].Value,
				Entered: changes[fieldName].date,
				Duration: null,
				Exited: null
			});

			fields[fieldName].States[1].Exited = fields[fieldName].States[0].Entered;
			fields[fieldName].States[1].Duration = 
				new Date(fields[fieldName].States[1].Exited).getTime() - 
					new Date(fields[fieldName].States[1].Entered).getTime();

			console.log("new revisions: ", fields[fieldName].States);
		});

		var self = this;
		artifactOrm.update(fields, this._id)
			.then((res) => self.model = fields)
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