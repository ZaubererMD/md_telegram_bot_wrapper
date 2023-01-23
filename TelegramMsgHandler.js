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
     * @param {string[]} parms The Parameters the user provded
     * @param {TelegramBotUser} user User-Object representing the author
     */
    execute(msg, parms, user) {
        this.handler(msg, parms, user);
    }
}

module.exports = TelegramMsgHandler;