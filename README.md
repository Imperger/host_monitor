## About

Host Monitor is a simple hosts monitoring service with notifications. Currently supports monitoring only through pinging and tcp port check with notifications through a telegram channel.

## Configuration

Configuration file has three parts. In the `watch` section, the monitoring targets, the type and interval of the scans, as well as notification templates for monitoring events are specified. The `sinks` section contains the destination points for unloading monitoring events. There is the **console** predefined sink that just redirects to stdout. Some sinks may required credentials that can be configured in `credentials` section.

In the notification templates available few variables.

`$now` - current time. Formatting affected by `locale` and `timeZone`

`$host` - `hostname` property

`$elapsed` - time elapsed from last changing host state

In addition, with tcp-port monitor available few extra variables:

`$port` - port

`$ipv` - ip version

### Example

`config.json` should be in the mounted folder.

```json
{
  "locale": "en-US",
  "timeZone": "Europe/Kyiv",
  "credentials": {
    "myTgBot": {
      "type": "tg", // credentials type
      "token": "bot-token"
    }
  },
  "sinks": {
    "someTgChannel": {
      "type": "tg", // sink type
      "credentials": "myTgBot", // credentials previously defined above
      "channelId": -1001234567890
    }
  },
  "watch": [
    {
      "hostname": "8.8.8.8", // target host
      "ipVersion": "4", // 4 or 6, may be omitted
      "monitor": "ping", // monitor type
      "interval": 5, // in seconds
      "onAliveTemplate": "🟩 $now $host now online, offline time $elapsed",
      "onDeadTemplate": "🟥 $now $host now offline, online time $elapsed",
      "sink": [
        "someTgChannel", // sink previously defined above
        "console" // predefined sink
      ]
    },
    {
      "hostname": "google.com",
      "port": 443,
      "ipVersion": "4",
      "monitor": "tcp-port",
      "timeout": 400, // in milliseconds
      "interval": 5,
      "onAliveTemplate": "🟩 $now ipv$ipv $host:$port now online, offline time $elapsed",
      "onDeadTemplate": "🟥 $now ipv$ipv $host:$port now offline, online time $elapsed",
      "sink": [
        "someTgChannel", // sink previously defined above
        "console" // predefined sink
      ]
    }
  ]
}
```

## Deploy

```
docker build -t host_watcher --no-cache .

docker run --rm -d -v ${PWD}/data:/app/data host_watcher
```
