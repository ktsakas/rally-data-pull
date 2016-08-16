"use strict";

var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	FormatUtils = require('./utils'),
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
		this.fixKeys();
		this.schemaFormat('hook');
		this.parseDates();

		return this.obj;
	}
}

l.debug( new WebhookFormatter(testObj.message).formatWebhook() );

module.exports = WebhookFormatter;