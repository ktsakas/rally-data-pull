var elasticsearch = require('elasticsearch');
var faker = require('faker');
var client = new elasticsearch.Client({
	host: 'localhost:9200',
	log: 'error'
});

// Checkout priority distribution
// Stream high priority tickets
// Find percentage of tickets that match help documents
// Find users with most or multiple tickets
// Check trends in ticket tags
// Detect more requests than usual

function rand (min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

/*
ticket mapping
*/
var mapping = { 
    "_all":       { "enabled": false  }, 
    "properties": { 
        "name": { "type": "string"  }, 
        "email":  { "type": "string"  }, 
        "title": { "type": "string" },
        "description": { "type": "string" },
        "priority": { "type": "integer" },
        "tags": { "type": "nested", "properties": { "": "" } },
        "date": { "type": "date", "format": "date_optional_time" }
    }
};

function generateData (n) {
	var priorities = [0, 1, 2, 3];
	var possibleTags = [ 'reservations', 'media', 'marketing', 'conversion', 'data', 'bi' ];

	var batch = [];
	for (var i= 0; i < n; i++) {
		batch.push({ index: { "_index": "customer", "_type": "ticket" } });

		batch.push({
			name: faker.name.findName(),
			email: faker.internet.email(),
			title: "",
			description: "",
			priority: rand(0, 4),
			tags: [ possibleTags[rand(0, possibleTags.length)] ],
			date: new Date().toISOString()
		});
	}

	return batch;
}

client.ping({
	requestTimeout: Infinity
}, function (error) {
	if (error) console.log("Elastic server is down!");
	else console.log("Database is up on localhost:9200");


	client.bulk({
		body: generateData(10000)
	}, function (err, resp) {
		console.log("Bulk insert: ", resp.took);
	});

});