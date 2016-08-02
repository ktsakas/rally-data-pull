var config = require('./config/config'),
	l = config.logger,
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

var cachedUsers = {},
	cachedProjects = {};

function RequestRepeatOnError(req) {
	return rp(req)
		.catch((err) => {
			return rp(req);
		})
		.catch((err) => {
			l.error("Connection timedout twice. Exiting...");
			process.exit(1);
		});
}

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

	static getTagName(tagID) {
		if ( !cachedTags[tagID] ) {
			return RequestRepeatOnError({
				timeout: 30000,
				method: 'GET',
				uri: 'https://rally1.rallydev.com/slm/webservice/v2.0/tag/' + tagID,
				qs: {},
				auth: {
					user: config.rally.user,
					pass: config.rally.pass,
					sendImmediately: false
				},
				json: true
			}).then((res) => {
				return res.Tag._refObjectName;
			});
		} else {
			return Promise.resolve(cachedTags[tagID]);
		}
	}

	static getProjectName (projectID) {
		if ( !cachedProjects[projectID] ) {
			return RequestRepeatOnError({
				timeout: 30000,
				method: 'GET',
				uri: 'https://rally1.rallydev.com/slm/webservice/v2.0/Project/' + projectID,
				qs: {},
				auth: {
					user: config.rally.user,
					pass: config.rally.pass,
					sendImmediately: false
				},
				json: true
			}).then((res) => {
				if (res.Project._refObjectName) {
					cachedProjects[projectID] = res.Project._refObjectName;

					return cachedProjects[projectID];
				} else {
					cachedProjects[projectID] = "unknown";

					return cachedProjects[projectID];
				}
			});
		} else {
			return Promise.resolve(cachedProjects[projectID]);
		}
	}

	static getUserName (userID) {
		if ( !cachedUsers[userID] ) {
			return RequestRepeatOnError({
				timeout: 30000,
				method: 'GET',
				uri: 'https://rally1.rallydev.com/slm/webservice/v2.0/user/' + userID,
				qs: {},
				auth: {
					user: config.rally.user,
					pass: config.rally.pass,
					sendImmediately: false
				},
				json: true
			}).then((res) => {
				if (res.User) {
					cachedUsers[userID] = res.User.FirstName +  " " + res.User.LastName;

					return cachedUsers[userID];
				} else {
					cachedUsers[userID] = "unknown";

					return cachedUsers[userID];
				}
			});
		} else {
			return Promise.resolve(cachedUsers[userID]);
		}
	}

	static getDiscussions (artifactID) {
		// TODO
		return RequestRepeatOnError({
			method: 'GET',
			uri: "https://rally1.rallydev.com/slm/webservice/v2.0/artifact/" + artifactID + "/Discussion",
			qs: {},
			auth: {
				user: config.rally.user,
				pass: config.rally.pass,
				sendImmediately: false
			},
			json: true
		});
	}

	static addDiscussionCountToRevisions () {

	}

	static getArtifactRevisions (artifactID, workspaceID) {
		return RequestRepeatOnError({
			timeout: 5000,
			pagesize: 200,
			method: 'GET',
			uri: 'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + config.rally.workspaceID + '/artifact/snapshot/query.js',
			qs: {
				find: '{"ObjectID":' + artifactID + '}',
				fields: true,
				hydrate: '["Project","Release","Iteration","ScheduleState","_PreviousValues.ScheduleState"]'
			},
			auth: {
				user: config.rally.user,
				pass: config.rally.pass,
				sendImmediately: false
			},
			json: true
		}).then((res) => {
			var proms = [],
				p = RallyAPI.getDiscussions(artifactID)
				.then((discussRes) => {
					// console.log("discussions: ", discussRes);

					var discussions = discussRes.Results || [],
						totalPosts = 0;

					res.Results.forEach((_, i) => {
						var exitDate = new Date(RallyAPI._ValidTo);

						discussions.forEach((discussion) => {
							var postDate = new Date(discussion.CreationDate);

							if (postDate.getTime() < exitDate.getTime()) {
								totalPosts++;
							}
						});
						
						res.Results[i].TotalPosts = totalPosts;
					});
				});

			proms.push(p);

			// TODO: eventually remove this or replace with assert
			if (!res.Results) {
				l.error(res);
				process.exit(1);
			}

			res.Results.forEach((revision, i) => {

				res.Results[i].ProjectHierarchy = [];
				revision._ProjectHierarchy.forEach((projectAncestor, j) => {
					// console.log("Item idx: ", j);

					proms.push(
						RallyAPI.getProjectName(projectAncestor).then((projectName) => {
							res.Results[i].ProjectHierarchy[j] = projectName;
						})
					);
				});

				if (revision.Tags) {
					revision.Tags.forEach((tag, j) => {
						// console.log("Item idx: ", j);

						proms.push(
							RallyAPI.getTagName(tag).then((tagName) => {
								res.Results[i].Tags[j] = tagName;
							})
						);
					});
				}

				proms.push(
					RallyAPI.getUserName(res.Results[i]._User).then((userName) => {
						res.Results[i].Author = userName;
					})
				);
			});

			return Promise.all(proms).then(() => { return res; });
		});
	}

	static getArtifacts (start, pagesize) {
		var options = {
			timeout: 60000,
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