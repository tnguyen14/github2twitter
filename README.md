# github2twitter

> bot to publish github notifications to twitter

This app check Github's [user's received events API](https://developer.github.com/v3/activity/events/#list-events-that-a-user-has-received) and publish any new event to a twitter account every 10 minutes. The app is meant to be run with Heroku. Once pushed to a heroku app, do the following:

- `heroku addons:add mongohq`
- `heroku addons:add scheduler`
- Schedule the scehduler to run `node lib/github2twitter.js` every 10 minutes.

If there are more than 1 event to update, the updates are staggered out in 1 minute interval by default. This stagger interval can be changed through the environment variable.

### Environment Variables needed to run

- `MONGOHQ_URL`
- `GITHUB_USERNAME`
- `TWITTER_CONSUMER_KEY`
- `TWITTER_CONSUMER_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_TOKEN_SECRET`
- `TWITTER_STAGGER` (optional, default to 60000 (1 minute))

## License

Copyright (c) 2014 Tri Nguyen
Licensed under the MIT license.
