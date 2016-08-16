var config = require("../config/config"),
	l = config.logger,
	fs = require('fs'),
	testObj = JSON.parse(fs.readFileSync('trash/revisions.json', 'utf8')),
	RallyAPI = require('../rally/api'),
	FormatUtils = require('./utils');

class SnapshotFormatter extends FormatUtils {
	constructor (obj) {
		super(obj);
	}

	/*addDiscussionCount () {
		var self = this;

		return RallyAPI
			.getDiscussions(self.objObjectID)
			.then((discussions) => {
				var totalPosts = 0;

				self.obj.forEach((revision, i) => {
					var exitDate = new Date(revision._ValidTo);

					discussions.forEach((discussion) => {
						var postDate = new Date(discussion.CreationDate);

						if (postDate.getTime() <= exitDate.getTime()) totalPosts++;
					});
					
					self.obj[i].TotalPosts = totalPosts;
				});
			});
	}*/

	hydrateProjectHierarchy () {
		this.obj.ProjectHierarchy = [];

		var self = this,
			proms = this.obj._ProjectHierarchy.map((projectAncestor, j) => {
				return RallyAPI
					.getProjectName(projectAncestor)
					.then((projectName) => {
						self.obj.ProjectHierarchy[j] = projectName;
					});
			});

		return Promise.all(proms);
	}

	hydrateTagNames () {
		this.obj.Tags = this.obj.Tags || [];

		var proms = this.obj.Tags.map((tag, j) => {
			return RallyAPI
				.getTagName(tag)
				.then((tagName) => {
					this.obj.Tags[j] = tagName;
				});
		});

		return Promise.all(proms);
	}

	hydrateAuthor () {
		return RallyAPI
			.getUserName(this.obj._User)
			.then((userName) => {
				this.obj.Author = userName;
			});
	}

	parseDates () {
		if ( new Date(this.obj.Exited).getYear() == 8098 ) {
			this.obj.Exited = null;
		}

		super.parseDates();
	}

	parseFields () {
		this.schemaFormat('api');
		this.parseDates();

		return this;
	}

	formatSnapshot () {
		var proms = [],
			self = this;

		// proms.push( this.addDiscussionCount() );
		proms.push( this.hydrateProjectHierarchy() );
		proms.push( this.hydrateTagNames() );
		proms.push( this.hydrateAuthor() );

		return Promise
			.all(proms)
			.then( this.parseFields.bind(this) )
			.then(() => self.obj);

	}
}

new SnapshotFormatter(testObj.Results[0]).formatSnapshot().then((obj) => {
	l.debug(obj);
});

module.exports = SnapshotFormatter;