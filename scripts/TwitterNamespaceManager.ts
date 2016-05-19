/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 * @author Simon Urli <simon@the6thscreen.fr>
 */

/// <reference path="./TwitterUtils.ts" />
/// <reference path="./sources/LastTweetsFromSearch.ts" />
/// <reference path="./sources/LastTweetsFromUserTimelineWithRT.ts" />
/// <reference path="./sources/TweetCounterOnSearch.ts" />
/// <reference path="./sources/TweetWordCountOnSearch.ts" />
/// <reference path="./sources/TweetHashtagCountOnSearch.ts" />
/// <reference path="./sources/TweetPulseOnSearch.ts" />

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
        this.addListenerToSocket('TweetWordCountOnSearch', function(params : any, self : TwitterNamespaceManager) { (new TweetWordCountOnSearch(params, self)) });
        this.addListenerToSocket('TweetHashtagCountOnSearch', function(params : any, self : TwitterNamespaceManager) { (new TweetHashtagCountOnSearch(params, self)) });
        this.addListenerToSocket('TweetPulseOnSearch', function(params : any, self : TwitterNamespaceManager) { (new TweetPulseOnSearch(params, self)) });
    }
}