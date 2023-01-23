/**
 * This class holds information about a slash-command that can be announced to telegram
 */
class TelegramCommand {
    /**
     * 
     * @param {string} command The commands identifier. e.g. if this is set to "status", the command in telegram will be "/status"
     * @param {string} description A descriptive text that will be displayed in action-menu within the telegram app
     * @param {string[]} [msgHandlerIDs=null] IDs of the TelegramMessageHandlers that should handle this command.
     *     Defaults to the and Array containing only the value of the command-parameter.
     * @param {integer} [numParms=null] Number of parameters this command can take. Defaults to the maximum index of msgHandlerIDs (length - 1)
     */
    constructor(command, description, msgHandlerIDs = null, numParms = null) {
        this.command = command;
        this.description = description;
        this.msgHandlerIDs = msgHandlerIDs || [command];
        this.numParms = numParms || (this.msgHandlerIDs.length - 1);

        let regexStr = '\/' + this.command;
        for(let i = 0; i < this.numParms; i++) {
            regexStr += '(?: ([^\\s]*))?';
        }
        this.regex = new RegExp(regexStr, "g");
    }
}

module.exports = TelegramCommand;