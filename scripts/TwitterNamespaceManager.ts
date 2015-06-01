/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 */

/// <reference path="../libsdef/datejs.d.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/node-uuid.d.ts" />

/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="../t6s-core/core-backend/scripts/server/SourceNamespaceManager.ts" />

/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/TweetList.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tweet.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/User.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Picture.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/PictureURL.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tag.ts" />

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

	retrieveTwitterUser(item : any) : User {
		var twittos = item.user;
		var owner : User = new User(twittos.id_str, 0, new Date(twittos.created_at), new Date());
		owner.setUsername(twittos.screen_name);
		owner.setRealname(twittos.name);
		var loc : string = "Unknown";
		if(twittos.location != null) {
			loc = twittos.location;
		}
		owner.setLocation(loc);
		owner.setProfilPicture(twittos.profile_image_url);

		return owner;
	}

	retrievePictureEntity(media : any) : Picture {
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

					var tweet:Tweet = new Tweet(item.id_str, 0, new Date(item.created_at), new Date(), parseInt(params.InfoDuration));

					var owner : User = self.retrieveTwitterUser(item);

					tweet.setOwner(owner);
					tweet.setMessage(item.text);
					tweet.setFavoriteCount(item.favorite_count);
					tweet.setRetweetCount(item.retweet_count);
					tweet.setLang(item.lang);
					var sens : boolean = false;
					if(item.possibly_sensitive != null) {
						sens = item.possibly_sensitive;
					}
					tweet.setSensitive(sens);

					if(typeof(item.entities) != "undefined" && typeof(item.entities.hashtags) != "undefined") {
						item.entities.hashtags.forEach(function(hashtag : any) {
							var tag : Tag = new Tag(uuid.v1(), 0, new Date(), new Date());
							tag.setName(hashtag.text);

							tweet.addHashtag(tag);
						});
					}

					if(typeof(item.entities) != "undefined" && typeof(item.entities.media) != "undefined") {
						item.entities.media.forEach(function (media : any) {
							if (media.type == "photo") {
								var picture : Picture = self.retrievePictureEntity(media);

								tweet.getHashtags().forEach(function(tag) {
									picture.addTag(tag);
								});

								picture.setOwner(owner);

								tweet.addPicture(picture);
							}
						});
					}


					tweetList.addTweet(tweet);
				}

				self.sendNewInfoToClient(tweetList);
			};

			var searchUrl = '/1.1/search/tweets.json?q=' + params.SearchQuery + '&count=' + params.Limit + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.manageOAuth('twitter', params.oauthKey, success, fail);
    }

	/*
	retrievePictureAlbumFromTwitterSearch(params : any, self : TwitterNamespaceManager = null) {

		if(self == null) {
			self = this;
		}

		Logger.debug("PictureAlbumFromTwitterSearch Action with params :");
		Logger.debug(params);

		var fail = function(error) {
			if(error) {
				Logger.error(error);
			}
		};

		var success = function (info) {

			var searchUrl = '/1.1/search/tweets.json?q=' + params.SearchQuery + '&count=' + params.Limit + '&result_type=recent';
			oauthActions.get(searchUrl, successSearch, fail);
		};

		self.manageOAuth('twitter', params.oauthKey, success, fail);
	}
	*/
}