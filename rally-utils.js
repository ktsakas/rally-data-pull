"use strict";

var Multiprogress = require("multi-progress");
var multi = new Multiprogress(process.stderr);
var rp = require('request-promise');

var config = require('./config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	ESObject = require('./models/elastic-orm'),
	rally = require('rally'),
	Artifact = require('./models/artifact'),
	States = require('./models/state').States;

var artifactOrm = new ESObject(
	config.esClient,
	config.elastic.index,
	config.elastic.types.artifact
);

var stateOrm = new ESObject(
	config.esClient,
	config.elastic.index
);

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

var fetchProgress,
	historyProgress;

class RallyUtils {
	constructor() {

	}

	static storeArtifacts (results) {
		artifacts = results.map((artifact) => {
			return Artifact.fromAPI(artifact)
		});

		return artifactOrm.bulkIndex(artifacts);			
	}

	static storeStates(results) {
		var states = [];

		results.forEach((artifact) => {
			var artifatctStates = State.fromArtifact(artifact);
			
			artifatctStates.forEach((state) => { states.push(state); });
		});

		return stateOrm.bulkIndex(states);
	}

	static gradualPullHistory (objectIDs, workspaceID) {
		objectIDs.forEach((id) => {

			rp({
				timeout: 10000,
				pagesize: 200,
				method: 'GET',
				uri: 'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + workspaceID + '/artifact/snapshot/query.js',
				qs: {
					find: '{"ObjectID":' + id + '}',
					fields: true,
					hydrate: '["ScheduleState"]'
				},
				auth: {
					user: config.rally.user,
					pass: config.rally.pass,
					sendImmediately: false
				},
				json: true
			}).then(function (res) {
				States.fromSnapshots(res.Results).save();

				historyProgress.tick();
			}).catch(function (err) {
				l.debug(err);
			});

		});
	}

	static pullHistory (objectIDs, workspaceID) {
		var from = 0,
			to = 10,
			step = 10;

		var t = setInterval(function () {
			RallyUtils.gradualPullHistory(objectIDs.slice(from, to), workspaceID);

			if (to <= objectIDs.length) {
				from += step;
				to += step;
			} else {
				clearInterval(t);
			}
		}, 2000);
	}

	static pullFrom (start) {
		return Promise.promisify(rallyClient.query, { context: rallyClient })({
				type: 'artifact',
				scope: {
					workspace: config.rally.workspace,
				},
				start: start,
				pageSize: PAGESIZE,
				fetch: "true"
			})
			.then(function (response) {
				var count = response.Results.length,
					end = Math.min(start + PAGESIZE, response.TotalResultCount);

				var ObjectIDs = response.Results.map((result) => result.ObjectID);
				
				// console.log(ObjectIDs);

				/*RallyUtils.storeArtifacts().then(function (res) {
					if (res.errors) {
						l.error("Could not insert artifacts " + start + " through " + end + " into elastic.");
					} else {
						l.debug("Artifacts " + start + " through " + end + " took " + res.took + "ms.");
					}
				});*/

				States.fromArtifacts(response.Results).save().then(function (res) {
					if (res.errors) {
						fetchProgress.terminate();

						l.error("Could not insert states for artifacts " + start + " through " + end + " into elastic.");
						
						l.error("Sample error: ", res.items[0]);

					} else {
						RallyUtils.pullHistory(ObjectIDs, 5339961604);

						fetchProgress.tick(PAGESIZE);
					}
				});

				return response;
			});
	}

	static pullAll () {
		l.info("Indexing Rally data into /" + config.elastic.index + "/" + config.elastic.types.artifact + " ...");

		/*Artifact.createIndex()
			.catch((err) => {
				l.error(err);
			})
			.then(() => {*/

		fetchProgress = multi.newBar('Fetching artifacts [:bar] :percent', {
			complete: '=',
			incomplete: ' ',
			width: 40,
			total: 100000
		});

		historyProgress = multi.newBar('Fetching revisions [:bar] :percent', {
			complete: '=',
			incomplete: ' ',
			width: 40,
			total: 100000
		});

		States
			.createMappings()
			.catch((err) => {
				l.error(err);
			})
			.then(() => {
				RallyUtils.pullFrom(1).then(function (response) {
					fetchProgress.total = response.TotalResultCount;
					historyProgress.total = response.TotalResultCount;

					fetchProgress.tick(PAGESIZE);

					for (
						var start = 1 + PAGESIZE;
						start < response.TotalResultCount;
						start += PAGESIZE
					) {
						RallyUtils.pullFrom(start);
					}
				});
			});
	}
}

RallyUtils.pullAll();

module.exports = RallyUtils;