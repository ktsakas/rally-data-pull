var config = require('../config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	rp = require('../wrapped-request').defaults({
		timeout: 10000,
		auth: {
			user: config.rally.user,
			pass: config.rally.pass,
			sendImmediately: false
		},
		cache: true,
		json: true
	});

var workspaceURL = "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/" + config.rally.workspaceID,
	projectURL = "https://rally1.rallydev.com/slm/webservice/v2.0/project/" + config.rally.projectID;

var cachedUsers = {},
	cachedProjects = {},
	cachedTags = {};

class RallyAPI {
	static getTagName(tagID) {
		if ( cachedTags[tagID] ) return Promise.resolve(cachedTags[tagID]);

		var tagURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/tag/' + tagID;

		return new rp({ method: 'GET', uri: tagURL })
			.then((res) => res.Tag._refObjectName);
	}

	static getProjectName (projectID) {
		if ( cachedProjects[projectID] ) return Promise.resolve(cachedProjects[projectID]);

		var projectURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/Project/' + projectID;

		return new rp({ method: 'GET', uri: projectURL, })
			.then((res) => {
				if (res.Project._refObjectName) {
					cachedProjects[projectID] = res.Project._refObjectName;

					return cachedProjects[projectID];
				} else {
					cachedProjects[projectID] = "unknown";

					return cachedProjects[projectID];
				}
			});
	}

	static getUserName (userID) {
		if ( !cachedUsers[userID] ) {
			var userURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/user/' + userID;

			return new rp({ method: 'GET', uri: userURL })
				.then((res) => {
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
		var discussionURL = 
			"https://rally1.rallydev.com/slm/webservice/v2.0/artifact/" + artifactID + "/Discussion";

		return new rp({ method: 'GET', uri: discussionURL })
			// TODO: fix some requests are giving maintenance error
			.then((res) => res.QueryResult ? res.QueryResult.Results : []);
	}

	static getArtifactRevisions (artifact, workspaceID) {
		var lookbackURL =
			'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + config.rally.workspaceID + '/artifact/snapshot/query.js';

		return new rp({
			pagesize: 200,
			method: 'GET',
			uri: lookbackURL,
			qs: {
				find: '{"ObjectID":' + artifact.ObjectID + '}',
				fields: true,
				hydrate: '["Project","Release","Iteration","ScheduleState","_PreviousValues.ScheduleState"]'
			}
		});/*.then((res) => {
			if (!res.Results[0]) {
				l.debug(lookbackURL);
				l.debug(artifact.ObjectID);
				l.debug("results: ", res);
				res.Results = [];
			}

			return res;
		});*/ /*.then((res) => {
			

			var proms = [],
				p = RallyAPI
				.getDiscussions(artifact.ObjectID)
				.then((discussions) => {
					var totalPosts = 0;

					res.Results.forEach((revision, i) => {
						var exitDate = new Date(revision._ValidTo);

						discussions.forEach((discussion) => {
							var postDate = new Date(discussion.CreationDate);

							if (postDate.getTime() <= exitDate.getTime()) {
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
				res.Results[i].FormattedID = artifact.FormattedID;

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
		});*/
	}

	static getArtifacts (start, pagesize) {
		var artifactURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact/';

		var options = {
			method: 'GET',
			uri: artifactURL,
			qs: {
				workspace: workspaceURL,
				pagesize: pagesize,
				start: start,
				fetch: "true"
			}
		};

		if (config.rally.projectID) {
			options.qs.project = projectURL;
		}

		return new rp(options).then((res) => res.QueryResult);
	}

	static countArtifacts () {
		var artifactURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/artifact/';

		var options = {
			method: 'GET',
			uri: artifactURL,
			qs: {
				workspace: workspaceURL,
				pagesize: 1
			}
		};

		if (config.rally.projectID) {
			options.qs.project = projectURL;
		}

		return new rp(options).then((res) => res.QueryResult.TotalResultCount);
	}
}

l.debug("get rally: ", RallyAPI.getDiscussions);

module.exports = RallyAPI;