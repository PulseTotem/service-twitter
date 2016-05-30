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

	public mineTwitter(oauthActions : any, originalApiUrl : string, startDate : any, counterHelper : CounterHelper, olderId : number, sinceId : number, countRT : boolean, callbackSendInfo : Function, iterationNumber) {
		Logger.debug("Mine twitter with url: "+originalApiUrl+", olderId : "+olderId+" and sinceId : "+sinceId+". Last id :"+counterHelper.getLastId()+" Iteration number : "+iterationNumber);

		var self = this;
		counterHelper.switchOnMining();
		var apiUrl = originalApiUrl;

		// OlderId != null -> on est en train de rechercher des vieux tweets
		if (olderId != null) {
			apiUrl += "&max_id="+olderId;
		}

		// On récupère la dernière valeur de olderId avant de lancer la requête
		var newOlderId = olderId;

		var successSearchOlder = function (result) {
			var doRecursivity : boolean = false;
			var olderTweetsResult = result.statuses;

			// on récupère la valeur du dernier Id stocké
			var lastOlderId = counterHelper.getLastId();

			if (olderId != null) {
				doRecursivity = true;
			}

			// les tweets sont lus du plus récent au plus vieux
			for (var i = 0; i < olderTweetsResult.length; i++) {
				var tweet = olderTweetsResult[i];

				var tweetDate = moment(new Date(tweet.created_at));

				if (i % 20 == 0 || i == olderTweetsResult.length-1) {
					Logger.debug("Date tweet (i = "+i+"): "+tweetDate.format());
					Logger.debug("Date limite : "+startDate.format());
				}

				// on trouve un tweet plus vieux que la date limite
				// Ou on trouve le tweet le plus vieux qu'on a miné et c'est le seul de la liste
				if (tweetDate.isBefore(startDate) || (tweet.id <= olderId && olderTweetsResult.length == 1)) {
					Logger.debug("Break the loop cause older tweet or only one tweet");
					Logger.debug("Tweet ID : "+tweet.id+" OlderId : "+olderId);
					counterHelper.switchOffMining();
					callbackSendInfo();
					doRecursivity = false;
				}

				// si on est en train de miner , on stocke la nouvelle valeur de olderId
				if (newOlderId != null) {
					newOlderId = Math.min(newOlderId, tweet.id);
				} else {
					newOlderId = tweet.id;
				}

				// on update le compteur avec le nouveau tweet
				counterHelper.updateCountersFromTweet(tweet, countRT);
			}

			// s'il n'y a plus de tweets, on arrête de miner
			if (olderTweetsResult.length == 0) {
				counterHelper.switchOffMining();
				Logger.debug("No more tweets to mine!");
				callbackSendInfo();
				doRecursivity = false;
			}

			// on stocke la valeur de sinceId
			var newSinceId = sinceId;

			// on récupère le sinceId renvoyé par la requête
			var retrievedSinceId = result.search_metadata.since_id;

			// si on est en train de récupérer les nouveaux tweets
			if (sinceId != null && sinceId != 0) {

				// Si le sinceId correspond au retrieveSinceId : on n'a oublié aucun tweet en route
				// (qui peut arriver si on doit récupérer 120 tweets, avec un requête de 100 tweets max)
				// dans ce cas on met à jour le newSinceId
				if (sinceId == retrievedSinceId) {
					counterHelper.switchOffMining();
					callbackSendInfo(counterHelper);
					doRecursivity = false;
				// dans le cas contraire : on doit récupérer les 20 tweets manquants
				} else {
					newSinceId = null;
					doRecursivity = true;
				}
			}


			var recursivityWithTimeout = function () {
				if (iterationNumber == 20) {
					Logger.debug("Pause in requests...");
					setTimeout(function () {
						self.mineTwitter(oauthActions, originalApiUrl, startDate, counterHelper, newOlderId, newSinceId, countRT, callbackSendInfo, 0);
					}, 180000);
				} else {
					var newIterationNumber = iterationNumber+1;
					self.mineTwitter(oauthActions, originalApiUrl, startDate, counterHelper, newOlderId, newSinceId, countRT, callbackSendInfo, newIterationNumber);
				}
			};

			if (doRecursivity) {
				recursivityWithTimeout();
			}
		};

		var failSearchOlder = function (err) {
			counterHelper.switchOffMining();
			Logger.error("Error while getting older tweets with URL "+apiUrl);
			Logger.debug(err);
		};


		oauthActions.get(apiUrl, successSearchOlder, failSearchOlder);
	}

	public manageQuery(query : string) : string {
		return encodeURIComponent(query);
	}
}