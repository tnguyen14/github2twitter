/*
 * github2twitter
 * http://tridnguyen.com
 *
 * Copyright (c) 2015 Tri Nguyen
 * Licensed under the MIT license.
 */

'use strict';

require('dotenv').config();
var fs = require('fs');
var request = require('request-promise');
var Handlebars = require('handlebars');
var Promise = require('promise');
var Twit = require('twit');
var readFile = Promise.denodeify(fs.readFile);

var db = require('./db');
require('level-promise')(db);

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
var generateTweetContent = function (event) {
	return readFile('./templates/' + event.type + '.hbs', 'utf8').then(function (template) {
		template = Handlebars.compile(template);
		return template(event);
	});
};

// Post a tweet update to Twitter, staggered by the twitterStagger time
var postTweet = function (event) {
	if (!Twitter) {
		throw new Error('Twit instance is not available.');
	}
	return generateTweetContent(event)
	.then(function (eventContent) {
		if (!eventContent) {
			throw new Error('Tweet content cannot be empty.');
		}
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				Twitter.post('statuses/update', {status: eventContent}, function (err, data, response) {
					if (err) {
						return reject(err);
					}
					resolve();
				});
			}, twitterStagger);
		});
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
			events = JSON.parse(response);
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

		return events.reduce(function (seq, e) {
			return seq.then(function () {
				// skip event if not supported
				if (SUPPORTED_EVENTS.indexOf(e.type) === -1) {
					return Promise.resolve();
				}
				return db.get('event!' + e.id)
				.then(function (item) {
					// if event already exists, quit
					return Promise.resolve();
				}, function (err) {
					if (!err.notFound) {
						console.error(err);
					}
					return postTweet(e)
					.then(function () {
						console.log('Succesfully posted event ' + e.id);
						return db.put('event!' + e.id, e)
						.catch(function () {
							console.error('Unable to store event ' + e.id);
							console.error(err);
						})
					}, function () {
						console.error('Unable to post event ' + e.id);
						console.error(err);
						return Promise.resolve();
					});
				});
			});
		}, Promise.resolve());
	});
};
