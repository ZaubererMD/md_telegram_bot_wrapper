/**
 * This class is a wrapper around a callback function that is executed on an incoming message
 */
class TelegramMsgHandler {
    /**
     * @typedef {Function} MessageHandler
     * @param {Object} msg
     * @param {any[]} parms
     * @param {TelegramBotUser} user
     */
    /**
     * @typedef {Object} MessageHandlerProperties
     * @property {string} id ID of the Message-Handler
     * @property {MessageHandler} handler Function that will be called when a message for the Handler is received
     * @property {string} [expectedType='text'] The expected type of message from the user to use the handler. If the user sends another message-type, the handler will not be executed.
     */
    /**
     * Creates a new instance of TelegramMsgHandler
     * @param {MessageHandlerProperties} properties Properties of the message handler
     */
    constructor({ id, handler, expectedType = 'text' }) {
        this.id = id;
        this.handler = handler;
        this.expectedType = expectedType;
    }

    /**
     * Execute the handler-function of this Message-Handler
     * @param {object} msg The original Telegram Message Object
     * @param {string[]} parms The Parameters the user provded
     * @param {TelegramBotUser} user User-Object representing the author
     * @param {string} [type='text'] the type of the message. This will really only be useful for the default-handler
     */
    execute(msg, parms, user, type = 'text') {
        this.handler(msg, parms, user, type);
    }
}

module.exports = TelegramMsgHandler;