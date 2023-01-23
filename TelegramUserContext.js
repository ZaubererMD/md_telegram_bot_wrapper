/**
 * This class represents the context of a user that can be set
 * by a TelegramMsgHandler to handle the next message comming from the user
 */
class TelegramUserContext {
    /**
     * Creates a new instance of TelegramUserContext
     * @param {string} nextMsgHandlerID id of the TelegramMsgHandler to execute on the next message from the user
     * @param {*} [data=null] Custom data to append to the context, that can be used in the next message-handler via the user-object
     * @param {string[]} [previousParms=null] If you set this, the elements of this array will be prepended before the new parms in the next message-handler.
     *     This can be used to easily preserve parameters over multiple message-handlers.
     */
    constructor(nextMsgHandlerID, data = null, previousParms = null) {
        this.nextMsgHandlerID = nextMsgHandlerID;
        this.data = data;
        this.previousParms = previousParms;
    }
}

module.exports = TelegramUserContext;