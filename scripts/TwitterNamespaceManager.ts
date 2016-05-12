/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 * @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="./TwitterUtils.ts" />
/// <reference path="./sources/LastTweetsFromSearch.ts" />
/// <reference path="./sources/LastTweetsFromUserTimelineWithRT.ts" />
    /// <reference path="./sources/TweetCounterOnSearch.ts" />

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
	    this.addListenerToSocket('LastTweetsFromUserTimelineWithRT', function(params : any, self : TwitterNamespaceManager) { (new LastTweetsFromUserTimelineWithRT(params, self)) });
        this.addListenerToSocket('TweetCounterOnSearch', function(params : any, self : TwitterNamespaceManager) { (new TweetCounterOnSearch(params, self)) });
    }
}