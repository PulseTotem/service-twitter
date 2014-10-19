/**
 * @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="../t6s-core/core-backend/libsdef/node.d.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/express.d.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/socket.io-0.9.10.d.ts" />

/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

var http = require("http");
var express = require("express");
var sio = require("socket.io");
var twitterClient = require('twitter');
var util = require('util');

class Twitter {
	run() {
		/*var listeningPort = process.env.PORT_TWITTER || 4001;

		var app = express();
		var httpServer = http.createServer(app);
		var io = sio.listen(httpServer);
       */
		var twit = new twitterClient({
			consumer_key: 'STATE YOUR NAME',
			consumer_secret: 'STATE YOUR NAME',
			access_token_key: 'STATE YOUR NAME',
			access_token_secret: 'STATE YOUR NAME'
		});

		twit.get('/statuses/show/27593302936.json', {include_entities:true}, function(data) {
			console.log(util.inspect(data));
		});
	}
}

var twitter = new Twitter();
twitter.run();
