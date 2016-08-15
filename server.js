"use strict";

var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config/config'),
	l = config.logger,
	parseUtils = require('./models/utils');

// Import models
var Webhook = require('./rally/hooks'),
	Revisions = require('./models/revision');

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }));

/**
 * Incoming webhook requests are handled by this route.
 * 
 * @param  {request}
 * @param  {response}
 */
app.post('/webhook', function (req, res) {
	var hookObj = req.body.message,
		// hook = new Webhook(hookObj),
		artifactID = hookObj.object_id;

	// Save revision as separate type
	// var revision = Revision.fromHook(artifactID, hookObj);
	// revision.save().then((res) => {});

	Webhook.invertKeyName(hookObj.state);
	Webhook.invertKeyName(hookObj.changes);

	if (hookObj.action == "created" || )

	res.json(hookObj);

	var snapshotObj = parseUtils.flatten(hookObj);
	parseUtils.renameFields(snapshotObj, 'hook');
	parseUtils.removeUnused(snapshotObj);
	hookObj = parseUtils.unflatten(snapshotObj);

	// Respond with the stored webhook
	// res.json(hookObj);
});

/**
 * Any route other than the webhook triggers a warning
 * and responds with links to elastic and kibana.
 * 
 * @param  {request}
 * @param  {response}
 */
app.use(function(req, res){
	l.warn("Called invalid route.");

	res.json({ elastic: config.elastic.host, kibana: config.kibana.host })
});

app.listen(config.port, () => l.info("Listening for incoming webhooks on port " + config.port));