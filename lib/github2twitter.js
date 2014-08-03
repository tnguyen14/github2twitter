/*
 * github2twitter
 * http://tridnguyen.com
 *
 * Copyright (c) 2014 Tri Nguyen
 * Licensed under the MIT license.
 */

'use strict';

var async = require('async'),
  fs = require('fs'),
  request = require('request'),
  Handlebars = require('handlebars'),
  mongo = require('mongod'),
  _ = require('lodash'),
  Promise = require('promise'),
  Twit = require('twit'),
  moment = require('moment-timezone');

var DBURL = process.env.MONGOHQ_URL || 'mongodb://127.0.0.1:27017/github2twitter';
var db = mongo(DBURL, ['events']);

var SUPPORTED_EVENTS = ['IssueCommentEvent', 'IssuesEvent', 'PushEvent', 'CreateEvent', 'ForkEvent', 'WatchEvent'];
var readFile = Promise.denodeify(fs.readFile);

Handlebars.registerHelper('isEqual', function (a, b, options) {
  if (a === b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

Handlebars.registerHelper('branchName', function (ref) {
  return ref.replace(/refs\/heads\//, '');
});

var tweetContent = function (event) {
  return readFile('./templates/' + event.type + '.hbs', 'utf8').then(function (template) {
    var template = Handlebars.compile(template);
    return template(event);
  }, function (err) {
    console.log('error reading template: ' + err);
  });
}

request.get('https://api.github.com/users/tnguyen14/received_events', {
  headers: {
    'User-Agent': 'request',
    // 'Authorization': 'token ' + process.env.GITHUB_TOKEN /*received events does not need authorization */
  }
}, function (err, response, body) {
  var events = JSON.parse(body);
  var T;
  try {
    T = new Twit({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token: process.env.TWITTER_ACCESS_TOKEN,
      access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
  } catch (e) {
    console.log(e);
  }
  Promise.all(_.map(events, function (e) {
    return db.events.findOne({id: e.id}).then(function (item) {
      if (!item) {
        return db.events.insert(e).then(function () {
          if (_.indexOf(SUPPORTED_EVENTS, e.type) !== -1) {
            return tweetContent(e);
          } else {
            console.log('Unsupported event type ' + e.type + ' for event ' + e.id);
          }
        });
      }
    })
  })).then(function (contentArr) {
    _.each(contentArr, function (eventContent) {
      if (eventContent) {
        if (T) {
          T.post('statuses/update', {status: eventContent}, function (err, data, response) {});
        }
      }
    });
  }, function (err) {
    console.log(err);
  });
});

