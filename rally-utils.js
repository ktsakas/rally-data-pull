var config = require('./config'),
	l = config.logger,
	Promise = require('bluebird'),
	ESObject = require('./es-wrapper'),
	rally = require('rally'),
	artifactMapper = require('./artifact-mapper');

var ESartifact = new ESObject(config.esClient, "rally", "pulltest");

var rallyClient = rally({
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

const PAGESIZE = 2000;

class RallyUtils {
	constructor() {

	}

	static saveWebhook () {
		
	}

	static pullFrom (start) {
		return Promise.promisify(rallyClient.query, { context: rallyClient })({
				type: 'artifact',
				scope: {
					workspace: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/5339961604",
				},
				start: start,
				pageSize: PAGESIZE,
				fetch: "true"
			})
			.then(function (response) {
				var count = response.Results.length,
					end = Math.min(start + PAGESIZE, response.TotalResultCount),
					mappedArtifacts = response.Results.map((artifact) => artifactMapper.translate(artifact));

				ESartifact
					.bulkIndex(mappedArtifacts)
					.catch((err) => l.error("Could not insert artifacts " + start + " through " + end + " into elastic."))
					.then(function (res) {
						l.debug("Indexing artifacts " + start + " through " + end + " took " + res.took + "ms.");
					});

				return response;
			});
	}

	static pullAll () {
		RallyUtils.pullFrom(1).then(function (response) {
			for (
				var start = 1 + PAGESIZE;
				start < response.TotalResultCount;
				start += PAGESIZE
			) {
				RallyUtils.pullFrom(start);
			}
		});
	}
}

module.exports = RallyUtils;