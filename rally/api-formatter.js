var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('./api-calls'),
	FormatUtils = require('./format-utils');

class APIFormatter {
	constructor (obj) {
		this.obj = obj;
	}

	addDiscussionCount () {
		var obj = this.obj;

		if (!obj[0]) {
			l.debug("obj: ", obj);
			process.exit(1);
		}

		return RallyAPI
			.getDiscussions(obj[0].ObjectID)
			.then((discussions) => {
				var totalPosts = 0;

				obj.forEach((revision, i) => {
					var exitDate = new Date(revision._ValidTo);

					discussions.forEach((discussion) => {
						var postDate = new Date(discussion.CreationDate);

						if (postDate.getTime() <= exitDate.getTime()) totalPosts++;
					});
					
					obj[i].TotalPosts = totalPosts;
				});
			});
	}

	hydrateProjectHierarchy () {
		var proms = [],
			obj = this.obj;

		obj.forEach((revision, i) => {
			revision._ProjectHierarchy.forEach((projectAncestor, j) => {
				var p = RallyAPI.getProjectName(projectAncestor).then((projectName) => {
					obj[i]._ProjectHierarchy[j] = projectName;
				});

				proms.push(p);
			});
		});

		return Promise.all(proms);
	}

	hydrateTagNames () {
		var proms = [];

		this.obj.forEach((revision, i) => {
			if (!revision.Tags) return;

			revision.Tags.forEach((tag, j) => {
				var p = RallyAPI.getTagName(tag).then((tagName) => {
					this.obj[i].Tags[j] = tagName;
				});

				proms.push(p);
			});
		});

		return Promise.all(proms);
	}

	hydrateAuthor () {
		var proms = 
			this.obj.map((revision, i) => {
				return RallyAPI
					.getUserName(this.obj[i]._User)
					.then((userName) => { this.obj[i].Author = userName; });
			});

		return Promise.all(proms);
	}

	parseFields () {
		var obj = this.obj;

		obj.forEach((revision, i) => {
			// Parsing
			obj[i] = FormatUtils.flatten(obj[i]);
			FormatUtils.renameFields(obj[i], 'api');
			FormatUtils.removeUnused(obj[i]);
			FormatUtils.nullMissingFields(obj[i]);
			obj[i] = FormatUtils.unflatten(obj[i]);

			FormatUtils.parseDates(obj[i]);
			FormatUtils.addDummyData(obj[i]);
		});

		return this;
	}

	formatArtifactHistory () {
		var proms = [],
			that = this;

		proms.push( this.addDiscussionCount() );
		proms.push( this.hydrateProjectHierarchy() );
		proms.push( this.hydrateTagNames() );
		proms.push( this.hydrateAuthor() );

		return Promise
			.all(proms)
			.then( this.parseFields.bind(this) )
			.then(() => that.obj);

	}
}

/*new APIFormatter(testObj.Results).formatArtifactHistory((obj) => {
	l.debug(obj);
});*/

module.exports = APIFormatter;