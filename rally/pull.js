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
}, 200);

var revisionQueue = async.queue(function (artifact, callback) {
	RallyPull.pullHistory(artifact, config.rally.workspaceID).then(callback);
}, 50);

class RallyPull {
	static pullHistory (artifact, workspaceID) {		
		return RallyAPI
			.getArtifactRevisions(artifact.ObjectID, workspaceID)
			.then((res) => {
				return new SnapshotsFormatter(res.Results)
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

module.exports = RallyPull;