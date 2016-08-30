## Install

Install elastic search and kibana.

Follow the installation instructions for [ElasticSearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/_installation.html) and [Kibana](https://www.elastic.co/guide/en/kibana/current/setup.html).
Then run an instance of each.

Run `PUT /{indexname}` to create the index where the data will be stored.

Run the following commands in order:
```
git clone https://github.com/ktsakas/rally-data-pull.git
```

```
cd rally-data-pull
```

```
npm install
```

Setup the following environment variables:
```
RALLY_USER=[the rally username]
RALLY_PASS=[the rally password]
RALLY_APIKEY=[the rally api key]
```

[Read usage next.](/docs/USAGE.md)