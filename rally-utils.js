"use strict";

const assert = require('assert');
var Multiprogress = require("multi-progress");
var multi = new Multiprogress(process.stderr);

var config = require('./config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	ESObject = require('./models/elastic-orm'),
	Artifact = require('./models/artifact'),
	Revisions = require('./models/revision').Revisions;

var artifactOrm = new ESObject(
	config.esClient,
	config.elastic.index,
	config.elastic.types.artifact
);

var stateOrm = new ESObject(
	config.esClient,
	config.elastic.index
);

var RallyAPI = require("./rallyAPI");


const PAGESIZE = 200;

var totalArtifacts = null,
	ObjectIDs = [],
	fetchProgress,
	historyProgress;

class RallyUtils {
	constructor () {
		
	}

	static pullHistory (id, workspaceID) {
		return RallyAPI
			.getArtifactRevisions(id, workspaceID)
			.then(function (res) {

				Revisions.fromSnapshots(res.Results).save().then(function (res) {
					if (res.errors) {
						l.error("Failed to insert snapshots.");
						l.error("Sample error: ", res);

					} else {
						historyProgress.tick();
					}
				});

			}).catch(function (err) {
				l.debug(err);
			});
	}

	static pullHistoryGradually (artifactIDs, workspaceID, step) {
		var p = Promise.resolve(),
			from = 0;

		for (var times= 0; times < artifactIDs.length; times += step) {
			p = p
				.then(() => {
					// console.log("from " + from + " to " + (from + step) + "\n");

					var someProms = artifactIDs
						.slice(from, from + step)
						.map((id) => {
							return RallyUtils.pullHistory(id, workspaceID);
						});
					from += step;

					return Promise.all(someProms);
				});
		}

		return p;
	}

	static pullArtifacts (start, pagesize) {
		assert(pagesize <= 200);

		return RallyAPI
			.getArtifacts(start, 200)
			.catch((err) => {
				l.debug(err);
				return true;
			})
			.then(function (response) {
				var end = Math.min(start + PAGESIZE, totalArtifacts);

				if (!response.Results) {
					l.error("Failed to pull artifacts.");
					return response;
				}

				response.Results.forEach((result) => ObjectIDs.push(result.ObjectID));

				fetchProgress.tick(PAGESIZE);

				return response;
			});
	}

	static pullAll () {
		l.info("Indexing Rally data into /" + config.elastic.index + "/" + config.elastic.types.artifact + " ...");

		Promise
			.resolve([
				RallyAPI.countArtifacts(),
				Revisions.createMapping()
			])
			.spread((numOfArtifacts) => {
				totalArtifacts = numOfArtifacts;

				l.info("Total number of artifacts: " + totalArtifacts);

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

				fetchProgress.total = totalArtifacts;
				historyProgress.total = totalArtifacts;

				var promises = [];
				for (
					var start = 1;
					start < totalArtifacts;
					start += PAGESIZE
				) {
					promises.push( RallyUtils.pullArtifacts(start, PAGESIZE) );
				}

				Promise
					.all(promises)
					.then(() => {
						RallyUtils.pullHistoryGradually(ObjectIDs, 6692415259, 500)//5339961604, 500)
					});
			});
	}
}

RallyUtils.pullAll();

module.exports = RallyUtils;