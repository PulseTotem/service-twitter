/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../TwitterUtils.ts" />

/// <reference path="../core/CounterHelper.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tag.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/TagList.ts" />

var moment = require("moment");

class TweetWordCountOnSearch extends TwitterUtils {

    constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
        super(params, twitterNamespaceManager);

        if (this.checkParams(["Limit","InfoDuration","SearchQuery","StartDate", "oauthKey"])) {
            this.run();
        }
    }

    private createAndSendInfoFromCounterHelper(counterHelper : CounterHelper) {
        var infoDuration : number = parseInt(this.getParams().InfoDuration);
        Logger.debug("Send counter info with key "+counterHelper.getKey());
        var tagList : TagList = new TagList(counterHelper.getKey()+"_taglist");

        var dataWords = counterHelper.getWordCount();
        var allWords = Object.keys(dataWords);

        for (var i = 0; i < allWords.length; i++) {
            var word = allWords[i];
            var value = dataWords[word];

            var tag : Tag = new Tag(counterHelper.getKey()+"_"+word);
            tag.setName(word);
            tag.setPopularity(value);
            tagList.addTag(tag);
        }

        tagList.setDurationToDisplay(infoDuration);

        this.getSourceNamespaceManager().sendNewInfoToClient(tagList);
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

        var successOAuth = function (oauthActions) {
            var apiUrl = '/1.1/search/tweets.json?q='+searchQuery+"&result_type=recent&count=100";

            if (counterHelper.getLastId() == null) {
                var olderId = null;
                var sinceId = null;

                if (!counterHelper.isMining()) {
                    self.mineTwitter(oauthActions, apiUrl, startDate, counterHelper, olderId, sinceId, self.createAndSendInfoFromCounterHelper);
                }

            } else {
                apiUrl += "&since_id="+counterHelper.getLastId();
                var olderId = null;

                if (!counterHelper.isMining()) {
                    self.mineTwitter(oauthActions, apiUrl,  startDate, counterHelper, olderId, counterHelper.getLastId(), self.createAndSendInfoFromCounterHelper);
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