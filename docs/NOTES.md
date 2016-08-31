## Research Notes
Everything I run into while pulling in the data, it might be helpful for anyone making changes to the project in order to avoid known issues.


### About the Rally API
* This project is using the following:
    - [Rally Webservice API](https://rally1.rallydev.com/slm/doc/webservice/)
    - [Lookback API](https://rally1.rallydev.com/analytics/doc/#/manual)
    - [Webhooks API](https://rally1.rallydev.com/notifications/docs/webhooks) to keep the data realtime.
    - Notice that we are not using the Rally SDK.
* Logging into the Webservice/Lookback API is done with [Basic Auth](https://en.wikipedia.org/wiki/Basic_access_authentication) (requires username and password), however authorization to the Webhooks API is done using an API key sent as a cookie.
* Running example queries on the documentation will use the selected workspace, so choose the TravelClick workspace before running queries through the documentation.

### Bugs encountered
* Some User Stories in the Lookback API return no revisions. To reproduce run the following queries:
    - `GET https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/6692415259/artifact/snapshot/query.js?find={"ObjectID":10457675103}`
    - `GET https://rally1.rallydev.com/slm/webservice/v2.0/revisionhistory/10457675104`
* A ticket has been filed with Rally and can be found [here](https://rallycommunity.rallydev.com/cases/detail?id=50014000010P5t4AAC).
* Some of the Revisions returned are missing the user story's UUID (all of the have an ID though).
* It is not possible to set a webhook for a custom attribute, currently a webhook is set for the entire TravelClick workspace.
* Revision dates from the Lookback API do not always return as ISO8601 format.

### Suggestions
* [Postman](https://www.getpostman.com/) is very helpful in testing api requests.
* When you are developing locally use [ngrok](https://ngrok.com/) to get a temporary public url.
* Update to ElasticSearch and Kibana 5 in the future:
    - The plugin system has not changed between Kibana 4 and 5, but unfortunately currently has no documentation. Hopefully, in version 5 they will release documentation so you can make custom panels and leverage more community plugins.
    - The updated scripting language ([Painless](https://www.elastic.co/guide/en/elasticsearch/reference/master/modules-scripting-painless.html)) is available in Kibana 5, making it possible to visualize revisions relative to the current date.
    - [Multiple selection](https://github.com/elastic/kibana/issues/3693)
    - [Export search to CSV](https://github.com/elastic/kibana/issues/1992)
        + Note: this is currently only possible for visualizations/aggregations.
