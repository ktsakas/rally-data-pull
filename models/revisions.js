var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	stateOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	);

var fs = require('fs'),
	mappings = JSON.parse(fs.readFileSync('config/mappings.json', 'utf8')),
	tracked = JSON.parse(fs.readFileSync('config/tracked.json', 'utf8')),
	schema = JSON.parse(fs.readFileSync('config/schema.json', 'utf8'));

const assert = require('assert');

// Create a null valued object of all schema fields
var nulledValues = {};
for (var field in schema) {
	nulledValues[field] = null;
}

var Revision = require('./revision');

class Revisions {
	constructor (revisions) {
		this.models = revisions;
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

	static parseSchema (schema) {
		assert(schema);

		var mapping = {};

		for (var fieldName in schema) {
			var field = schema[fieldName];

			if (typeof field == "object") {

				if ( !field.type || field.type == "object" ) {
					mapping[fieldName] = {
						type: "object",
						properties: Revisions.parseSchema(field)
					};
				} else {					
					mapping[fieldName] = field;
				}

			} else if (typeof field == "string") {
				mapping[fieldName] = { type: field };
			}

			// For string type fields set them to not_analyzed
			if (mapping[fieldName].type == "string") {
				// mapping[fieldName].analyzer = "analyzer_keyword";
				mapping[fieldName].index = "not_analyzed";
			}
		}

		return mapping;
	}

	static createMapping () {

		return stateOrm.putMapping({
			properties: Revisions.parseSchema(schema)
		})
		.catch((err) => {
			l.error("Failed to create mapping for revision.");
			l.error(err);
		});

		/*return stateOrm.putSettings({
			index: {
				analysis: {
					analyzer: {
						analyzer_keyword: {
							tokenizer: "keyword",
							filter: "lowercase"
						}
					}
				}
			}
		 }).then((res) => {
		 	stateOrm.putMapping({
				properties: Revisions.parseSchema(schema)
			})
			.catch((err) => {
				l.error("Failed to create mapping for revision.");
				l.error(err);
			});
		});*/
	}

	save() {
		this.models.forEach((revision) => {
			var id = revision._id;
			delete revision._id;

			new Revision(revision, id).save();
		});
	}
}

// l.debug(Revisions.parseMapping(mappings.schema));
// l.debug(Revisions.createMapping());

module.exports = Revisions;