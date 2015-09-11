'use strict';

var http = require('http');
var mongo = require('mongod');
var DBURL = 'mongodb://mongodb:27017/github2twitter';
var db = mongo(DBURL, ['events']);

var server = http.createServer(function (req, res) {
	db.events.find().then(function (events) {
		// show latest events first
		events.reverse();
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(events));
	});
});

module.exports = server;