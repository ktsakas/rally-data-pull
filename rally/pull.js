"use strict";

var Multiprogress = require("multi-progress");
var multi = new Multiprogress(process.stderr);

var assert = require('assert'),
	config = require('../config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	ESObject = require('../models/elastic-orm'),
	Revisions = require('../models/revisions'),
	async = require('async');

var RallyAPI = require("./api"),
	SnapshotsFormatter = require('../formatters/snapshots');


const PAGESIZE = 200;

var totalArtifacts = null,
	artifacts = [],
	fetchProgress,
	historyProgress;

class RallyPull {
	static pullRevisions(artifactID, workspaceID) {
		return RallyAPI
			.getArtifactRevisions(artifactID, workspaceID, 0)
			.then((res) => {
				assert(res.Results);

				// Two dimentional array that holds all revisions
				var proms = [];

				// If there are more revisions for this story pull them all
				for (var start = 100; start < res.TotalResultCount; start += 100) {
					proms.push(
						RallyAPI
							.getArtifactRevisions(artifactID, workspaceID, start)
							.then((extraRes) => {
								res.Results = res.Results.concat(extraRes.Results);
							})
					);
				}

				return Promise.all(proms)
					.then(() => {
						// l.debug("res: ", res.Results.length);
						return res.Results;
					});
			});
	}

	static pullHistory (artifact, workspaceID) {
		return RallyPull
			.pullRevisions(artifact.ObjectID, workspaceID)
			.then((results) => {
				if (results.length == 0) {
					// l.warn("No revisions in story: " + artifact.ObjectID);
					return;
				}

				return new SnapshotsFormatter(results)
					.addFormattedID(artifact.FormattedID)
					.getRevisions()
					.then((snapshots) => {
						// l.debug("saved: ", snapshots);
						return new Revisions(snapshots).create();
					});
			})
			.then(historyProgress.tick);
	}

	static pullArtifacts (start, pagesize) {
		assert(pagesize <= 200);

		return RallyAPI
			.getArtifacts(start, 200)
			.then((response) => {
				var end = Math.min(start + PAGESIZE, totalArtifacts);

				if (!response.Results) {
					l.debug("Should never reach here.");
					return response;
				}

				fetchProgress.tick(PAGESIZE);

				return response.Results.map((result) => {
					return {
						ObjectID: result.ObjectID,
						FormattedID: result.FormattedID
					}
				});
			}).then((artifacts) => {
				if (60882613871 in artifacts) {
					l.debug("whatever\n");
				}

				return Promise.all(artifacts.map((artifact) => {
					RallyPull.pullHistory(artifact, config.rally.workspaceID);
				}));
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

				fetchProgress = multi.newBar('Pulling artifacts [:bar] :percent', {
					complete: '=',
					incomplete: ' ',
					width: 40,
					total: 100000
				});

				/*fetchProgress.on('end', function () {
					console.log('\n');
				});*/

				historyProgress = multi.newBar('Pulling history [:bar] :percent', {
					complete: '=',
					incomplete: ' ',
					width: 40,
					total: 100000
				});

				fetchProgress.total = totalArtifacts;
				historyProgress.total = totalArtifacts;

				var starts = [];
				for (var start = 1; start < totalArtifacts; start += PAGESIZE) {
					starts.push(start);
				}

				Promise.reduce(starts, function (total, start) {
					return RallyPull.pullArtifacts(start, PAGESIZE);						
				}).then(() => {
					l.debug("done!");
				});
				// fetchQueue.push(1, function (err) {});

				/*var startFetchTime = new Date().getTime();
				fetchQueue.drain = function () {
					var endFetchTime = new Date().getTime();
					console.log("\ntook " + ((endFetchTime - startFetchTime)/1000) + " secs");

					revisionQueue.push(artifacts, function (err) {});
				};

				revisionQueue.drain = function () {
					var endFetchTime = new Date().getTime();
					console.log("\ntook " + ((endFetchTime - startFetchTime)/1000) + " secs");
				};*/
			});
	}
}

RallyPull.pullAll();
/*RallyPull.pullHistory({
	ObjectID: 14504494816,
	FormattedID: "random"
}, config.rally.workspaceID);*/

module.exports = RallyPull;