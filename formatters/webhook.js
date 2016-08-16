"use strict";

var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	FormatUtils = require('./base'),
	testObj = JSON.parse(fs.readFileSync('trash/webhook.json', 'utf8'));

class WebhookFormatter extends FormatUtils {
	constructor (hookObj) {
		super(hookObj);
	}

	fixKeys(state) {
		var invertKeyName = function (obj) {
			for (var key in obj) {
				obj[ obj[key].name ] = obj[key];
				delete obj[key];
			}
		};

		invertKeyName(this.obj.state);
		invertKeyName(this.obj.changes);

		return this.obj;
	}

	parseDates () {
		this.obj.Entered = new Date(this.obj.Entered).toISOString();
		this.obj.Exited = null;
		this.obj.DurationDays = null;

		super.parseDates();
	}

	formatWebhook () {
		var self = this;

		this.fixKeys();
		return this.format('hook')
			.then(() => {
				self.parseDates();

				return this.obj;
			});
	}
}

new WebhookFormatter(testObj.message).formatWebhook().then((revision) => {
	l.debug(revision);
});

module.exports = WebhookFormatter;