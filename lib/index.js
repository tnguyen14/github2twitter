var CronJob = require('cron').CronJob;
var github2twitter = require('./github2twitter');
var server = require('./server');

new CronJob('0 */5 * * * *', function () {
	github2twitter()
		.then(null, function (err) {
			console.error(err);
		});
}, null, true);

server.listen(3000, function (err) {
	if (err) {
		return console.error(err);
	}
	console.log('Server is listening...');
});
