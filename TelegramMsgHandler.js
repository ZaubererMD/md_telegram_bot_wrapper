/**
 * This class is a wrapper around a callback function that is executed on an incoming message
 */
class TelegramMsgHandler {
    /**
     * Creates a new instance of TelegramMsgHandler
     * @param {string} id ID of this Message-Handler
     * @param {function} handler Function that will be called when a message for the Handler is received
     */
    constructor(id, handler) {
        this.id = id;
        this.handler = handler;
    }

    /**
     * Execute the handler-function of this Message-Handler
     * @param {object} msg The original Telegram Message Object
     * @param {RegExpMatchArray} matches The Regex Matches returned by executing a commands regex on the message text
     * @param {TelegramBotUser} user User-Object representing the author
     */
    execute(msg, matches, user) {
        this.handler(msg, matches, user);
    }
}

module.exports = TelegramMsgHandler;