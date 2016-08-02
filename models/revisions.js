var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	),
	parseUtils = require('./utils.js');

var fs = require('fs'),
	fieldConfig = JSON.parse(fs.readFileSync('config/state-fields.json', 'utf8')),
	schema = JSON.parse(fs.readFileSync('config/schema.json', 'utf8'));

const assert = require('assert');

// Create a null valued object of all schema fields
var nulledValues = {};
for (var field in schema) {
	nulledValues[field] = null;
}

var Revision = require('./revision');

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
		assert(schema);

		var mapping = {};

		for (var fieldName in schema) {
			var field = schema[fieldName];

			if (typeof field == "object") {

				if ( !field.type || field.type == "object" ) {
					mapping[fieldName] = {
						type: "object",
						properties: Revisions.parseMapping(field)
					};
				} else {					
					mapping[fieldName] = field;
				}

			} else if (typeof field == "string") {
				mapping[fieldName] = { type: field };
			}

			// For string type fields set them to not_analyzed
			if (mapping[fieldName].type == "string") {
				mapping[fieldName].index = "not_analyzed";
			}
		}

		return mapping;
	}

	static createMapping () {
		return stateOrm.putMapping({
				properties: Revisions.parseMapping(schema)
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

				state["Prev" + fieldName] = fields[fieldName];

				this.models.push( new Revision(state) );
			}
		});
	}

	static fromArtifacts(artifacts) {
		var states = new Revisions([]);

		artifacts.forEach((artifact) => {
			states.appendArtifactStates(artifact);
		});

		return states;
	}

	appendSnapshotStates(snapshotObj) {
		var id = snapshotObj._id;
		// Parsing
		var snapshotObj = parseUtils.flatten(snapshotObj);
		parseUtils.renameFields(snapshotObj, 'api');
		// l.debug("renamed: ", snapshotObj);
		parseUtils.removeUnused(snapshotObj);
		// l.debug("removed: ", snapshotObj);
		parseUtils.parseCustomFields(snapshotObj);

		var snapshotKeys = Object.keys(snapshotObj);

		for (var i= 0; i < fieldConfig.tracked.length; i++ ) {
			var trackedField = fieldConfig.tracked[i];

			if ( snapshotKeys.indexOf(trackedField) != -1 ) {
				var randCustomers = ['Penn', 'Hilton', 'Serai'];
				var randRegion = ['North America', 'South America', 'Europe', 'Asia', 'Australia']

				// Use the empty object otherwise the operation 
				// corrupts the nulledValues
				snapshotObj = Object.assign(
					{
						Customer: randCustomers[Math.floor(Math.random() * 3)],
						Region: randRegion[Math.floor(Math.random() * 5)],
					},
					// Default values to null
					nulledValues,
					parseUtils.unflatten(snapshotObj)
				);


				this.models.push( new Revision(snapshotObj, id) );
				return;
			}
		}
	}

	static fromSnapshots(snapshots) {
		var states = new Revisions([]);

		var countSpecific = 0;
		snapshots.forEach((snapshot) => {
			if (snapshot.ObjectID == 48385082410) {
				countSpecific++;
			}

			states.appendSnapshotStates(snapshot);
		});
		
		if (countSpecific > 0) {
			console.log("Number of states for " + 48385082410 + " :" + countSpecific);
		}

		return states;
	}

	save() {
		return stateOrm.bulkIndex(this.models);
	}
}

// l.debug(Revisions.parseMapping(fieldConfig.schema));
// l.debug(Revisions.createMapping());

module.exports = Revisions;