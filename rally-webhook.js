var express = require("express"),
	app = express(),
	bodyParser = require('body-parser'),
	config = require('./config'),
	l = config.logger,
	Webhook = require('./models/webhook');

var elasticsearch = require('elasticsearch'),
	esClient = config.esClient;

app.use(bodyParser.json())
   .use(bodyParser.urlencoded({ extended: false }));

/**
 * Incoming webhook requests are handled by this route.
 * 
 * @param  {request}
 * @param  {response}
 */
app.post('/webhook', function (req, res) {
	new Webhook(req.body.message).save();

	res.json(message);
});

/**
 * Any route other than the webhook triggers a warning
 * and responds with links to elastic and kibana.
 * 
 * @param  {request}
 * @param  {response}
 */
app.use(function(req, res){
	l.warn("Called route other than /webhook.");

	res.json({ elastic: config.elastic.host, kibana: config.kibana.host })
});