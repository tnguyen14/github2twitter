'use strict';

var http = require('http');
var mongo = require('mongod');
var DBURL = 'mongodb://mongodb:27017/github2twitter';
var db = mongo(DBURL, ['events']);

var db = require('level')('./data', {valueEncoding: 'json'});

var server = http.createServer(function (req, res) {
	var events = [];
	db.createReadStream({
		gte: 'event!',
		lt: 'event!~'
	})
		.on('data', function (e) {
			events.push(e);
		})
		.on('err', function (err) {
			res.writeHead(500, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(err));
		})
		.on('close', function () {
			// show latest events first
			events.reverse();
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(events));
		});
});

module.exports = server;
