/**
 * @author Simon Urli <simon@pulsetotem.fr>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />

var moment = require("moment");

class CounterHelper {
    private static counters : any = {};

    private _key : string;

    private _searchQuery : string;
    private _dateLimit : string;

    private _counter : number;
    private _lastId : string;
    private _wordCount : any;
    private _tagCount : any;
    private _lastUpdate : any;
    private _lastDatesForRate : Array<number>;

    constructor(searchQuery : string, date : string, key : string) {
        this._searchQuery = searchQuery;
        this._dateLimit = date;
        this._key = key;
        this._counter = 0;
        this._lastId = null;
        this._wordCount = {};
        this._tagCount = {};
        this._lastDatesForRate = [];
    }

    public static getCounter(searchQuery : string, dateLimit : string) : CounterHelper {
        CounterHelper.cleanCounters();
        var key = searchQuery+dateLimit;

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

    public getCounter() : number {
        return this._counter;
    }

    public getLastId() : string {
        return this._lastId;
    }

    public getWordCount() : any {
        return this._wordCount;
    }

    public getTagCount() : any {
        return this._tagCount;
    }

    public getKey() : string {
        return this._key;
    }

    public setLastId(lastId : string) {
        this._lastId = lastId;
        this._lastUpdate = moment();
    }

    public incrementCounter() {
        this._counter++;
        this._lastUpdate = moment();
    }

    public incrementWord(word : string) {
        if (this._wordCount[word]) {
            this._wordCount[word]++;
        } else {
            this._wordCount[word] = 1;
        }
        this._lastUpdate = moment();
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

    public updateCountersFromTweet(tweet : any) {
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
    }

    public toJSON() : any {
        return {
            "id": this._key,
            "lastUpdate": this._lastUpdate,
            "query": this._searchQuery,
            "startDate": this._dateLimit,
            "counter": this._counter,
            "lastId": this._lastId,
            "wordCount": this._wordCount,
            "tagCount": this._tagCount,
            "rate": this.getRate()
        };
    }

}