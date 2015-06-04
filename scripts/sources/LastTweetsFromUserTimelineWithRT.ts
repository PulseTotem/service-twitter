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

class LastTweetsFromUserTimelineWithRT extends TwitterUtils {


	constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
		super(params, twitterNamespaceManager);
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
				var tweetsResult = result.statuses;

				var tweetList:TweetList = new TweetList();

				tweetList.setId(uuid.v1());
				tweetList.setPriority(0);

				var manageTweetsResult = function(tweets) {

					for (var iTweet in tweets) {
						var item:any = tweets[iTweet];

						min_id = Math.min(min_id, item.id);

						var tweet : Tweet = self.createTweet(item);

						if (typeof(item.retweeted_status) != "undefined" || typeof(item.retweeted_status.id_str) != "undefined") {

							var originalTweet : Tweet = self.createTweet(item.retweeted_status);
							tweet.setOriginalTweet(originalTweet);
						}

						tweetList.addTweet(tweet);

						if(tweetList.getTweets().length == parseInt(self.getParams().Limit)) {
							break;
						}

						// else, it's a retweet so by pass it ! //TODO : Maybe allow retweets through a param...
					}

					if(tweetList.getTweets().length < parseInt(self.getParams().Limit) && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result.statuses;

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