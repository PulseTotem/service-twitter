/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/stats/StatObject.ts" />
/// <reference path="../../t6s-core/core-backend/scripts/RestClient.ts" />

var moment = require("moment");

class CounterHelper {
    private static counters : any = {};

    private _key : string;

    private _searchQuery : string;
    private _dateLimit : string;

    private _isMining : boolean;
    private _counter : number;
    private _lastId : number;
    private _wordCount : any;
    private _tagCount : any;
    private _lastUpdate : any;
    private _lastDatesForRate : Array<number>;

    constructor(searchQuery : string, date : string, key : string) {
        this._searchQuery = searchQuery;
        this._dateLimit = date;
        this._key = key;
        this._counter = 0;
        this._lastId = 0;
        this._wordCount = {};
        this._tagCount = {};
        this._lastDatesForRate = [];
        this._lastUpdate = moment();
        this._isMining = false;
    }

    public static getCounter(searchQuery : string, dateLimit : string, includeRT : boolean) : CounterHelper {
        CounterHelper.cleanCounters();
        var key = searchQuery+dateLimit+"RT"+includeRT.toString();

        if (CounterHelper.counters[key]) {
            return CounterHelper.counters[key];
        } else {
            var counter = new CounterHelper(searchQuery, dateLimit, key);
            CounterHelper.counters[key] = counter;
            return counter;
        }
    }

    private static cleanCounters() {
        var dateLimit = moment().subtract(2, 'days');

        var keyToDelete = [];

        for (var key in CounterHelper.counters) {
            var counter = CounterHelper.counters[key];

            if (counter._lastUpdate.isBefore(dateLimit)) {
                Logger.debug("Delete counter with key: "+key);
                keyToDelete.push(key);
            }
        }

        for (var i = 0; i < keyToDelete.length; i++) {
            delete (CounterHelper.counters[keyToDelete[i]]);
        }
    }

    public switchOnMining() {
        this._isMining = true;
    }

    public switchOffMining() {
        this._isMining = false;
    }

    public isMining() {
        return this._isMining;
    }

    public getCounter() : number {
        return this._counter;
    }

    public getLastId() : number {
        return this._lastId;
    }

    private getObjectCount(tab : any) : any {
        var result = {};
        var allKeys = Object.keys(tab);
        var biggestKeys = allKeys.sort(function (i,j) {return tab[j]-tab[i]; }).slice(0,100);
        for (var i = 0; i < biggestKeys.length; i++) {
            result[biggestKeys[i]] = tab[biggestKeys[i]];
        }

        return result;
    }

    public getWordCount() : any {
        return this.getObjectCount(this._wordCount);
    }

    public getTagCount() : any {
        return this.getObjectCount(this._tagCount);
    }

    public getKey() : string {
        return this._key;
    }

    public getSearchQuery() : string {
        return this._searchQuery;
    }

    public getDateLimit() : string {
        return this._dateLimit;
    }

    public setLastId(lastId : number) {
        this._lastId = lastId;
        this._lastUpdate = moment();
    }

    public incrementCounter() {
        this._counter++;
        this._lastUpdate = moment();
    }

    public incrementWord(word : string) {
        if (word.length > 1 && word != "RT") {
            word = word.replace(/\./g,"_");

            if (this._wordCount[word]) {
                this._wordCount[word]++;
            } else {
                this._wordCount[word] = 1;
            }
            this._lastUpdate = moment();
        }
    }

    public incrementTag(tag : string) {
        if (this._tagCount[tag]) {
            this._tagCount[tag]++;
        } else {
            this._tagCount[tag] = 1;
        }
        this._lastUpdate = moment();
    }

    public pushDate(date : number) {
        this._lastDatesForRate.unshift(date);
        this._lastDatesForRate = this._lastDatesForRate.splice(0, 10);
        this._lastUpdate = moment();
    }

    public getRate() : number {
        this._lastDatesForRate.sort(function (i,j) { return i - j; });
        this._lastDatesForRate.reverse();

        var nbDates = this._lastDatesForRate.length;
        var cumulatedTmeBetweenTweets = 0;
        var difference = 0;

        for (var i = 0; i < nbDates-2; i++) {
            var dateElement = this._lastDatesForRate[i];
            var dateBefore = this._lastDatesForRate[i-1];

            difference = dateElement-dateBefore;
            cumulatedTmeBetweenTweets += difference;
        }

        var averageTweetBySecond = cumulatedTmeBetweenTweets / nbDates;
        return Math.round(60 / averageTweetBySecond);
    }

    public updateCountersFromTweet(tweet : any, countRT : boolean) {

        if (typeof(tweet.retweeted_status) == "undefined" || typeof(tweet.retweeted_status.id_str) == "undefined" || countRT) {
            this.incrementCounter();

            var text = tweet.text;

            var allWords = text.trim().split(" ");

            for (var i = 0; i < allWords.length; i++) {
                this.incrementWord(allWords[i]);
            }

            if (typeof(tweet.entities) != "undefined" && typeof(tweet.entities.hashtags) != "undefined") {
                for (var i = 0; i < tweet.entities.hashtags.length; i++) {
                    this.incrementTag(tweet.entities.hashtags[i].text);
                }
            }

            var dateInSecond = moment(new Date(tweet.created_at)).unix();
            this.pushDate(dateInSecond);

            if (tweet.id > this._lastId) {
                this.setLastId(tweet.id);
            }
        }
    }

    private toJSON() : any {
        return {
            key: this._key,
            lastUpdate: this._lastUpdate,
            query: this._searchQuery,
            startDate: this._dateLimit,
            counter: this._counter,
            lastId: this._lastId,
            wordCount: this.getWordCount(),
            tagCount: this.getTagCount(),
            rate: this.getRate()
        };
    }

    public pushStat(sourceNamespaceManager : SourceNamespaceManager) {
        var stat : StatObject = new StatObject();
        stat.setCollection("service-twitter-counter");
        stat.setSocketId(sourceNamespaceManager.socket.id);
        stat.setIp(sourceNamespaceManager.getIP());
        stat.setSDIId(sourceNamespaceManager.getProfilId().toString());
        stat.setProfilId(sourceNamespaceManager.getSDIId().toString());
        stat.setHash(sourceNamespaceManager.getHashProfil());

        var data = this.toJSON();

        stat.setData(data);

        var urlPostStat = ServiceConfig.getStatHost()+"create";

        RestClient.post(urlPostStat, stat.toJSON(), function () {
            Logger.debug("Stat has been posted.");
        }, function (err) {
            Logger.debug("Error when posting the stat on the following URL: "+urlPostStat);
            Logger.debug("Object send:");
            Logger.debug(stat);
        });
    }

}