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