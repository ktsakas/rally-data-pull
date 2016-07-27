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
	fetchProgress,
	historyProgress;

class RallyUtils {
	static pullHistory (objectIDs, workspaceID) {
		var promises = [];

		objectIDs.forEach((id) => {

			var p = RallyAPI
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

			promises.push(p);
		});

		return Promise.all(promises);
	}

	static pullHistoryGradually (artifactIDs, workspaceID, step) {
		var from = 1,
			p = Promise.resolve();

		return p.then(function (res) {
			if (from <= artifactIDs.length) {
				var someIDs= artifactIDs.slice(from, from + step);
				from += step;

				return RallyUtils.pullHistory(someIDs, workspaceID);
			} else {
				return "done";
			}
		});
	}

	static pullArtifacts (start, pagesize) {
		assert(pagesize <= 200);

		return RallyAPI
			.getArtifacts(start, 200)
			.then(function (response) {
				var end = Math.min(start + PAGESIZE, totalArtifacts);

				var ObjectIDs = response.Results.map((result) => result.ObjectID);
				
				/*States.fromArtifacts(response.Results).save().then(function (res) {
					if (res.errors) {
						fetchProgress.terminate();

						l.error("Could not insert states for artifacts " + start + " through " + end + " into elastic.");
						
						l.error("Sample error: ", res.items[0]);

					} else {
						RallyUtils.pullHistory(ObjectIDs, 5339961604);

						fetchProgress.tick(PAGESIZE);
					}
				});*/


				RallyUtils.pullHistoryGradually(ObjectIDs, 5339961604)
					.then(() => {
						fetchProgress.tick(PAGESIZE);
					});

				return response;
			});
	}

	static pullAll () {
		l.info("Indexing Rally data into /" + config.elastic.index + "/" + config.elastic.types.artifact + " ...");

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

		Promise
			.resolve([
				RallyAPI.countArtifacts(),
				Revisions.createMapping()
			])
			.spread((numOfArtifacts) => {
				totalArtifacts = numOfArtifacts;

				fetchProgress.total = totalArtifacts;
				historyProgress.total = totalArtifacts;

				for (
					var start = 1;
					start < totalArtifacts;
					start += PAGESIZE
				) {
					RallyUtils.pullArtifacts(start, PAGESIZE);
				}
			});
	}
}

RallyUtils.pullHistory([33645337948], 5339961604);

module.exports = RallyUtils;