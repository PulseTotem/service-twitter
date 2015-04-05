/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 */

/// <reference path="../libsdef/datejs.d.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/node-uuid.d.ts" />

/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="../t6s-core/core-backend/scripts/server/SourceNamespaceManager.ts" />

/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/TweetList.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tweet.ts" />

var datejs : any = require('datejs');

var DateJS : any = <any>Date;
var uuid : any = require('node-uuid');

var util = require('util');

class TwitterNamespaceManager extends SourceNamespaceManager {

    /**
     * Constructor.
     *
     * @constructor
     * @param {any} socket - The socket.
     */
    constructor(socket : any) {
        super(socket);
        this.addListenerToSocket('LastTweetsFromSearch', this.retrieveLastTweetsFromSearch);
    }

    /**
     * Retrieve last tweets from search and return the tweets in "TweetList" format.
     *
     * @method retrieveLastTweetsFromSearch
     * @param {Object} params - Params to retrieve tweets : search query and limit of tweets to return.
     * @param {TwitterNamespaceManager} self - the TwitterNamespaceManager's instance.
     */
	retrieveLastTweetsFromSearch(params : any, self : TwitterNamespaceManager = null) {
        if(self == null) {
            self = this;
        }

        Logger.debug("LastTweetsFromSearch Action with params :");
        Logger.debug(params);

		var fail = function(error) {
			if(error) {
				Logger.error(error);
			}
		};

		var success = function(oauthActions) {
			var successSearch = function(result) {
				var tweets = result.statuses;
				var tweetList:TweetList = new TweetList();

				tweetList.setId(uuid.v1());
				tweetList.setPriority(0);

				for(var iTweet in tweets) {
					var item : any = tweets[iTweet];
					var tweet:Tweet = new Tweet(item.id_str, 0, new Date(), new Date(), 10000);
					tweet.setMessage(item.text);

					tweetList.addTweet(tweet);
				}

				Logger.debug("Send TweetList to Client : ");
				Logger.debug(tweetList);

				self.sendNewInfoToClient(tweetList);
			};

			var searchUrl = '/1.1/search/tweets.json?q=' + params.SearchQuery + '&count=' + params.Limit + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.manageOAuth('twitter', params.oauthKey, success, fail);
    }
}