/**
 * @author Christian Brel <christian@the6thscreen.fr, ch.brel@gmail.com>
 */

/// <reference path="../t6s-core/core-backend/scripts/server/SourceServer.ts" />
/// <reference path="../t6s-core/core-backend/scripts/Logger.ts" />

/// <reference path="./TwitterNamespaceManager.ts" />



/**
 * Represents the The 6th Screen Twitter' Service.
 *
 * @class Twitter
 * @extends SourceServer
 */
class Twitter extends SourceServer {



    /**
     * Constructor.
     *
     * @param {number} listeningPort - Server's listening port..
     * @param {Array<string>} arguments - Server's command line arguments.
     */
    constructor(listeningPort : number, arguments : Array<string>) {
        super(listeningPort, arguments);

        this.init();
    }

    /**
     * Method to init the Twitter server.
     *
     * @method init
     */
    init() {
        var self = this;

        this.addNamespace("Twitter", TwitterNamespaceManager);
    }
}

/**
 * Server's Twitter listening port.
 *
 * @property _TwitterListeningPort
 * @type number
 * @private
 */
var _TwitterListeningPort : number = process.env.PORT || 6004;

/**
 * Server's Twitter command line arguments.
 *
 * @property _TwitterArguments
 * @type Array<string>
 * @private
 */
var _TwitterArguments : Array<string> = process.argv;

var serverInstance = new Twitter(_TwitterListeningPort, _TwitterArguments);
serverInstance.run();