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

		var apiCalls : number = 0;


		var fail = function(error) {
			Logger.debug("Error to get oauth authorization.");
			if(error) {
				Logger.error(error);
			}
		};

		var success = function(oauthActions) {
			Logger.debug("Success to get oauth");
			var totalNumbers = limit * 3;
			if(totalNumbers > 100) {
				totalNumbers = 100;
			}
			var min_id = Infinity;

			var successSearch = function(result) {
				var tweetsResult = result.statuses;

				var tweetList:TweetList = new TweetList();

				tweetList.setId("tweetlist_"+query);
				tweetList.setPriority(0);

				var tweetsToProcess = [];

				var manageTweetsResult = function(tweets) {
					apiCalls++;

					for (var iTweet in tweets) {
						var item:any = tweets[iTweet];

						min_id = Math.min(min_id, item.id);

						if (typeof(item.retweeted_status) == "undefined" || typeof(item.retweeted_status.id_str) == "undefined" || includeRT) {
							tweetsToProcess.push(item);

							if(tweetsToProcess.length == limit) {
								break;
							}
						}
					}

					if(tweetsToProcess.length < limit && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result.statuses;

							manageTweetsResult(olderTweetsResult);
						};

						var searchOlderUrl = '/1.1/search/tweets.json?q=' + query + '&count=' + totalNumbers + '&result_type=recent&max_id=' + min_id.toString();
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
							tweetsToCreate.forEach(function(item : any) {
								var tweet : Tweet = self.createTweet(item);
								tweetList.addTweet(tweet);
							});

							tweetList.setDurationToDisplay(infoDuration * tweetList.getTweets().length);

							self.getSourceNamespaceManager().sendNewInfoToClient(tweetList);
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

			var searchUrl = '/1.1/search/tweets.json?q=' + query + '&count=' + totalNumbers + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.getSourceNamespaceManager().manageOAuth('twitter', oauthKey, success, fail);
	}
}