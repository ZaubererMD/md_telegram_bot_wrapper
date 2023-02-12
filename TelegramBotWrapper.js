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
        this.debug = false;
        this.defaultHandler = null;

        this.unknownUserReply = null;
        this.alreadyKnownReply = null;

        // Handles all messages that dont start with a forward slash (e.g. not commands)
        this.telegramBot.onText(/^([^/].*)/, (msg, matches) => {
            this.nonCommandHandler(msg, { type : 'text', matches : matches });
        });
        // Handles all media messages
        ['photo', 'video', 'voice', 'audio', 'document', 'location', 'contact', 'poll', 'sticker']
        .forEach((mediaType) => {
            this.telegramBot.on(mediaType, (msg, options) => {
                this.nonCommandHandler(msg, { type : mediaType, ...options });
            });
        });
    }

    /**
     * Handles all messages that are not commands
     * @param {object} msg 
     * @param {object} options 
     */
    nonCommandHandler(msg, options) {
        try {
            this.logDebug('Received a message that is not a command', msg);
            this.logDebug('Options:', options);

            // check whether the message comes from a known user
            let user = this.getMessageUser(msg);
            this.logDebug('User:', user);

            // If no user was found, we can stop here because unknown users may only call the /start-command
            if(user === null) {
                if(this.unknownUserReply !== null) {
                    this.sendMessage(msg.chat.id, this.unknownUserReply);
                }
            } else {
                // extract parms of the message
                let parms = this.getMessageParms(msg, options);
                this.logDebug('Parms:', parms);

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
                } else {
                    // If the user just sent something without any context, we might pass this to the default-handler if one was provided
                    if(this.defaultHandler !== null) {
                        let msgHandler = this.getMsgHandler(this.defaultHandler);
                        if(msgHandler !== undefined && msgHandler !== null) {
                            this.logDebug('Calling default handler');
                            msgHandler.execute(msg, parms, user, options.type);
                        }
                    }
                }
            }
        } catch(e) {
            this.logError(e);
        }
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
     * Removes a known user from the bot
     * @param {string} chatID The telegram-chat-id of the user to remove
     */
    removeUser(chatID) {
        let index = null;
        for(let i = 0; i < this.users.length; i++) {
            if(this.users[i].telegramChatID === chatID) {
                index = i;
                break;
            }
        }
        if(index !== null) {
            this.logDebug('Removing User:', chatID);
            this.users.splice(index, 1);
        }
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
     * Sets the default handler that handles message that are no command when no context for the user is present
     * @param {string} msgHandler ID of the MessageHandler 
     */
    setDefaultHandler(msgHandler) {
        this.defaultHandler = msgHandler;
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
            try {
                this.logDebug('Received a command:', command.command);

                // check whether the message comes from a known user
                let user = this.getMessageUser(msg);
                this.logDebug('User:', user);

                // If no user was found, we only continue if this is the /start-command
                if(user === null && command.command !== 'start') {
                    if(this.unknownUserReply !== null) {
                        this.sendMessage(msg.chat.id, this.unknownUserReply);
                    }
                } else if(user !== null && command.command === 'start') {
                    // Likewise, the /start-command can only be executed by unknown users
                    if(this.alreadyKnownReply !== null) {
                        this.sendMessage(msg.chat.id, this.alreadyKnownReply);
                    }
                } else {
                    // extract parms of the message
                    let parms = this.getMessageParms(msg, { type : 'text', matches : matches });
                    this.logDebug('Parms:', parms);

                    // get the correct message-handler depending on the number of parms we got
                    let msgHandlerIndex = Math.min(parms.length, command.msgHandlerIDs.length - 1);
                    let msgHandlerID = command.msgHandlerIDs[msgHandlerIndex];
                    this.logDebug('Message-Handler ID:', msgHandlerID);
                    let msgHandler = this.getMsgHandler(msgHandlerID);
                    if(msgHandler !== undefined && msgHandler !== null) {
                        // check if the message has the correct type for the handler
                        if(msgHandler.expectedType === 'text') {
                                msgHandler.handler(msg, parms, user);
                        }
                    }
                }
            } catch(e) {
                this.logError(e);
            }
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
        this.commands.filter(command => command.announce)
        .forEach((command) => {
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
     * Returns the user that sent the message
     * @param {object} msg 
     * @returns {TelegramBotUser|null} The user that sent the message, or null if the user is not known
     */
    getMessageUser(msg) {
        // Verify that this a known user that is allowed to communicate with the bot
        let user = this.users.find((user) => {
            return user.telegramChatID === msg.chat.id;
        });

        if(user === undefined) {
            user = null;
        }

        return user;
    }

    /**
     * Extracts command-parameters from a message
     * @param {object} msg 
     * @param {object} options 
     * @returns 
     */
    getMessageParms(msg, options) {
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
        return parms;
    }

    /**
     * Sets the text to reply with when messages from unkown users are received
     * @param {string} text the text to reply with
     */
    setUnknownUserReply(text) {
        this.unknownUserReply = text;
    }
    /**
     * Sets the text to reply with when the /start command is received from an already known user
     * @param {string} text the text to reply with
     */
    setAlreadyKnownReply(text) {
        this.alreadyKnownReply = text;
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

    /**
     * Sends an audio via telegram
     * @param {integer} chatID The telegram-chat-id to send the text to
     * @param {*} audio 
     * @param {*} options 
     */
    sendAudio(chatID, audio, options) {
        this.logDebug('Sending audio to ' + chatID);
        this.logDebug('Audio:', audio);
        this.logDebug('Options:', options);
        this.telegramBot.sendAudio(chatID, audio, options);
    }
}

module.exports = {
    TelegramBotWrapper : TelegramBotWrapper,
    TelegramBotUser : TelegramBotUser,
    TelegramCommand : TelegramCommand,
    TelegramMsgHandler : TelegramMsgHandler,
    TelegramUserContext : TelegramUserContext
};