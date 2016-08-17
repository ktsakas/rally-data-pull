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

var fetchQueue = async.queue(function (start, callback) {
	RallyPull.pullArtifacts(start, PAGESIZE).then(callback);
}, 1);

var revisionQueue = async.queue(function (artifact, callback) {
	RallyPull.pullHistory(artifact, config.rally.workspaceID).then(callback);
}, 1);

class RallyPull {
	static pullRevisions(artifactID, workspaceID) {
		return RallyAPI
			.getArtifactRevisions(artifactID, workspaceID, 1)
			.then((res) => {
				if (!res.Results) {
					l.debug("res: ", res);
					process.exit(1);
				}

				assert(res.Results);

				// Two dimentional array that holds all revisions
				var proms = [];

				// If there are more revisions for this story pull them all
				for (var start = 100; start < res.TotalResultCount; start += 100) {
					proms.push(
						RallyAPI
							.getArtifactRevisions(artifactID, workspaceID, 1 + start)
							.then((extraRes) => {
								res.Results = res.Results.concat(extraRes.Results);
							})
					);
				}

				return Promise.all(proms)
					.then(() => res.Results);
			});
	}

	static pullHistory (artifact, workspaceID) {
		return RallyPull
			.pullRevisions(artifact.ObjectID, workspaceID)
			.then((results) => {

				if (results.length == 0) {
					// l.warn("zero results");
					return;
				}

				return new SnapshotsFormatter(results)
					.addFormattedID(artifact.FormattedID)
					.formatSnapshots()
					.then((snapshots) => {
						return new Revisions(snapshots).save();
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

				response.Results.forEach((result) => artifacts.push({
					ObjectID: result.ObjectID,
					FormattedID: result.FormattedID
				}));

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

				var promises = [];
				for (
					var start = 1;
					start < totalArtifacts;
					start += PAGESIZE
				) {
					fetchQueue.push(start, function (err) {});
				}
				// fetchQueue.push(1, function (err) {});

				var startFetchTime = new Date().getTime();
				fetchQueue.drain = function () {
					var endFetchTime = new Date().getTime();
					console.log("\ntook " + ((endFetchTime - startFetchTime)/1000) + " secs");

					revisionQueue.push(artifacts, function (err) {});
				};

				revisionQueue.drain = function () {
					var endFetchTime = new Date().getTime();
					console.log("\ntook " + ((endFetchTime - startFetchTime)/1000) + " secs");
				};
			});
	}
}

RallyPull.pullAll();
/*RallyPull.pullHistory({
	ObjectID: 59466256565,
	FormattedID: "random"
}, 6692415259);*/

module.exports = RallyPull;