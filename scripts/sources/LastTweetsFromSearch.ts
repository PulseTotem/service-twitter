/**
 * @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="../../libsdef/datejs.d.ts" />
/// <reference path="../../t6s-core/core-backend/libsdef/node-uuid.d.ts" />

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/TweetList.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tweet.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/User.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Picture.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/PictureURL.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tag.ts" />

/// <reference path="../TwitterNamespaceManager.ts" />

var datejs : any = require('datejs');

var uuid : any = require('node-uuid');

class LastTweetsFromSearch extends TwitterUtils {


	constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
		super(params, twitterNamespaceManager);
		if (this.checkParams(["InfoDuration","Limit", "SearchQuery", "IncludeRT", "oauthKey"])) {
			this.run();
		}
	}

	public run() {
		var self = this;
		var limit : number = parseInt(this.getParams().Limit);
		var infoDuration : number = parseInt(this.getParams().InfoDuration);
		var query : string = this.manageQuery(this.getParams().SearchQuery);
		var oauthKey : string = this.getParams().oauthKey;
		var includeRT : boolean = (this.getParams().IncludeRT == "true");

		var fail = function(error) {
			if(error) {
				Logger.error(error);
				Logger.debug("Error to get oauth authorization.");
			}
		};

		var success = function(oauthActions) {
			var totalNumbers = limit * 3;
			var min_id = Infinity;

			var successSearch = function(result) {
				var tweetsResult = result.statuses;

				var tweetList:TweetList = new TweetList();

				tweetList.setId(uuid.v1());
				tweetList.setPriority(0);

				var manageTweetsResult = function(tweets) {

					for (var iTweet in tweets) {
						var item:any = tweets[iTweet];

						min_id = Math.min(min_id, item.id);

						if (typeof(item.retweeted_status) == "undefined" || typeof(item.retweeted_status.id_str) == "undefined" || includeRT) {

							var tweet : Tweet = self.createTweet(item);
							tweetList.addTweet(tweet);

							if(tweetList.getTweets().length == limit) {
								break;
							}

						}
					}

					if(tweetList.getTweets().length < parseInt(self.getParams().Limit) && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result.statuses;

							manageTweetsResult(olderTweetsResult);
						};

						var searchOlderUrl = '/1.1/search/tweets.json?q=' + query + '&count=' + totalNumbers + '&result_type=recent&max_id=' + min_id.toString();
						oauthActions.get(searchOlderUrl, successSearchOlder, fail);
					} else {
						tweetList.setDurationToDisplay(infoDuration * tweetList.getTweets().length);

						self.getSourceNamespaceManager().sendNewInfoToClient(tweetList);
					}
				};

				manageTweetsResult(tweetsResult);
			};

			var searchUrl = '/1.1/search/tweets.json?q=' + query + '&count=' + totalNumbers + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.getSourceNamespaceManager().manageOAuth('twitter', oauthKey, success, fail);
	}
}