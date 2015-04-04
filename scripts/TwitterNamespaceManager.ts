/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 */

/// <reference path="../libsdef/datejs.d.ts" />
/// <reference path="../t6s-core/core-backend/libsdef/node-uuid.d.ts" />

/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="../t6s-core/core-backend/scripts/server/SourceNamespaceManager.ts" />

/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/TweetList.ts" />
/// <reference path="../t6s-core/core-backend/t6s-core/core/scripts/infotype/Tweet.ts" />

var datejs : any = require('datejs');

var DateJS : any = <any>Date;
var uuid : any = require('node-uuid');

class TwitterNamespaceManager extends SourceNamespaceManager {

    /**
     * Constructor.
     *
     * @constructor
     * @param {any} socket - The socket.
     */
    constructor(socket : any) {
        super(socket);
        this.addListenerToSocket('RetrieveFeedContent', this.retrieveFeedContent);

		//TODO !!!!!!!

    }

    /**
     * Retrieve a RSS/ATOM Feed and return the feed in "InfoType" format.
     *
     * @method retrieveFeedContent
     * @param {Object} params - Params to retrieve feed : Feed URL and limit of articles to return.
     * @param {RSSFeedReaderNamespaceManager} self - the RSSFeedReaderNamespaceManager's instance.
     */
    retrieveFeedContent(params : any, self : TwitterNamespaceManager = null) {
        if(self == null) {
            self = this;
        }

        Logger.debug("RetrieveFeedContent Action with params :");
        Logger.debug(params);
        //TODO : Change format
        //TODO : Send result to SourcesServer

        var nbSend = 0;

        self.fetch(params.FeedURL, function(item) {
            var feedContent:FeedContent = new FeedContent();
            //var feedContentOk = false;
            //if(!feedContentOk) {
            feedContent.setId(uuid.v1());
            feedContent.setPriority(0);
            if (item.meta.date != null && typeof(item.meta.date) != "undefined") {
                var creaDesc:string = item.meta.date.toString();
                var creaDate:any = DateJS.parse(creaDesc);
                feedContent.setCreationDate(creaDate);
                feedContent.setObsoleteDate(creaDate.addDays(7));
            }
            feedContent.setDurationToDisplay(10000);

            feedContent.setTitle(item.meta.title);
            feedContent.setDescription(item.meta.description);
            feedContent.setUrl(item.meta.xmlUrl);
            feedContent.setLanguage(item.meta.language);
            if(typeof(item.meta.image.url) != "undefined") {
                feedContent.setLogo(item.meta.image.url);
            }
                //feedContentOk = true;
            //}

            var pubDate : any = DateJS.parse(item.pubDate);

            var feedNode : FeedNode = new FeedNode(item.guid, 0, pubDate, pubDate.addDays(7), 10000);
            feedNode.setTitle(item.title);
            feedNode.setDescription(item.description);
            feedNode.setSummary(item.summary);
            feedNode.setAuthor(item.author);
            feedNode.setUrl(item.link);
            if(item.image != null && typeof(item.image) != "undefined" && item.image.url != null && typeof(item.image.url) != "undefined") {
                feedNode.setMediaUrl(item.image.url);
            }

            feedContent.addFeedNode(feedNode);

            nbSend++;
            Logger.debug("Send FeedContent to Client : " + nbSend);
            Logger.debug(feedContent);

            self.sendNewInfoToClient(feedContent);

        }, function(err) {
            if (err) {
                //console.log(err, err.stack);
                Logger.error(err);
            }
        });
    }

    fetch(feed, itemProcessFunction, errorCB) {
        var self = this;
        // Define our streams
        var req = request(feed, {timeout: 10000, pool: false});
        req.setMaxListeners(50);

        // Some feeds do not respond without user-agent and accept headers.
        req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
        req.setHeader('accept', 'text/html,application/xhtml+xml');

        var feedparser = new FeedParser();

        // Define our handlers
        req.on('error', errorCB);

        req.on('response', function(res) {
            var stream = this;

            if (res.statusCode != 200) {
                return this.emit('error', new Error('Bad status code'));
                //Logger.error("Bad status code.");
            }

            stream.pipe(feedparser);
        });

        feedparser.on('error', errorCB);

        feedparser.on('readable', function() {

            // This is where the action is!
            var stream = this;
            var item;
            //var meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance

            while (item = stream.read()) {
                itemProcessFunction(item);
            }

            /*var post;
            while (post = this.read()) {
                itemProcessFunction(post);
            }
            endFetchProcessFunction();*/
        });
    }
}