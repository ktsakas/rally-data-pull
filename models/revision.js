var config = require("../config"),
	l = config.logger;

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

	static fromHook(parentID, hook) {
		if (!Revisions.isUpdateHook()) return;

		var revisions = [];
		for (var id in hook.changes) {
			var change = hook.changes[id];

			// Drop untracked fields
			if ( trackedFields.indexOf(change.name) == -1 ) return;

			revisions.push({
				parentID: parentID,
				name: change.name,
				display_name: change.display_name,
				value: change.value,
				old_value: change.old_value
			});
		}

		return new Revisions(parentID, revisions);
	}

	save() {
		esClient.bulkIndex(this.revisions);
	}
}

module.export = Revisions;