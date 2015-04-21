'use strict';

var http = require('http');
var github2twitter = require('./github2twitter');

var server = http.createServer(function (req, res) {
	github2twitter(function (err) {
		if (err) {
			res.writeHead(500);
			res.end(err);
		}
		res.writeHead(200);
		res.end('OK!');
	});
});

server.listen(process.env.PORT || 3000, function () {
  console.log('Server is listening...');
});