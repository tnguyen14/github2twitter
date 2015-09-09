/*
 * github2twitter
 * http://tridnguyen.com
 *
 * Copyright (c) 2015 Tri Nguyen
 * Licensed under the MIT license.
 */

'use strict';

var fs = require('fs');
var request = require('request-promise');
var Handlebars = require('handlebars');
var mongo = require('mongod');
var Promise = require('promise');
var Twit = require('twit');
var moment = require('moment-timezone');
var readFile = Promise.denodeify(fs.readFile);

var DBURL = 'mongodb://mongodb:27017/github2twitter';
var db = mongo(DBURL, ['events']);

var twitterStagger = process.env.TWITTER_STAGGER || 60000;

var SUPPORTED_EVENTS = [
	'IssueCommentEvent',
	'IssuesEvent',
	'PushEvent',
	'CreateEvent',
	'ForkEvent',
	'WatchEvent',
	'PullRequestEvent',
	'PullRequestReviewCommentEvent'
];

var Twitter;
try {
	Twitter = new Twit({
		consumer_key: process.env.TWITTER_CONSUMER_KEY,
		consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
		access_token: process.env.TWITTER_ACCESS_TOKEN,
		access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
	});
} catch (e) {
	console.error(e);
}

// Handlebars helpers for event templates
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

// Parse template and apply content from event object to template
var tweetContent = function (event) {
	return readFile('./templates/' + event.type + '.hbs', 'utf8').then(function (template) {
		var template = Handlebars.compile(template);
		return template(event);
	}, function (err) {
		console.error('Error reading template for' + event.type  +': ' + err);
	});
};

// Post a tweet update to Twitter, staggered by the twitterStagger time
var postTweet = function (eventContent) {
	return new Promise(function (resolve, reject) {
		if (!Twitter) {
			return reject(new Error('Unable to post update for event "' + eventContent + '".'));
		}
		// @TODO: this timeout should be set where this function is called
		// wait 1s in between status update
		setTimeout(function () {
			Twitter.post('statuses/update', {status: eventContent}, function (err, data, response) {
				if (err) {
					console.error('Unable to post tweet: ' + eventContent);
					reject(err);
				}
				resolve();
			});
		}, twitterStagger);
	});
};

module.exports = function () {
	console.log('Sending request to Github API...');
	// Starting the main task execution
	var headers = {
		'User-Agent': 'request'
	};
	// Add authorization if GITHUB_TOKEN is declared
	// by default, without authorization, only public events are returned
	if (process.env.GITHUB_TOKEN) {
		headers.Authorization = 'token ' + process.env.GITHUB_TOKEN;
	}
	return request({
		url: 'https://api.github.com/users/' + process.env.GITHUB_USERNAME + '/received_events',
		headers: headers
	}).then(function (response) {
		var events;
		try {
			events = JSON.parse(body);
		} catch (e) {
			console.log(e);
		}
		if (!events) {
			return Promise.reject(new Error('Unable to parse response from Github'));
		}

		if (!Array.isArray(events)) {
			return Promise.reject(events);
		}
		// reverse array to process oldest event update first
		events.reverse();

		return Promise.all(events.map(function (e) {
			return db.events.findOne({id: e.id}).then(function (item) {
				if (item) {
					return;
				}
				return db.events.insert(e).then(function () {
					if (SUPPORTED_EVENTS.indexOf(e.type) !== -1) {
						return tweetContent(e);
					} else {
						console.error('Unsupported event type ' + e.type + ' for event ' + e.id);
					}
				});
			});
		// Promise.all returns an array of responses in order, but each response was not executed in order
		})).then(function (contentArr) {
			// nice trick to make sure things are done in sequential order
			// http://www.html5rocks.com/en/tutorials/es6/promises/#toc-creating-sequences
			return contentArr.reduce(function (seq, eventContent) {
				return seq.then(function () {
					if (eventContent) {
						console.log('Posting tweet "' + eventContent + '".');
						return postTweet(eventContent);
					}
				});
			}, Promise.resolve());
		});
	});
};
