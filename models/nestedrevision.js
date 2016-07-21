var config = require("../config"),
	l = config.logger;

var trackedFields = ["L3KanbanState", "ScheduleState"];
/*
class NestedRevision {
	constructor(revisionObj) {

	}

	static fromRallyChange(changeObj) {

	}

	getObj() {
		return this.model;
	}

	save() {

	}
}*/

class NestedRevisions {
	constructor(nestedRevisions) {
		this.nestedRevisions = nestedRevisions;
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

	static fromHook(hook) {
		if (!Revisions.isUpdateHook()) return;

		var nestedRevisions = [];

		// Get change version id
		var version_id = hook.changes.find((change) => change.name == "VersionId").value;

		for (var id in hook.changes) {
			var change = hook.changes[id];

			nestedRevisions[change.name] = {
				display_name: change.display_name,
				value: change.value,
				old_value: change.old_value,
				version_id: version_id
			};
		}

		return new NestedRevisions(nestedRevisions);
	}
}

module.export = Revision;