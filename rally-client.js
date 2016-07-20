class RallyClient {
	constructor() {

	},

	static pullAll () {
		start = start || 1;

		restApi.query({
			type: 'artifact',
			scope: {
				workspace: "https://rally1.rallydev.com/slm/webservice/v2.0/workspace/5339961604",
			},
			start: start,
			pageSize: 1,
			fetch: "true"
		}, function(error, result) {
			// console.log("raw: ", result.Results[0]);
			var mappedArtifacts = result.Results.map(artifactTranslator.translate.bind(artifactTranslator));

			var count = result.Results.length;
			console.log(count);

			if (count == 200) {
				pullAll(start + 200);
			}

			esClient.bulk({
				body: toElastic(mappedArtifacts)
			}, function (err, resp) {
				console.log("error: ", err);
				console.log("resp: ", resp.items[0]);
				if (err) console.log(err);
				else console.log(resp.took);
			});
		});
	}
}

module.exports = RallyClient;