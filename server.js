"use strict";

var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config/config'),
	l = config.logger,
	esClient = config.esClient,
	rallyUtils = require('./rally-utils');

// Import models
var Webhook = require('./models/webhook'),
	Artifact = require('./models/artifact'),
	Revisions = require('./models/revisions'),
	NestedRevisions = require('./models/nestedrevisions');

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
		hook = new Webhook(hookObj),
		artifactID = hookObj.object_id;

	// Save the raw webhook if we are debugging
	if (config.debug) hook.save();

	// Find the affected artifact
	Artifact.fromElastic(artifactID).then((artifact) => {

		// Save revision as separate type
		var revisions = Revisions.fromHook(artifactID, hookObj);
		revisions.save();

		// Save revision in artifact object
		var nestedRevisions = NestedRevisions.fromHook(hookObj).getObj();
		artifact.addNestedRevisions(nestedRevisions);

		// Respond with the stored webhook
		res.json(hook.getObj());

	}).catch((err) => {
		res.json({ error: err.message });
	});
});

/**
 * Call this route to pull in initial data.
 * 
 * @param  {request}
 * @param  {response}
 */
app.get('/pull', function (req, res) {
	esClient
		.ping()
		.catch((err) => l.error("Unable to connect to elastic at " + config.elastic.host))
		.then(() => l.info("Connected to elastic at: " + config.elastic.host))
		.then(() => rallyUtils.pullAll())
		/*.catch((err) => {
			res.json(err.message);
			throw err;
		})
		.then(() => {
			res.json({ success: true });
		});*/
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