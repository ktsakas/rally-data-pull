"use strict";

var config = require('../config/config'),
	l = config.logger,
	Promise = require('bluebird'),
	assert = require('assert'),
	rp = require('../wrapped-request').defaults({
		timeout: 30000,
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

/**
 * This class is responsible for all calls to the Rally API.
 * 
 * Any other class trying to fetch data from a Rally API should use the methods of this class.
 */
class RallyAPI {
	/**
	 * Get all tags for a given artifact.
	 * 
	 * @param  {integer} artifactID
	 * @return {promise}
	 */
	static getTags (artifactID) {
		assert(artifactID);

		return rp({ method: 'GET', uri: ENDPOINTS.ARTIFACT + artifactID + "/Tags" })
			.then((res) => {
				if (!res.QueryResult) {
					l.debug("undef: ", typeof res);
					process.exit(1);
				}

				return res.QueryResult.Results.map((tag) => tag.Name);
			});
	}

	/**
	 * Get the project details based on the project id.
	 * 
	 * @param  {integer} projectID
	 * @return {promise}
	 */
	static getProject (projectID) {
		assert(projectID);

		if ( cachedProjects[projectID] ) {
			return Promise.resolve(cachedProjects[projectID]);
		}

		return rp({ method: 'GET', uri: ENDPOINTS.PROJECT + projectID })
			.then((res) => {
				cachedProjects[projectID] = res.Project;

				return cachedProjects[projectID];
			});
	}

	/**
	 * Get the user name for a given user id.
	 * Caches user names in memory after the first fetch.
	 * 
	 * @param  {integer} userID
	 * @return {promise}
	 */
	static getUserName (userID) {
		assert(userID);

		if (cachedUsers[userID]) {
			return Promise.resolve(cachedUsers[userID]);
		}

		return rp({ method: 'GET', uri: ENDPOINTS.USER + userID })
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

	/**
	 * Returns all child projects (the full objects) of a given project.
	 * 
	 * @param  {integer} projectID
	 * @return {promise}
	 */
	static getProjectChildren (projectID) {
		var projectChildrenURL = 'https://rally1.rallydev.com/slm/webservice/v2.0/Project/' + projectID + '/Children';

		return rp({ method: 'GET', uri: projectChildrenURL })
			.then((res) => res.QueryResult.Results);
	}

	/**
	 * Gets all discussions for a given artifact.
	 * 
	 * @param  {integer} artifactID
	 * @return {promise}
	 */
	static getDiscussions (artifactID) {
		return rp({ method: 'GET', uri: ENDPOINTS.ARTIFACT + artifactID + "/Discussion" })
			// TODO: fix some requests are giving maintenance error
			.then((res) => res.QueryResult ? res.QueryResult.Results : []);
	}

	/**
	 * Gets up to 100 revisions(changes) for a given artifact.
	 * 
	 * @param  {integer} artifactID
	 * @param  {integer} workspaceID
	 * @param  {integer} start	the revision to start from
	 * @return {promise}
	 */
	static getArtifactRevisions (artifactID, workspaceID, start) {
		assert(artifactID);
		assert(workspaceID);

		var lookbackURL =
			'https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/' + workspaceID + '/artifact/snapshot/query.js';

		return rp({
			method: 'GET',
			uri: lookbackURL,
			qs: {
				pagesize: 100,
				start: start || 0,
				find: '{"ObjectID":' + artifactID + '}',
				fields: true,
				hydrate: '["Project","Release","Iteration","ScheduleState","_PreviousValues.ScheduleState"]'
			}
		})
		.then((res) => {
			if (!res.Results) {
				l.debug(typeof res);
				l.debug("res: ", res);
				process.exit(1);
			}

			return res;
		});
	}

	/**
	 * Gets up to 200 artifacts.
	 * 
	 * @param  {integer} start	the artifact to start from
	 * @param  {integer} pagesize
	 * @return {promise}
	 */
	static getArtifacts (start, pagesize) {
		var options = {
			method: 'GET',
			uri: ENDPOINTS.ARTIFACT,
			qs: {
				workspace: workspaceURL,
				pagesize: pagesize,
				start: start,
				query: '(c_StoryType = "L3/Salesforce")',
				// Pull in newest first
				order: "CreationDate desc",
				fetch: "true"
			}
		};

		/*if (config.rally.projectID) {
			options.qs.project = ENDPOINTS.PROJECT + config.rally.projectID;
		}*/

		return rp(options).then((res) => res.QueryResult);
	}

	/**
	 * Returns the number of artifacts we are trying to fetch the history for.
	 * Can also be used to ping the Rally server.
	 * 
	 * @return {promise} resolves to an integer with the number of artifacts.
	 */
	static countArtifacts () {
		var options = {
			method: 'GET',
			uri: ENDPOINTS.ARTIFACT,
			qs: {
				workspace: workspaceURL,
				pagesize: 1,
				query: '(c_StoryType = "L3/Salesforce")'
			}
		};

		/*if (config.rally.projectID) {
			options.qs.project = ENDPOINTS.PROJECT + config.rally.projectID;
		}*/

		return rp(options)
			.then((res) => res.QueryResult.TotalResultCount)
			.catch((err) => {
				if (err.response && err.response.statusCode == 401) {
					l.error("Failed to authenticate with credentials: ", config.rally.user, config.rally.pass);
				} else {
					l.error("Could not connect to api.", err);
				}
					
				process.exit(1);
			});
	}
}

module.exports = RallyAPI;