/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/server/SourceItf.ts" />

/// <reference path="../core/CounterHelper.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Counter.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/CounterList.ts" />

var moment = require("moment");

class TweetCounterOnSearch extends SourceItf {

    constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
        super(params, twitterNamespaceManager);

        if (this.checkParams(["Limit","InfoDuration","SearchQuery","StartDate", "oauthKey"])) {
            this.run();
        }
    }

    private createAndSendInfoFromCounterHelper(counterHelper : CounterHelper, infoDuration : number) {
        Logger.debug("Send counter info with key "+counterHelper.getKey());
        counterHelper.toogleIsMining();
        var counterList : CounterList = new CounterList(counterHelper.getKey()+"_list");

        var counter : Counter = new Counter(counterHelper.getKey());
        counter.setValue(counterHelper.getCounter());
        counter.setDurationToDisplay(infoDuration);

        counterList.addCounter(counter);
        this.getSourceNamespaceManager().sendNewInfoToClient(counterList);
    }

    public run() {
        var self = this;

        var limit : number = parseInt(this.getParams().Limit);
        var infoDuration : number = parseInt(this.getParams().InfoDuration);
        var searchQuery : string = this.getParams().SearchQuery;
        var startDate : any = moment(parseInt(this.getParams().StartDate));
        var startDateStr : string = startDate.format();
        var oAuthKey : string = this.getParams().oauthKey;


        var counterHelper : CounterHelper = CounterHelper.getCounter(searchQuery, startDateStr);

        var mineTwitter = function (oauthActions : any, originalApiUrl : string, olderId : number, sinceId : string, iterationNumber : number = 0) {
            Logger.debug("Mine twitter with url: "+originalApiUrl+", olderId : "+olderId+" and sinceId : "+sinceId+" Iteration number : "+iterationNumber);
            var apiUrl = originalApiUrl;

            if (olderId != null) {
                apiUrl += "&max_id="+olderId;
            }

            var newOlderId = olderId;

            var successSearchOlder = function (result) {
                var olderTweetsResult = result.statuses;

                for (var i = 0; i < olderTweetsResult.length; i++) {
                    var tweet = olderTweetsResult[i];

                    var tweetDate = moment(new Date(tweet.created_at));
                    if (i % 20 == 0 || i == olderTweetsResult.length-1) {
                        Logger.debug("Date tweet (i = "+i+"): "+tweetDate.format());
                        Logger.debug("Date limite : "+startDate.format());
                    }

                    if (tweetDate.isBefore(startDate)) {
                        self.createAndSendInfoFromCounterHelper(counterHelper, infoDuration);
                        newOlderId = null;
                        return;
                    }

                    if (olderId != null) {
                        newOlderId = Math.min(olderId, tweet.id);
                    } else {
                        if (sinceId == null) {
                            newOlderId = tweet.id;
                        }
                        counterHelper.setLastId(tweet.id.toString());
                    }

                    counterHelper.updateCountersFromTweet(tweet);
                }

                if (olderTweetsResult.length == 0) {
                    Logger.debug("No more tweets to mine!");
                }


                var recursivityWithTimeout = function () {
                    if (iterationNumber == 20) {
                        Logger.debug("Pause in requests...");
                        setTimeout(function () {
                            mineTwitter(oauthActions, originalApiUrl, newOlderId, sinceId);
                        }, 180000);
                    } else {
                        mineTwitter(oauthActions, originalApiUrl, newOlderId, sinceId, iterationNumber++);
                    }
                };

                if (newOlderId != null && olderTweetsResult.length > 0) {
                    recursivityWithTimeout();
                }

                if (sinceId != null  && olderTweetsResult.length > 0) {
                    var retrievedSinceId = result.search_metadata.since_id.toString();
                    if (sinceId != retrievedSinceId) {
                        recursivityWithTimeout();
                    } else {
                        self.createAndSendInfoFromCounterHelper(counterHelper, infoDuration);
                    }
                }
            };

            var failSearchOlder = function (err) {
                Logger.error("Error while getting older tweets with URL "+apiUrl);
                Logger.debug(err);
            };


            oauthActions.get(apiUrl, successSearchOlder, failSearchOlder);
        };

        var successOAuth = function (oauthActions) {
            var apiUrl = '/1.1/search/tweets.json?q='+searchQuery+"&result_type=recent&count=100";

            if (counterHelper.getLastId() == null) {
                var olderId = null;
                var sinceId = null;

                if (!counterHelper.isMining()) {
                    counterHelper.toogleIsMining();
                    mineTwitter(oauthActions, apiUrl, olderId, sinceId);
                }

            } else {
                apiUrl += "&since_id="+counterHelper.getLastId();
                var olderId = null;

                if (!counterHelper.isMining()) {
                    counterHelper.toogleIsMining();
                    mineTwitter(oauthActions, apiUrl, olderId, counterHelper.getLastId());
                }
            }
        };

        var failOAuth = function (err) {
            Logger.error("Error while logging to twitter");
            Logger.debug(err);
        };


        self.getSourceNamespaceManager().manageOAuth('twitter', oAuthKey, successOAuth, failOAuth);
    }
}