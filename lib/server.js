'use strict';

var http = require('http');
var db = require('./db');

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
