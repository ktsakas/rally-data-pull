"use strict";

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

const ENDPOINTS = {
	WORKSPACE: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/",
	PROJECT: "https://rally1.rallydev.com/slm/webservice/v2.0/project/",
	TAG: "https://rally1.rallydev.com/slm/webservice/v2.0/tag/",
	USER: "https://rally1.rallydev.com/slm/webservice/v2.0/user/",
	ARTIFACT: "https://rally1.rallydev.com/slm/webservice/v2.0/artifact/"
};

var workspaceURL = "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/" + config.rally.workspaceID,
	projectURL = "https://rally1.rallydev.com/slm/webservice/v2.0/project/" + config.rally.projectID;

var cachedUsers = {},
	cachedProjects = {};

class RallyAPI {
	static getTags (artifactID) {
		return new rp({ method: 'GET', uri: ENDPOINTS.ARTIFACT + artifactID + "/Tags" })
			.then((res) => {
				return res.QueryResult.Results.map((tag) => tag.Name);
			});
	}

	static getProject (projectID) {
		if ( cachedProjects[projectID] ) {
			return Promise.resolve(cachedProjects[projectID]);
		}

		return new rp({ method: 'GET', uri: ENDPOINTS.PROJECT + projectID })
			.then((res) => {
				cachedProjects[projectID] = res.Project;

				return cachedProjects[projectID];
			});
	}

	static getUserName (userID) {
		if (cachedUsers[userID]) {
			return Promise.resolve(cachedUsers[userID]);
		}

		return new rp({ method: 'GET', uri: ENDPOINTS.USER + userID })
			.then((res) => {
				if (res.User) {
					cachedUsers[userID] = res.User.FirstName +  " " + res.User.LastName;
				// TODO: Fix this
				} else {
					cachedUsers[userID] = "unknown";
				}

				return cachedUsers[userID];
			});
	}

	static getProjectChildren (projectID) {
		var projectChildrenURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/Project/' + projectID + '/Children';

		return new rp({ method: 'GET', uri: projectChildrenURL })
			.then((res) => res.QueryResult.Results);
	}

	static getDiscussions (artifactID) {
		return new rp({ method: 'GET', uri: ENDPOINTS.ARTIFACT + artifactID + "/Discussion" })
			// TODO: fix some requests are giving maintenance error
			.then((res) => res.QueryResult ? res.QueryResult.Results : []);
	}

	static getArtifactRevisions (artifactID, workspaceID) {
		var lookbackURL =
			'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + workspaceID + '/artifact/snapshot/query.js';

		return new rp({
			pagesize: 200,
			method: 'GET',
			uri: lookbackURL,
			qs: {
				find: '{"ObjectID":' + artifactID + '}',
				fields: true,
				hydrate: '["Project","Release","Iteration","ScheduleState","_PreviousValues.ScheduleState"]'
			}
		});
	}

	static getArtifacts (start, pagesize) {
		var options = {
			method: 'GET',
			uri: ENDPOINTS.ARTIFACT,
			qs: {
				workspace: workspaceURL,
				pagesize: pagesize,
				start: start,
				fetch: "true"
			}
		};

		if (config.rally.projectID) {
			options.qs.project = ENDPOINTS.PROJECT + config.rally.projectID;
		}

		return new rp(options).then((res) => res.QueryResult);
	}

	static countArtifacts () {
		var options = {
			method: 'GET',
			uri: ENDPOINTS.ARTIFACT,
			qs: {
				workspace: workspaceURL,
				pagesize: 1
			}
		};

		if (config.rally.projectID) {
			options.qs.project = ENDPOINTS.PROJECT + config.rally.projectID;
		}

		return new rp(options).then((res) => res.QueryResult.TotalResultCount);
	}
}

module.exports = RallyAPI;