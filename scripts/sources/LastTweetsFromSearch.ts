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

class LastTweetsFromSearch extends TwitterUtils {


	constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
		super(params, twitterNamespaceManager);
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

						if (typeof(item.retweeted_status) == "undefined" || typeof(item.retweeted_status.id_str) == "undefined") {

							var tweet:Tweet = new Tweet(item.id_str, 0, new Date(item.created_at), new Date(), parseInt(self.getParams().InfoDuration));

							var owner:User = self.retrieveTwitterUser(item);

							tweet.setOwner(owner);
							tweet.setMessage(item.text);
							tweet.setFavoriteCount(item.favorite_count);
							tweet.setRetweetCount(item.retweet_count);
							tweet.setLang(item.lang);
							var sens:boolean = false;
							if (item.possibly_sensitive != null) {
								sens = item.possibly_sensitive;
							}
							tweet.setSensitive(sens);

							if (typeof(item.entities) != "undefined" && typeof(item.entities.hashtags) != "undefined") {
								item.entities.hashtags.forEach(function (hashtag:any) {
									var tag:Tag = new Tag(uuid.v1(), 0, new Date(), new Date());
									tag.setName(hashtag.text);

									tweet.addHashtag(tag);
								});
							}

							if (typeof(item.entities) != "undefined" && typeof(item.entities.media) != "undefined") {
								item.entities.media.forEach(function (media:any) {
									if (media.type == "photo") {
										var picture:Picture = self.retrievePictureEntity(media);

										tweet.getHashtags().forEach(function (tag) {
											picture.addTag(tag);
										});

										picture.setOwner(owner);

										tweet.addPicture(picture);
										self.removeMediaURLFromTweet(tweet, media);
									}
								});
							}
							tweetList.addTweet(tweet);

							if(tweetList.getTweets().length == parseInt(self.getParams().Limit)) {
								break;
							}

						} // else, it's a retweet so by pass it ! //TODO : Maybe allow retweets through a param...
					}

					if(tweetList.getTweets().length < parseInt(self.getParams().Limit) && tweets.length == totalNumbers) {
						var successSearchOlder = function(result) {
							var olderTweetsResult = result.statuses;

							manageTweetsResult(olderTweetsResult);
						};

						var searchOlderUrl = '/1.1/search/tweets.json?q=' + self.getParams().SearchQuery + '&count=' + totalNumbers + '&result_type=recent&max_id=' + min_id.toString();
						oauthActions.get(searchOlderUrl, successSearchOlder, fail);
					} else {
						tweetList.setDurationToDisplay(parseInt(self.getParams().InfoDuration) * tweetList.getTweets().length);

						self.getSourceNamespaceManager().sendNewInfoToClient(tweetList);
					}
				};

				manageTweetsResult(tweetsResult);
			};

			var searchUrl = '/1.1/search/tweets.json?q=' + self.getParams().SearchQuery + '&count=' + totalNumbers + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.getSourceNamespaceManager().manageOAuth('twitter', self.getParams().oauthKey, success, fail);
	}
}