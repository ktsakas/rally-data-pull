"use strict";

var config = require("../config/config"),
	l = config.logger,
	ElasticOrm = require('./elastic-orm'),
	revisionsOrm = new ElasticOrm(
		config.esClient,
		config.elastic.index,
		config.elastic.types.revision
	);;

var trackedFields = ["L3KanbanState", "ScheduleState"];

class Revisions {
	constructor (revisions) {
		this.revisions = revisions;
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

	static fromHook(parentID, hookObj) {
		if (!Revisions.isUpdateHook(hookObj)) return;

		var revisions = [];
		for (var id in hookObj.changes) {
			var change = hookObj.changes[id];

			// Drop untracked fields
			// if ( trackedFields.indexOf(change.name) == -1 ) continue;

			revisions.push({
				parent: parentID,
				name: change.name,
				display_name: change.display_name,
				value: change.value,
				old_value: change.old_value
			});
		}
		console.log("revisions: ", revisions);

		return new Revisions(revisions);
	}

	save() {
		revisionsOrm.bulkIndex(this.revisions);

		return this;
	}
}

module.exports = Revisions;