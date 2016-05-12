/**
 * @author Christian Brel <christian@pulsetotem.fr, ch.brel@gmail.com>
 */

/// <reference path="../../t6s-core/core-backend/scripts/Logger.ts" />

var fs = require('fs');

/**
 * Contains Service Configuration information.
 *
 * @class ServiceConfig
 */
class ServiceConfig {

	/**
	 * Statistic service host
	 * @type {string}
	 * @static
     */
	static statHost : string = "";

	/**
	 * Retrieve configuration information from file description.
	 *
	 * @method retrieveConfigurationInformation
	 * @static
	 */
	static retrieveConfigurationInformation() {
		if(ServiceConfig.statHost == "") {
			var file = __dirname + '/service_config.json';
			try {
				var configInfos = JSON.parse(fs.readFileSync(file, 'utf8'));
				ServiceConfig.statHost = configInfos.statHost;
			} catch (e) {
				Logger.error("Service configuration file can't be read.");
				Logger.debug(e);
			}
		}
	}

	/**
	 * Return host for statistics
	 * @static
	 * @returns {string} Stat host
     */
	static getStatHost() : string {
		ServiceConfig.retrieveConfigurationInformation();
		return ServiceConfig.statHost;
	}
}