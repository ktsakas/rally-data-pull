var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	translation = JSON.parse(fs.readFileSync('config/state-fields.json', 'utf8')).translation,
	testObj = JSON.parse(fs.readFileSync('trash/test-obj.json', 'utf8'));

class HookParser {
	constructor (hookObj) {
		this.obj = hookObj;
	}

	

	formatWebhook () {
		FormatUtils.invertKeyName(this.obj.state);
		FormatUtils.invertKeyName(this.obj.changes);

		return this.obj;
	}
}

module.exports = HookParser;