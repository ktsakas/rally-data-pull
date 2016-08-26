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
	constructor(projectIDs) {
		this.projectIDs = projectIDs;
	}

	/*getProjectChildren (projectID) {
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

	getProjectsDescendants (projectIDs) {
		// Pull the descendants for all projects
		return Promise.all(
				projectIDs
				.map((projectID) => this.getProjectDescendants(projectID))
		// And flatten the resulting array
			).then((descendants) => descendants.reduce((a, b) => a.concat(b), []));
	}

	create (projectIDs) {
		projectIDs = projectIDs || this.projectIDs;

		this.getProjectsDescendants(projectIDs)
			.then((descendants) => {
				l.debug("descendants: ", descendants);

				var proms = descendants.map((project) => {
					return new rp({
						method: 'POST',
						url: 'https://rally1.rallydev.com/notifications/api/v2/webhook',
						body: {
							AppName: "Customer Support Dashboard",
							AppUrl: "http://ad5e6996.ngrok.io",
							Name: project.Name + " Hook",
							TargetUrl: "http://ad5e6996.ngrok.io",
							Expressions: [{
								Value: project.UUID,
								Operator: "project"
							}]
						}
					});
				});

				return Promise.all(proms);
			})
			.then((hooks) => {
				var hookIDs = hooks.map((hook) => hook.ObjectUUID);

				// Store hook ids in file
				fs.writeFileSync(webhookIdsFilePath, JSON.stringify(hookIDs), 'utf8');
			});
	}

	remove () {
		var hookIDs = JSON.parse(fs.readFileSync(webhookIdsFilePath, 'utf8'));

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
	}*/

	format (hookObj) {

	}
}

var rallyHooks = new RallyWebhooks([6716826537, 9053047572, 16781760883]);

return new rp({
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
			Value: "b03e6b6f-0641-4a50-9490-c7a37d8e87a0"
		}]
	}
}).then((res) => {
	l.debug(res);
});

/*rallyHooks
	.remove()
	.then(() => {
		// rallyHooks.create();
	});*/

module.exports = RallyWebhooks;