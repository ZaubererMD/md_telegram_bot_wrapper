const moment = require('moment');

/**
 * This class holds information about a user of the Bot and manages the users context
 */
class TelegramBotUser {
    /**
     * Creates a new instance of TelegramBotUser
     * @param {integer} telegramChatID The Telegram-Chat-ID of the User
     * @param {object} [appData=null] data about the user specific to the application that the telegram-bot-wrapper is used in
     */
    constructor(telegramChatID, appData = null) {
        this.telegramChatID = telegramChatID;
        this.appData = appData;

        this.context = null;
        this.contextCreated = null;
        this.contextTTL = null;
    }

    /**
     * Determines whether the user has a valid context
     * @returns {boolean} true if a valid context is present, false otherwise
     */
    hasContext() {
        this.verifyContext();
        return this.context !== null;
    }

    /**
     * Checks whether the context of the user has gone past its TTL and deletes it if it has
     */
    verifyContext() {
        if(this.context !== null && this.contextCreated.diff(moment(), 'minutes') > this.contextTTL) {
            this.deleteContext();
        }
    }

    /**
     * Sets a new context for the users next message
     * @param {TelegramUserContext} context Object representing the context that will handle the users next message
     * @param {integer} [ttl=5] Time-to-live in minutes, after which the context will be considered invalid
     */
    setContext(context, ttl = 5) {
        this.context = context;
        this.contextCreated = moment();
        this.contextTTL = ttl;
    }

    /**
     * Gets the current valid context of the user
     * @returns {TelegramUserContext|null} The current valid context of the user, or null if none is present
     */
    getContext() {
        this.verifyContext();
        return this.context;
    }

    /**
     * Deletes the users context
     */
    deleteContext() {
        this.context = null;
        this.contextCreated = null;
        this.contextTTL = null;
    }
}

module.exports = TelegramBotUser;