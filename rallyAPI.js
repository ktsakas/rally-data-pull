var config = require('./config/config'),
	Promise = require('bluebird'),
	rp = require('request-promise');
	rally = require('rally'),
	rallyClient = rally({
		user: config.rally.user,
		pass: config.rally.pass,
		apiVersion: 'v2.0',
		server: config.rally.server,
		requestOptions: {
			headers: {
				'X-RallyIntegrationName': 'User Story Kibana Analysis',
				'X-RallyIntegrationVendor': 'TravelClick',
				'X-RallyIntegrationVersion': '1.0'
			}
		}
	});

class RallyAPI {
	static getArtifactRevisions (artifactID, workspaceID) {
		return rp({
			timeout: 15000,
			pagesize: 200,
			method: 'GET',
			uri: 'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + workspaceID + '/artifact/snapshot/query.js',
			qs: {
				find: '{"ObjectID":' + artifactID + '}',
				fields: true,
				hydrate: '["ScheduleState"]'
			},
			auth: {
				user: config.rally.user,
				pass: config.rally.pass,
				sendImmediately: false
			},
			json: true
		});
	}

	static getArtifacts (start, pagesize) {
		return Promise.promisify(rallyClient.query, { context: rallyClient })({
			type: 'artifact',
			scope: {
				workspace: config.rally.workspace,
			},
			start: start,
			pageSize: pagesize,
			fetch: "true"
		});
	}

	static countArtifacts () {
		return Promise.promisify(rallyClient.query, { context: rallyClient })({
			type: 'artifact',
			scope: {
				workspace: config.rally.workspace,
			},
			pageSize: 1
		}).then((res) => res.TotalResultCount);
	}
}

module.exports = RallyAPI;