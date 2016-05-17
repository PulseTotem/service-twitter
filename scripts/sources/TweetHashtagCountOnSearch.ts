/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../TwitterUtils.ts" />

/// <reference path="../core/CounterHelper.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tag.ts" />
/// <reference path="../../t6s-core/core-backend/t6s-core/core/scripts/infotype/TagList.ts" />

var moment = require("moment");

class TweetHashtagCountOnSearch extends TwitterUtils {

    constructor(params : any, twitterNamespaceManager : TwitterNamespaceManager) {
        super(params, twitterNamespaceManager);

        if (this.checkParams(["Limit","InfoDuration","SearchQuery","StartDate", "oauthKey", "includeRT"])) {
            this.run();
        }
    }

    public run() {
        var self = this;

        var limit : number = parseInt(this.getParams().Limit);
        var infoDuration : number = parseInt(this.getParams().InfoDuration);
        var searchQuery : string = this.getParams().SearchQuery;
        var startDate : any = moment(parseInt(this.getParams().StartDate));
        var startDateStr : string = startDate.format();
        var oAuthKey : string = this.getParams().oauthKey;
        var includeRT : boolean = (this.getParams().IncludeRT == "true");


        var counterHelper : CounterHelper = CounterHelper.getCounter(searchQuery, startDate, includeRT);

        var createAndSendInfoFromCounterHelper = function () {
            Logger.debug("Send counter info with key "+counterHelper.getKey());
            var tagList : TagList = new TagList(counterHelper.getKey()+"_taglist");

            var dataWords = counterHelper.getTagCount();
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
            tagList.setQuery(counterHelper.getSearchQuery());
            tagList.setSince(startDate);

            self.getSourceNamespaceManager().sendNewInfoToClient(tagList);
            counterHelper.pushStat(self.getSourceNamespaceManager());
        };

        var successOAuth = function (oauthActions) {
            var apiUrl = '/1.1/search/tweets.json?q='+searchQuery+"&result_type=recent&count=100";

            if (counterHelper.getLastId() == 0) {
                var olderId = null;
                var sinceId = null;

                if (!counterHelper.isMining()) {
                    self.mineTwitter(oauthActions, apiUrl, startDate, counterHelper, olderId, sinceId, includeRT, createAndSendInfoFromCounterHelper, 0);
                }

            } else {
                apiUrl += "&since_id="+counterHelper.getLastId();
                var olderId = null;

                if (!counterHelper.isMining()) {
                    self.mineTwitter(oauthActions, apiUrl,  startDate, counterHelper, olderId, counterHelper.getLastId(), includeRT, createAndSendInfoFromCounterHelper, 0);
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