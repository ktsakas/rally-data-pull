"use strict";

var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config/config'),
	l = config.logger;

// Import models
var WebhookFormatter = require('./formatters/webhook'),
	Revision = require('./models/revision');

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }));

/**
 * Incoming webhook requests are handled by this route.
 * 
 * @param  {request}
 * @param  {response}
 */
app.post('/webhook', function (req, res) {


	new WebhookFormatter(req.body.message)
		.formatWebhook()
		.then((hook) => {
			if (hook.Story.Type == "L3/Salesforce") {
				return new Revision(hook).save();
			} else {
				l.debug("Change in non L3/Salesforce ticket not saving...")
				return Promise.resolve(hook);
			}		
		})
		.then((hook) => {
			// Respond with the stored webhook
			res.json(hook);
		})
		.catch((err) => {
			l.error("Failed to save hook ", err);
		});

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