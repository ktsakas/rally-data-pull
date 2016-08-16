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

class RallyWebhooks {
	constructor(projectID) {
		this.projectID = projectID;
	}

	runServer() {

	}

	getProjectChildren (projectID) {
		var projectChildrenURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/Project/' + projectID + '/Children';

		return new rp({ method: 'GET', uri: projectChildrenURL })
			.then((res) => {
				return res.QueryResult.Results.map((result) => {
					return {
						Name: result.Name,
						ID: result.ObjectID,
						UUID: result.ObjectUUID
					};
				});
			});
	}

	getProjectDescendants (projectID) {
		var descendants = [];

		return this
			.getProjectChildren(projectID)
			.then((children) => {
				if (!children.length) return [];

				// Append the children
				descendants = descendants.concat(children);

				// Append the child's descendants
				var proms = children.map((child) => {
					return this
						.getProjectDescendants(child.ObjectID)
						.then((childDescendants) => {
							descendants = descendants.concat(childDescendants);
						});
				});

				// When all requests are done return the descendants
				return Promise
					.all(proms)
					.then(() => descendants);
			});
	}

	create (projectID) {
		projectID = projectID || this.projectID;

		this.getProjectDescendants(projectID)
			.then((descendants) => {
				l.debug("descendants: ", descendants);

				return Promise.all(descendants
					.map((project) => {
						l.debug("Project name: ", project.Name);

						return new rp({
							method: 'POST',
							url: 'https://rally1.rallydev.com/notifications/api/v2/webhook',
							body: {
								AppName: "Customer Support Dashboard",
								AppUrl: "http://ad5e6996.ngrok.io",
								Name: project.Name + " Hook",
								TargetUrl: "http://ad5e6996.ngrok.io",
								Expressions: [{
									Value: project.ObjectUUID,
									Operator: "project"
								}]
							}
						})
					}));
			})
			.then((hooks) => {
				var hookIDs = hooks.map((hook) => {
					return hook.ObjectUUID;
				});

				// Store hook ids in file
				fs.writeFileSync(webhookIdsFilePath, JSON.stringify(hookIDs), 'utf8');
			});
	}

	remove () {
		var hookIDs = JSON.parse(webhookIdsFilePath, 'utf8');

		// Send delete requests for all webhooks
		return Promise.all(hookIDs.map((hookID) => {
			return new rp({
				method: 'DELETE',
				url: 'https://rally1.rallydev.com/notifications/api/v2/webhook/' + hookID
			}).catch((err) => {
				if (err.Errors[0].message == "Webhook not found") {
					l.warn("Could not delete previously created webhook: not found.");
					return;
				} else {
					throw err;
				}
			});
		// Remove webhook ids from file
		})).then((_) => {
			fs.writeFileSync(webhookIdsFilePath, '[]', 'utf8');
		});
	}

	format (hookObj) {

	}
}

/*var rallyHooks = new RallyWebhooks(22560124149);

rallyHooks
	.remove()
	.then(() => {
		rallyHooks.create();
	});*/

module.exports = RallyWebhooks;