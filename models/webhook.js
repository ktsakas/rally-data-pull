var config = require("../config"),
	l = config.logger,
	ElasticOrm = require("./elastic-orm"),
	webhookOrm = new ElasticOrm(config.esClient, "rally", "webhook");

class Webhook {
	constructor(hookObj) {
		hookObj.changes = keysToArray(hookObj.changes);
		hookObj.state = keysToArray(hookObj.state);

		this.hook = hookObj;
	}

	static normalizeValues(object) {
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

	static keysToArray(objects) {
		var array = [];

		for (var key in objects) {
			var obj = objects[key]; //normalizeValues(objects[key]);

			obj.key = key;
			array.push(obj);
		}

		return array;
	}

	save () {
		webhookOrm
			.index(this.hook)
			.catch((err) => l.error("Failed to insert webhook request into elastic.", err))
			.then((res) => l.debug("Webhook request indexed into elastic."));
	}
}

module.exports = Webhook;