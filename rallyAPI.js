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

var workspaceURL = "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/" + config.rally.workspaceID,
	projectURL = "https://rally1.rallydev.com/slm/webservice/v2.0/project/" + config.rally.projectID;

class RallyAPI {
	/*static pickSample(res) {
		var SampleFormattedIDs = ['US75364'];

		if ( SampleFormattedIDs.indexOf(res.FormattedID) != -1 ) {
			l.debug("Sampled story with formatted id " + res.FormattedID);

			fs.writeFile(
				"./trash/art-" + res.FormattedID,
				JSON.stringify(res, null, 4),
				() => {}
			);
		}

		return res;
	}*/

	static getArtifactRevisions (artifactID, workspaceID) {
		return rp({
			timeout: 30000,
			pagesize: 200,
			method: 'GET',
			uri: 'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + config.rally.workspaceID + '/artifact/snapshot/query.js',
			qs: {
				find: '{"ObjectID":' + artifactID + '}',
				fields: true,
				hydrate: '["ScheduleState","_PreviousValues.ScheduleState"]'
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
		var options = {
			type: 'artifact',
			scope: { workspace: workspaceURL },
			start: start,
			pageSize: pagesize,
			fetch: "true"
		};

		if (config.rally.projectID) {
			options.scope.project = projectURL;
		}

		return Promise.promisify(rallyClient.query, { context: rallyClient })(options);
	}

	static countArtifacts () {
		var options = {
			type: 'artifact',
			scope: { workspace: workspaceURL },
			pageSize: 1
		};

		if (config.rally.projectID) {
			options.scope.project = projectURL;
		}

		return Promise.promisify(rallyClient.query, { context: rallyClient })(options)
			.then((res) => res.TotalResultCount);
	}
}

module.exports = RallyAPI;