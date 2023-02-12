/**
 * This class holds information about a slash-command that can be announced to telegram
 */
class TelegramCommand {
    /**
     * @typedef {Object} TelegramCommandProperties
     * @property {string} command The commands identifier. e.g. if this is set to "status", the command in telegram will be "/status"
     * @property {string} description A descriptive text that will be displayed in action-menu within the telegram app
     * @property {string[]} [msgHandlerIDs=null] IDs of the TelegramMessageHandlers that should handle this command.
     *     Defaults to the and Array containing only the value of the command-parameter.
     * @property {integer} [numParms=null] Number of parameters this command can take. Defaults to the maximum index of msgHandlerIDs (length - 1)
     * @property {boolean} [announce=true] If this is set to false the command will not be announced to telegram and thus not appear in the command menu
     */
    /**
     * Creates a new instance of TelegramCommand
     * @param {TelegramCommandProperties} properties The Properties of this command
     */
    constructor({ command, description, msgHandlerIDs = null, numParms = null, announce = true }) {
        this.command = command;
        this.description = description;
        this.msgHandlerIDs = msgHandlerIDs || [command];
        this.numParms = numParms || (this.msgHandlerIDs.length - 1);
        this.announce = announce;

        let regexStr = '\/' + this.command;
        for(let i = 0; i < this.numParms; i++) {
            regexStr += '(?: ([^\\s]*))?';
        }
        this.regex = new RegExp(regexStr, "g");
    }
}

module.exports = TelegramCommand;