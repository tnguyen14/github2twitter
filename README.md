# github2twitter

> publish github notifications to twitter

![GH2TW Logo](https://cdn.rawgit.com/tnguyen14/github2twitter/master/logo.svg 'GH2TW Logo')

This app check Github's [user's received events API](https://developer.github.com/v3/activity/events/#list-events-that-a-user-has-received) every 5 minutes and publish any new event to a twitter account. This app can be deployed with docker.

### Usage

```sh
:; docker-compose up -d
```

### Stagger
If there are more than 1 event to update, the updates are staggered out in 1 minute interval by default. This stagger interval can be changed through the environment variable `TWITTER_STAGGER`.

### Private Events
If a `GITHUB_TOKEN` env variable is set, the app will authorize with Github's API and get private events as well. If it is not set, it defaults to public events.

### Environment Variables needed to run

- `GITHUB_USERNAME`
- `GITHUB_TOKEN` (optional, enable private events)
- `TWITTER_CONSUMER_KEY`
- `TWITTER_CONSUMER_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`
- `TWITTER_STAGGER` (optional, default to 60000 (1 minute))

## License

Copyright (c) 2015 Tri Nguyen
Licensed under the MIT license.
