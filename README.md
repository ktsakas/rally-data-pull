## PULL DATA AND RECIEVE WEBHOOKS FROM RALLY

### Installation



### Usage

### Project Structure
* config
    - /config.js: all configuration options
    - /mappings.json: defines how to object keys from an api call or a webhook to the elastic search field names
    - /schema.json: defines the elastic search schema
    - /tracked.json: defines which fields are tracked for changes
* formatters: all formatting functionality convert api responses and webhooks to elastic search documents
    - /utils.js: formatting utilities
    - /base.js: all formatting operations common between snapshots and webhooks
    - /snapshot.js: formatting class for a single snapshot
    - /snapshots.js: formatting class for multiple snapshots
    - /webhook.js: formatting class for webhooks
* models:
    - /elastic-orm.js: wrapper arround the elastic search client to allow for easier querying
    - /revision.js: model of a single revision
    - /revisions.js: model for multiple revisions
* rally:
    - /api.js: class that makes api calls to rally
    - /pull.js: pulls all historical data from rally and stores them into elastic
    - /create-webhook.js: registers a webhook for a specific workspace in Rally
* wrapped-request.js: a wrapper around `request.js` to provide the following utilities:
    - Repeat a request if it times out
    - Cache all request results to disk (helpful during development in order to change the model easily)
    - Limit the maximum number of concurrent requests.
* server.js: Runs a server to recieve Rally webhooks.