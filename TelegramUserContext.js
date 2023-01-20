/**
 * This class represents the context of a user that can be set
 * by a TelegramMsgHandler to handle the next message comming from the user
 */
class TelegramUserContext {
    /**
     * Creates a new instance of TelegramUserContext
     * @param {string} nextMsgHandlerID id of the TelegramMsgHandler to execute on the next message from the user
     */
    constructor(nextMsgHandlerID) {
        this.nextMsgHandlerID = nextMsgHandlerID;
    }
}

module.exports = TelegramUserContext;