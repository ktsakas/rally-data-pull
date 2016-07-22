var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require("./elastic-orm"),
	webhookOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.webhook
	);

"use strict";

class Webhook {
	constructor(hookObj) {
		hookObj.changes = Webhook.formatForElastic(hookObj.changes);
		hookObj.state = Webhook.formatForElastic(hookObj.state);

		this.hook = hookObj;
	}

	static fixFieldTypes(object) {
		for (var key in object) {
			if (typeof object[key] == "number") {
				object["num_" + key] = object[key];
				delete object[key];
			}

			if (typeof object[key] == "object" && object[key] != null) {
				object["obj_" + key] = JSON.stringify(object[key]);
				delete object[key];
			}

			if (typeof object[key] == "string" && new Date(object[key]) != "Invalid Date" ) {
				object["date_" + key] = object[key];
				delete object[key];
			}

			if (typeof object[key] == "boolean") {
				object["bool_" + key] = object[key];
				delete object[key];
			}
		}

		return object;
	}

	static formatForElastic(objects) {
		var array = [];

		for (var key in objects) {
			var obj = Webhook.fixFieldTypes(objects[key]);

			obj.key = key;
			array.push(obj);
		}

		return array;
	}

	getObj () {
		return this.hook;
	}

	save () {
		l.debug("saving....");

		webhookOrm
			.index(this.hook, this.hook.message_id)
			.catch((err) => l.error("Failed to insert webhook request into elastic.", err))
			.then((res) => l.debug("Webhook request indexed into elastic."));

		return this;
	}
}

module.exports = Webhook;