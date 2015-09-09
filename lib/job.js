var CronJob = require('cron').CronJob;
var github2twitter = require('./github2twitter');

new CronJob('0 */5 * * * *', function () {
	github2twitter()
		.then(null, function (err) {
			console.error(err);
		});
}, null, true);