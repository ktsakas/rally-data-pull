"use strict";

var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	FormatBase = require('./base'),
	testObj = JSON.parse(fs.readFileSync('trash/webhook.json', 'utf8'));

class WebhookFormatter extends FormatBase {
	constructor (hookObj) {
		super(hookObj);
	}

	/**
	 * Keys in objects recieved from webhooks are the id's of the attributes.
	 * This function set the keys to the attribute names.
	 * 
	 * @return {object}
	 */
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

	/**
	 * Runs all formatting operations for an object received from a webhook
	 * and returns a promise that resolves with a valid ElasticSearch document.
	 * 
	 * @return {promise}
	 */
	formatWebhook () {
		var self = this;

		this.fixKeys();
		return this
			.format('hook')
			.then(() => {
				self.parseDates();

				return this.obj;
			});
	}
}

/*new WebhookFormatter(testObj.message).formatWebhook().then((revision) => {
	l.debug(revision);
});*/

module.exports = WebhookFormatter;