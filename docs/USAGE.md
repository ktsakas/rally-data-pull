## Usage

### Pulling in the data
Run `node rally/pull.js` to pull in all the data.

Note: I have noticed that some days the Rally service might be slow and connections tend to time out.
In that case the script will exit, run it again since data is cached it will incrementally be able to pull all data.

### Receiving webhooks
To run a server that recieves webhooks:
* Set the URL of the server on config.js
* Register the webhook on Rally, by running `node rally/create-webhook.js`
* Run `node server.js` to listen for incoming webhooks.


## Importing new fields
Assume that you want to import a new custom attribute called "MyField" from Rally.
The process would be as follows:
* Call the revision API to find the key that corresponds to the attribute.
    - `GET https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/6692415259/artifact/snapshot/query.js?find={"ObjectID":7258286927}&fields=true&hydrate=["Release","Project","Iteration","ScheduleState","_PreviousValues.ScheduleState","Tags"]&pagesize=10`
* Use [Mockbin](http://mockbin.org/) to recieve a webhook request for a user story and find the key that corresponds to the attribute.
* Add an object of the following format to mappings.json:
```
"{field name in elastic}": {
    "api": "{attribute name returned by revision api}",
    "hook": "{attribute name returned in the webhook recieved}"
}
```
* Add the field to schema.json.

**Almost always** the key in for a custom returned by the api follows a standard format (look at mappings.json), so you will not need to follow the first two steps.