/**
 @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/TweetList.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tweet.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/User.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Picture.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/PictureURL.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tag.ts" />
/// <reference path="../t6s-core/core-backend/scripts/server/SourceItf.ts" />

/// <reference path="./TwitterNamespaceManager.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/node-uuid.d.ts" />

var datejs : any = require('datejs');

var uuid : any = require('node-uuid');
/**
 * Toolbox to manipulate Twitter elements and Tweet InfoType
 */
class TwitterUtils extends SourceItf {

	constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
		super(params, twitterNamespaceManager);
	}

	public retrieveTwitterUser(item : any) : User {
		var twittos = item.user;
		var owner : User = new User(twittos.id_str, 0, new Date(twittos.created_at), new Date());
		owner.setUsername(twittos.screen_name);
		owner.setRealname(twittos.name);
		var loc : string = "Unknown";
		if(twittos.location != null) {
			loc = twittos.location;
		}
		owner.setLocation(loc);
		//owner.setProfilPicture(twittos.profile_image_url);
		owner.setProfilPicture(twittos.profile_image_url.replace(/_normal/g, ''));
		return owner;
	}

	public retrievePictureEntity(media : any) : Picture {
		var picture : Picture = new Picture(media.id_str, 0, new Date(), new Date());
		picture.setTitle("");
		picture.setDescription("");

		var pictUrl_original : PictureURL = new PictureURL(media.id_str+"_original");
		pictUrl_original.setURL(media.media_url);
		pictUrl_original.setWidth(media.sizes.medium.w);
		pictUrl_original.setHeight(media.sizes.medium.h);
		picture.setOriginal(pictUrl_original);

		var pictUrl_small : PictureURL = new PictureURL(media.id_str+"_small");
		pictUrl_small.setURL(media.media_url + ":small");
		pictUrl_small.setWidth(media.sizes.small.w);
		pictUrl_small.setHeight(media.sizes.small.h);

		picture.setSmall(pictUrl_small);

		var pictUrl_medium : PictureURL = new PictureURL(media.id_str+"_medium");
		pictUrl_medium.setURL(media.media_url);
		pictUrl_medium.setWidth(media.sizes.medium.w);
		pictUrl_medium.setHeight(media.sizes.medium.h);

		picture.setMedium(pictUrl_medium);

		var pictUrl_large : PictureURL = new PictureURL(media.id_str+"_large");
		pictUrl_large.setURL(media.media_url + ":large");
		pictUrl_large.setWidth(media.sizes.large.w);
		pictUrl_large.setHeight(media.sizes.large.h);

		picture.setLarge(pictUrl_large);

		var pictUrl_thumb : PictureURL = new PictureURL(media.id_str+"_thumb");
		pictUrl_thumb.setURL(media.media_url + ":thumb");
		pictUrl_thumb.setWidth(media.sizes.thumb.w);
		pictUrl_thumb.setHeight(media.sizes.thumb.h);

		picture.setThumb(pictUrl_thumb);
		picture.setOrientation("0");
		return picture;
	}

	public removeMediaURLFromTweet(tweet : Tweet, media : any) {
		if (media.url != null && media.url != "undefined") {
			var oldMessage = tweet.getMessage();
			var index = oldMessage.indexOf(media.url);
			if (index !== -1) {
				var message = oldMessage.substr(0, index)+oldMessage.substr(index+media.url.length, oldMessage.length-media.url.length);
				tweet.setMessage(message);
			}
		}
	}

	public createTweet(item : any) : Tweet  {
		var self = this;
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
		return tweet;
	}

	public mineTwitter(oauthActions : any, originalApiUrl : string, startDate : any, counterHelper : CounterHelper, olderId : number, sinceId : number, callbackSendInfo : Function, iterationNumber) {
		Logger.debug("Mine twitter with url: "+originalApiUrl+", olderId : "+olderId+" and sinceId : "+sinceId+". Last id :"+counterHelper.getLastId()+" Iteration number : "+iterationNumber);

		var self = this;
		counterHelper.switchOnMining();
		var apiUrl = originalApiUrl;

		if (olderId != null) {
			apiUrl += "&max_id="+olderId;
		}

		var newOlderId = olderId;

		var successSearchOlder = function (result) {
			var olderTweetsResult = result.statuses;

			var lastOlderId = counterHelper.getLastId();

			for (var i = 0; i < olderTweetsResult.length; i++) {
				var tweet = olderTweetsResult[i];

				var tweetDate = moment(new Date(tweet.created_at));
				if (i % 20 == 0 || i == olderTweetsResult.length-1) {
					Logger.debug("Date tweet (i = "+i+"): "+tweetDate.format());
					Logger.debug("Date limite : "+startDate.format());
				}

				if (tweetDate.isBefore(startDate)) {
					counterHelper.switchOffMining();
					callbackSendInfo(counterHelper);
					newOlderId = null;
					return;
				}

				if (olderId != null) {
					newOlderId = Math.min(olderId, tweet.id);
				} else {
					if (sinceId == null || sinceId == 0) {
						newOlderId = tweet.id;
					}
				}

				counterHelper.updateCountersFromTweet(tweet);
			}

			if (olderTweetsResult.length == 0) {
				counterHelper.switchOffMining();
				Logger.debug("No more tweets to mine!");
				callbackSendInfo();
			}

			var newSinceId = sinceId;
			var retrievedSinceId = result.search_metadata.since_id;

			if (sinceId != null && sinceId != 0 && retrievedSinceId != sinceId) {
				newSinceId = lastOlderId;
				newOlderId = retrievedSinceId;
			}


			var recursivityWithTimeout = function () {
				if (iterationNumber == 20) {
					Logger.debug("Pause in requests...");
					setTimeout(function () {
						self.mineTwitter(oauthActions, originalApiUrl, startDate, counterHelper, newOlderId, newSinceId, callbackSendInfo, 0);
					}, 180000);
				} else {
					var newIterationNumber = iterationNumber+1;
					self.mineTwitter(oauthActions, originalApiUrl, startDate, counterHelper, newOlderId, newSinceId, callbackSendInfo, newIterationNumber);
				}
			};

			if (newOlderId != null && olderTweetsResult.length > 0) {
				recursivityWithTimeout();
			}

			if (sinceId != null && sinceId != 0 && olderTweetsResult.length > 0) {

				if (sinceId != retrievedSinceId) {
					recursivityWithTimeout();
				} else {
					counterHelper.switchOffMining();
					callbackSendInfo(counterHelper);
				}
			}
		};

		var failSearchOlder = function (err) {
			counterHelper.switchOffMining();
			Logger.error("Error while getting older tweets with URL "+apiUrl);
			Logger.debug(err);
		};


		oauthActions.get(apiUrl, successSearchOlder, failSearchOlder);
	}
}