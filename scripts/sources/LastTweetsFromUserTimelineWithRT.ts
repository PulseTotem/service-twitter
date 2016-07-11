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
		if (this.checkParams(["InfoDuration","Limit", "ScreenName", "IncludeRT", "oauthKey", "Moderation"])) {
			this.run();
		}
	}

	public run() {
		var self = this;
		var apiCalls : number = 0;
		var limit : number = parseInt(this.getParams().Limit);
		var infoDuration : number = parseInt(this.getParams().InfoDuration);
		var screenName : string = this.getParams().ScreenName;
		var oauthKey : string = this.getParams().oauthKey;
		var includeRT : boolean = (this.getParams().IncludeRT == "true");
		var moderation : boolean = (this.getParams().Moderation == "true");

		var totalNumbers = limit*3;
		if(totalNumbers > 100) {
			totalNumbers = 100;
		}
		var queryUrl = '/1.1/statuses/user_timeline.json?screen_name=' + screenName + '&count=' + totalNumbers + '&exclude_replies=true&include_rts='+includeRT;

		var fail = function(error) {
			if(error) {
				Logger.error(error);
			}
		};

		var success = function(oauthActions) {
			var min_id = Infinity;

			var successSearch = function(result) {
				var tweetsResult = result;

				var tweetList:TweetList = new TweetList();

				tweetList.setId("tweetlist_"+screenName);
				tweetList.setPriority(0);

				var tweetsToProcess = [];

				var manageTweetsResult = function(tweets) {
					apiCalls++;

					for (var iTweet in tweets) {
						var item:any = tweets[iTweet];

						min_id = Math.min(min_id, item.id);

						tweetsToProcess.push(item);

						if (tweetsToProcess.length == limit) {
							break;
						}
					}

					if (tweetsToProcess.length < parseInt(self.getParams().Limit) && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result;

							manageTweetsResult(olderTweetsResult);
						};

						var searchOlderUrl = queryUrl+'&max_id=' + min_id.toString();

						if(apiCalls < 20) {
							oauthActions.get(searchOlderUrl, successSearchOlder, fail);
						} else {
							setTimeout(function () {
								apiCalls = 0;
								oauthActions.get(searchOlderUrl, successSearchOlder, fail);
							}, 180000);
						}
					} else {

						var tweetsToCreate = [];

						//Create tweets and send result
						var createTweets = function() {
							var counterTweet = 0;
							var successCreateTweet = function (tweet : Tweet) {
								counterTweet++;
								if (tweet != null) {
									tweetList.addTweet(tweet);
								}

								if (counterTweet == tweetsToCreate.length) {
									tweetList.setDurationToDisplay(infoDuration * tweetList.getTweets().length);
									self.getSourceNamespaceManager().sendNewInfoToClient(tweetList);
								}
							};

							tweetsToCreate.forEach(function(item : any) {
								 if (typeof(item.retweeted_status) != "undefined" && includeRT) {
								 	Logger.debug("Manage retweet and create tweet");
									self.createTweet(item.retweeted_status, successCreateTweet, moderation);
								 	//tweet.setOriginalTweet(originalTweet);
								 } else {
									 self.createTweet(item, successCreateTweet, moderation);
								 }
							});
						};

						//Retrieve complete description for Tweets
						var lookupTweets = function() {
							var toProcess = [];
							var needToContinue = false;

							if(tweetsToProcess.length > 100) {
								toProcess = tweetsToProcess.splice(0,100);
								needToContinue = true;
							} else {
								toProcess = tweetsToProcess;
							}

							var toProcessIds = [];

							toProcess.forEach(function(item : any) {
								toProcessIds.push(item.id_str);
							});

							var toProcessIdsString = toProcessIds.join(",");

							var successLookup = function(result) {
								apiCalls++;

								tweetsToCreate = tweetsToCreate.concat(result);

								if(needToContinue) {
									lookupTweets();
								} else {
									createTweets();
								}
							};

							var lookupUrl = '/1.1/statuses/lookup.json?id=' + toProcessIdsString + '&include_entities=true';

							if(apiCalls < 20) {
								oauthActions.get(lookupUrl, successLookup, fail);
							} else {
								setTimeout(function () {
									apiCalls = 0;
									oauthActions.get(lookupUrl, successLookup, fail);
								}, 180000);
							}
						};

						lookupTweets();
					}
				};

				manageTweetsResult(tweetsResult);
			};

			oauthActions.get(queryUrl, successSearch, fail);
		};

		self.getSourceNamespaceManager().manageOAuth('twitter',oauthKey, success, fail);
	}
}