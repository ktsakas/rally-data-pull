"use strict";

var config = require("../config/config"),
	l = config.logger,
	Promise = require('bluebird'),
	path = require('path'),
	fs = require('fs'),
	rp = require('../wrapped-request').defaults({
		timeout: 10000,
		headers: {
			host: "rally1.rallydev.com",
			cookie: "ZSESSIONID=" + config.rally.apiKey
		},
		cache: true,
		json: true
	}),
	webhookIdsFilePath = path.join(__dirname, './webhook-ids.json'),
	RallyAPI = require('./api');

rp({
	method: 'POST',
	url: 'https://rally1.rallydev.com/notifications/api/v2/webhook',
	body: {
		AppName: "Customer Support Dashboard",
		AppUrl: config.webhookURL,
		Name: "Rally Integration Webhook",
		TargetUrl: config.webhookURL,
		Expressions: [{
			AttributeID: null,
			AttributeName: "Workspace",
			Operator: "=",
			Value: config.rally.workspaceUUID
		}]
	}
}).then((res) => {
	l.info("Response: ", res);
}).catch((err) => {
	l.error("Failed to create webhook: ", err);
});

module.exports = RallyWebhooks;