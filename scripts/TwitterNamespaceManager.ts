/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 * @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="../t6s-core/core-backend/scripts/server/SourceNamespaceManager.ts" />

/// <reference path="./sources/LastTweetsFromSearch.ts" />

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
	    this.addListenerToSocket('LastTweetsFromSearch', function(params : any, self : TwitterNamespaceManager) { (new LastTweetsFromSearch(params, self)) });
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