const TelegramBot = require('node-telegram-bot-api');
const TelegramBotUser = require('./TelegramBotUser.js');
const TelegramCommand = require('./TelegramCommand.js');
const TelegramMsgHandler = require('./TelegramMsgHandler.js');
const TelegramUserContext = require('./TelegramUserContext.js');

/**
 * A wrapper around node-telegram-bot-api for easy creation of telegram bots with contextual commands
 */
class TelegramBotWrapper {
    /**
     * Creates a new instance of TelegramBotWrapper
     * @param {integer} telegramToken The telegram-bot-token of the Bot
     */
    constructor(telegramToken) {
        this.telegramBot = new TelegramBot(telegramToken, { polling : true });
        this.users = [];
        this.msgHandlers = [];
        this.commands = [];
        this.unknownUserReply = null;
        this.debug = false;

        // Define default handler
        // Handles all messages that dont start with a forward slash (e.g. not commands)
        this.telegramBot.onText(/^([^/].*)/, (msg, matches) => {
            this.defaultHandler(msg, { type : 'text', matches : matches });
        });

        ['photo', 'video', 'voice', 'audio', 'document', 'location', 'contact', 'poll', 'sticker']
        .forEach((mediaType) => {
            this.telegramBot.on(mediaType, (msg, options) => {
                this.defaultHandler(msg, { type : mediaType, ...options });
            });
        });
    }

    defaultHandler(msg, options) {
        this.logDebug('Received a message that is not a command', msg);
        this.logDebug('Options:', options);

        // verify that the message comes from a known user
        this.checkMessage(msg, options)
        .then(({ msg, type, parms, user }) => {
            this.logDebug('User:', user);
            // messages that are no commands can only be handled if there is a user context
            if(user.hasContext()) {
                let userContext = user.getContext();
                this.logDebug('Context:', userContext);
                let msgHandler = this.getMsgHandler(userContext.nextMsgHandlerID);
                if(msgHandler !== undefined && msgHandler !== null) {
                    if(userContext.previousParms !== null) {
                        // prepend the previous parameters before the new ones
                        parms = [...userContext.previousParms, ...parms];
                    }
                    // check if the message has the correct type for the handler
                    if(msgHandler.expectedType === type) {
                        msgHandler.execute(msg, parms, user);
                    }
                }
            }
        }).catch((e) => {
            this.logError(e);
        });
    }

    /**
     * Writes data to the console if this.debug is true
     * @param  {...any} data data to be output on the console
     */
    logDebug(...data) {
        if(this.debug) {
            console.log('[DEBUG]', ...data);
        }
    }

    /**
     * Writes error-data to the console
     * @param  {...any} data data to be output on the console
     */
    logError(...data) {
        console.error(...data);
    }

    /**
     * Adds a known user to the Bot
     * @param {TelegramBotUser} botUser The user to add
     */
    addUser(botUser) {
        this.logDebug('New User:', botUser);
        this.users.push(botUser);
    }

    /**
     * Adds multiple known users to the Bot
     * @param {TelegramBotUser[]} botUsers The users to add
     */
    addUsers(botUsers) {
        this.users.push(...botUsers);
    }

    /**
     * Adds a Message-Handler to the Bot
     * @param {TelegramMsgHandler} msgHandler The Message-Handler to add
     */
    addMsgHandler(msgHandler) {
        this.logDebug('New MessageHandler:', msgHandler.id);
        this.msgHandlers.push(msgHandler);
    }
    /**
     * Adds multiple Message-Handlers to the Bot
     * @param {TelegramMsgHandler[]} msgHandlers The Message-Handlers to add
     */
    addMsgHandlers(msgHandlers) {
        this.msgHandlers.push(...msgHandlers);
    }
    /**
     * Retrieves a Message-Handler
     * @param {string} msgHandlerID ID of the Message-Handler to retrieve
     * @returns {TelegramMsgHandler|undefined} The Message-Handler with the given ID, if it exists. undefined if it does not exist.
     */
    getMsgHandler(msgHandlerID) {
        return this.msgHandlers.find((msgHandler) => {
            return msgHandler.id === msgHandlerID;
        });
    }

    /**
     * Adds a Command to the Bot
     * @param {TelegramCommand} command The Command to add
     */
    addCommand(command) {
        this.logDebug('New Command:', command.command);
        this.commands.push(command);

        // Register the Command Handler
        this.telegramBot.onText(command.regex, (msg, matches) => {
            this.logDebug('Received a command:', command.command);
            // verify that the message comes from a known user
            this.checkMessage(msg, { type : 'text', matches : matches })
            .then(({ msg, type, parms, user }) => {
                this.logDebug('User:', user);
                // This is the callback for registered commands
                // Thus we have to reset the users context
                user.deleteContext();

                // get the correct message-handler depending on the number of parms we got
                let msgHandlerIndex = Math.min(parms.length, command.msgHandlerIDs.length - 1);
                let msgHandlerID = command.msgHandlerIDs[msgHandlerIndex];
                let msgHandler = this.getMsgHandler(msgHandlerID);
                if(msgHandler !== undefined && msgHandler !== null) {
                    // check if the message has the correct type for the handler
                    if(msgHandler.expectedType === type) {
                        msgHandler.handler(msg, parms, user);
                    }
                }
            }).catch((e) => {
                this.logError(e);
            });
        });
    }
    /**
     * Adds multiple Commands to the Bot
     * @param {TelegramCommand[]} commands The Commands to add
     */
    addCommands(commands) {
        commands.forEach((command) => {
            this.addCommand(command);
        });
    }
    /**
     * Announces the registered commands to telegram and activates the command-menu-button
     */
    announceCommands() {
        // Prepare Commands to be announced to telegram
        let botCommandsAnnouncement = [];
        this.commands.forEach((command) => {
            botCommandsAnnouncement.push({
                command : command.command,
                description : command.description
            });
        });

        // Announce Commands to Telegram
        this.telegramBot.setMyCommands(botCommandsAnnouncement)
        .then(() => {
            // Activate Commands Menu Button
            this.telegramBot.setChatMenuButton({
                menu_button : { type : 'commands' }
            });
        });
    }

    /**
     * Verifies that a message is from a known user.
     * If it is not and the property unknownUserReply is set, the value of unknownUserReply will be sent to the user.
     * @param {object} msg The telegram message-object
     * @param {object} options
     * @returns {Promise} A Promise that is resolved with { msg, matches, user } if a user is found and rejected if not
     */
    checkMessage(msg, options) {
        return new Promise((resolve, reject) => {
            // Verify that this a known user that is allowed to communicate with the bot
            let user = this.users.find((user) => {
                return user.telegramChatID === msg.chat.id;
            });

            if(user !== undefined && user !== null) {
                
                // set parms based on the message type
                let parms = [];
                switch(options.type) {
                    case 'text':
                        // turn RegEx Matches into parms String-Array, skipping the first match (full string match)
                        for(let i = 1; i < options.matches.length; i++) {
                            if(options.matches[i] !== undefined) {
                                parms.push(options.matches[i]);
                            }
                        }
                        break;
                    case 'photo':
                        parms = msg.photo;
                        break;
                    case 'video':
                        parms.push(msg.video);
                        break;
                    case 'voice':
                        parms.push(msg.voice);
                        break;
                    case 'audio':
                        parms.push(msg.audio);
                        break;
                    case 'document':
                        parms.push(msg.document);
                        break;
                    case 'poll':
                        parms.push(msg.poll);
                        break;
                    case 'location':
                        parms.push(msg.location);
                        if(msg.venue !== undefined && msg.venue !== null) {
                            parms.push(msg.venue);
                        }
                        break;
                    case 'contact':
                        parms.push(msg.contact);
                        break;
                    case 'sticker':
                        parms.push(msg.sticker);
                        break;
                }

                resolve({ msg : msg, type : options.type, parms : parms, user : user });
            } else {
                if(this.unknownUserReply !== null) {
                    this.sendMessage(msg.chat.id, this.unknownUserReply);
                }
                reject('Unknown User');
            }
        });
    }
    /**
     * Sets the text to reply with when messages from unkown users are received
     * @param {string} text the text to reply with when messages from unkown users are received
     */
    setUnknownUserReply(text) {
        this.unknownUserReply = text;
    }

    /**
     * Sends a message via telegram
     * @param {integer} chatID The telegram-chat-id to send the text to
     * @param {string} text The text of the message
     */
    sendMessage(chatID, text) {
        this.logDebug('Sending a message to ' + chatID);
        this.logDebug('Message:', text);
        this.telegramBot.sendMessage(chatID, text, { parse_mode : 'Markdown' });
    }

    /**
     * Sends a photo via telegram
     * @param {integer} chatID The telegram-chat-id to send the text to
     * @param {*} photo 
     * @param {*} options 
     */
    sendPhoto(chatID, photo, options) {
        this.logDebug('Sending a photo to ' + chatID);
        this.logDebug('Photo:', photo);
        this.logDebug('Options:', options);
        this.telegramBot.sendPhoto(chatID, photo, options);
    }
}

module.exports = {
    TelegramBotWrapper : TelegramBotWrapper,
    TelegramBotUser : TelegramBotUser,
    TelegramCommand : TelegramCommand,
    TelegramMsgHandler : TelegramMsgHandler,
    TelegramUserContext : TelegramUserContext
};