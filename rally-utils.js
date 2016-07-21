var config = require('./config'),
	l = config.logger,
	Promise = require('bluebird'),
	ESObject = require('./models/elastic-orm'),
	rally = require('rally'),
	Artifact = require('./models/artifact');

var artifactOrm = new ESObject(config.esClient, "test", "rally");

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


const PAGESIZE = 200;

class RallyUtils {
	constructor() {

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
					artifacts = response.Results.map((artifact) => {
						return new Artifact(artifact).getObj()
					});

				artifactOrm
					.bulkIndex(artifacts)
					.catch((err) => l.error("Could not insert artifacts " + start + " through " + end + " into elastic."))
					.then(function (res) {
						l.debug("Artifacts " + start + " through " + end + " took " + res.took + "ms.");
					});

				return response;
			});
	}

	static pullAll () {
		l.info("Indexing Rally data into /rally/pulltest ...");

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