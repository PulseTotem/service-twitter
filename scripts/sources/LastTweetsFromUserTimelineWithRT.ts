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
/// <reference path="../TwitterUtils.ts" />

var datejs : any = require('datejs');

var uuid : any = require('node-uuid');

class LastTweetsFromUserTimelineWithRT extends TwitterUtils {


	constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
		super(params, twitterNamespaceManager);
		this.run();
	}

	private computeSourceUrl = function (totalNumbers) {
		return '/1.1/statuses/user_timeline.json?screen_name=' + this.getParams().ScreenName + '&count=' + totalNumbers + '&exclude_replies=true&include_rts=true';
	}

	public run() {
		var self = this;

		var fail = function(error) {
			if(error) {
				Logger.error(error);
			}
		};

		var success = function(oauthActions) {
			var totalNumbers = parseInt(self.getParams().Limit) * 3;
			var min_id = Infinity;

			var successSearch = function(result) {
				var tweetsResult = result;

				var tweetList:TweetList = new TweetList();

				tweetList.setId("tweetlist_"+self.getParams().ScreenName);
				tweetList.setPriority(0);

				var manageTweetsResult = function(tweets) {

					for (var iTweet in tweets) {
						var item:any = tweets[iTweet];

						min_id = Math.min(min_id, item.id);
						var tweet : Tweet = self.createTweet(item);

						if (typeof(item.retweeted_status) != "undefined") {
							Logger.debug("Manage retweet and create tweet");
							var originalTweet : Tweet = self.createTweet(item.retweeted_status);
							tweet.setOriginalTweet(originalTweet);
						}
						tweetList.addTweet(tweet);

						if (tweetList.getTweets().length == parseInt(self.getParams().Limit)) {
							break;
						}
					}

					if (tweetList.getTweets().length < parseInt(self.getParams().Limit) && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result;

							manageTweetsResult(olderTweetsResult);
						};

						var searchOlderUrl = self.computeSourceUrl(totalNumbers)+'&max_id=' + min_id.toString();
						oauthActions.get(searchOlderUrl, successSearchOlder, fail);
					} else {
						tweetList.setDurationToDisplay(parseInt(self.getParams().InfoDuration) * tweetList.getTweets().length);

						self.getSourceNamespaceManager().sendNewInfoToClient(tweetList);
					}
				};

				manageTweetsResult(tweetsResult);
			};

			oauthActions.get(self.computeSourceUrl(totalNumbers), successSearch, fail);
		};

		self.getSourceNamespaceManager().manageOAuth('twitter', self.getParams().oauthKey, success, fail);
	}
}