/**
 * This class holds information about a slash-command that can be announced to telegram
 */
class TelegramCommand {
    /**
     * 
     * @param {string} command The commands identifier. e.g. if this is set to "status", the command in telegram will be "/status"
     * @param {string} description A descriptive text that will be displayed in action-menu within the telegram app
     * @param {string} [msgHandlerID=null] ID of the TelegramMessageHandler that should handle this command. Defaults to the value of the command-parameter.
     */
    constructor(command, description, msgHandlerID = null) {
        this.command = command;
        this.regex = new RegExp('\/' + this.command, "g");
        this.description = description;
        this.msgHandlerID = msgHandlerID || command;
    }
}

module.exports = TelegramCommand;