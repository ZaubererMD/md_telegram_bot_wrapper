# md_telegram_bot_wrapper
A wrapper around [node-telegram-bot-api](https://www.npmjs.com/package/node-telegram-bot-api) for easy creation of telegram bots with contextual commands.

The purpose of this project is to enable the creation of a bot that is context-aware in the sense that it seemingly "knows" about the previous conversation. This allows the bot to request further details about a commands execution if the user did not provide it initally. Instead of requiring the user to issue a command like "/temperature kitchen" to e.g. request the temperate of a sensor deployed in the kitchen, the user could also just send "/temperature" to which the bot could then reply "Which rooms temperature do you want to know?". The user would then send the commands parameter as a new message "kitchen". In both cases the bot should use the same message handler at the end, namely the "temperature" message handler with one parameter. Internally this would be represented as two ``TelegramMsgHandler`` objects, one to handle the case with 0 parameters, and one to handle the case with one parameter. This can be expanded to as many parameters as you like.

As of now bots written with this wrapper will not respond to users they dont know (or respond with a set reply), since I developed this specifically to control some smart home components at my home. Users (identified by their telegram chat-id) have to be announced to the bot from the outside project that uses this bot-wrapper. This is likely to be changed in the future to allow new users registering on the fly.

## Getting started
### Create a Telegram-Bot
First you must create a new bot on telegram. Explaining this process is not withing the scope of this readme, but you can look up the process here: [How do I create Bot?](https://core.telegram.org/bots#how-do-i-create-a-bot)

After you created your bot you should have a telegram bot-token which you will need later.

### Prerequisites
This project depends on the following npm-packages:
- [node-telegram-bot-api](https://www.npmjs.com/package/node-telegram-bot-api)@^0.61.0
- [moment](https://www.npmjs.com/package/moment)@^2.29.4

Install all dependencies via the following command:
```sh
npm install node-telegram-bot-api moment
``` 

### Installation
This package is not available on npm as of now, but you can easily include it in your projects as a git submodule.
```sh
git submodule add git@github.com:ZaubererMD/md_telegram_bot_wrapper.git
```

Note: I am very likely to change the name of this repository soon and the URL of the repo will probably change as well, since I don't really believe anybody besides me will be using it by that point. If you somehow found this repository and use it, please let me know so I can inform you of such a change beforehands.

After that just include the following in your code to load the relevant classes:
```js
const { TelegramBotUser, TelegramBotWrapper, TelegramCommand, TelegramMsgHandler, TelegramUserContext } = require('./md_telegram_bot_wrapper/TelegramBotWrapper.js');
```

## Usage

### Create a new Bot
Creation of a new bot is straightforward:
```js
var bot = new TelegramBotWrapper(TELEGRAM_TOKEN);
```
where ``TELEGRAM_TOKEN`` is the telegram bot-token you generated earlier.

### Add known users
As mentioned earlier, this bot will only reply to users it knows. Thus, you have to add known users from the code that uses the bot. Users are identified by their respective chat-id. You can find your own chat-id by sending a message to @RawDataBot as explained [here](https://www.alphr.com/find-chat-id-telegram/).

Once you know the chat-id of the user to add, just add the following code:
```js
bot.addUser(new TelegramBotUser(CHAT_ID));
```
There is also a method ``addUsers`` which will take an array of ``TelegramBotUser`` Objects.

The ``TelegramBotUser``-Object will later be passed to your message-handlers in case you need to identify the user that sent the message. If your application requires additional data about each user you can store that in the ``appData`` property which can also be set during instantiation of the ``TelegramBotUser``-Object as an optional second parameter:
```js
bot.addUser(new TelegramBotUser(CHAT_ID, APP_DATA));
```

### Create Message-Handlers
Message-Handlers are the callback-functions that will be executed when your bot receives a message from a known user. They are represented by a ``TelegramMsgHandler`` Object which is a wrapper around the callback. Each Message-Handler is identified by an id which will be important when linking Message-Handlers and commands, or when setting up user-contexts.

You can add a Message-Handler to the bot via the ``addMsgHandler`` method:
```js
bot.addMsgHandler(
    new TelegramMsgHandler('MESSAGE_HANDLER_ID',
        (msg, parms, user) => {
            // Do whatever you like
        }
    )
);
```
There is also a ``addMsgHandlers`` method which will take an array of ``TelegramMsgHandler`` objects.

- ``msg`` will be the original message-object created by [node-telegram-bot-api](https://www.npmjs.com/package/node-telegram-bot-api)
- ``parms`` will contain an Array with the parameters the user provided
- ``user`` will be the TelegramBotUser object representing the user that sent the message

Remember that a ``TelegramMsgHandler`` serves to handle a command with a set amount of parameters. Multiple Message-Handlers are grouped together via a ``TelegramCommand``.

#### Send a response
If you want to respond to a message you can call the ``sendMessage`` method:
```js
bot.sendMessage(msg.chat.id, RESPONSE_TEXT);
```
Where ``msg`` is the first parameter of your Message-Handlers callback function and ``RESPONSE_TEXT`` is the text you wish to send. Note that this bot always sends messages with the option ``{ parse_mode : 'Markdown' }``. See [Telegram Bot API](https://core.telegram.org/bots/api#sendmessage) for further details.

#### Managing User-Context
To set the Message-Handler that should be executed on the next message of the user, use the ``setContext`` method on the user-object which is the third parameter in your ``TelegramMsgHandler`` callback function:
```js
user.setContext(new TelegramUserContext('NEXT_MESSAGE_HANDLER_ID'));
```
Where ``NEXT_MESSAGE_HANDLER_ID`` is the id of the ``TelegramMsgHandler`` to use to handle the next incoming message.

Note that the context is reset as soon as the user issues a new command (a message starting with "/"). Additionally, a context will be considered invalid and thus deleted 5 minutes after its creation. You can control this timespan by providing a second argument to the ``setContext`` method:
```js
user.setContext(new TelegramUserContext('NEXT_MESSAGE_HANDLER_ID'), 10));
```
This example creates a Context that lives for 10 minutes.

In addition to setting the next message-handler you can also pass custom data to be attached to the context:
```js
user.setContext(new TelegramUserContext('NEXT_MESSAGE_HANDLER_ID', { foo : 'bar' }));
```
These can later be retrieved in a message handler by getting the user contexts data-property:
```js
let contextData = user.getContext().data;
```

Also when you are dealing with commands that take more than one parameter, you might want to pass already received parameters on to the next message-handler. For this purpose, the optional ``previousParms`` argument exists in the ``TelegramUserContext`` constructor. When you pass an Array to this argument, its elements will be prepended before the newly received ones in the next message-handlers ``parms`` argument.
```js
// 1: within a message handlers callback:
    // assume parms = ['foo', 'bar']
    // pass the already existing parms on to the next handler
    user.setContext(new TelegramUserContext('NEXT_MESSAGE_HANDLER_ID', null, parms));
    bot.respond(msg.chat.id, 'Please provide another parameter.');

// 2: user replies with "foobar"

// 3: within the callback of the NEXT_MESSAGE_HANDLER_ID message-handler
    console.log(parms); // ['foo', 'bar', 'foobar']
```
Note that if you do not pass on parms in this manner they will not be available in subsequent message-handlers.

### Create Commands
Finally, to create commands for your bot, you can use the ``addCommand`` method. In the simplest case your command takes no parameters, then you can create a Command with just two arguments:
```js
bot.addCommand(new TelegramCommand('COMMAND', 'DESCRIPTION'));
```
where ``COMMAND`` is the actual command-string (that can be used within Telegram with a "/" in front of it) and ``DESCRIPTION`` is a short descriptive text that will be used in the command-menu when you announce your commands to telegram.

In this case we left two optional parameters empty:
- ``msgHandlerIDs`` is the third parameter, which is a string-Array containing the IDs of the respective ``TelegramMsgHandler`` objects that should handle this command. ``msgHandlerIDs[0]`` will be used when this command is called with 0 parameters, ``msgHandlerIDs[1]`` when it is called with one parameter and so on. If more parameters are given than ``msgHandlerIDs.length``, then the last element of the array will be used to handle the message. Note that no more than ``numParms`` parameters will ever be passed into the handler, no matter if the user supplied more. If this parameter is left empty, it will be filled with an array containing a single string that equals the first parameter passed into the constructor (the command-string). You have to make sure a ``TelegramMsgHandler`` with this ID exists and is added to the bot. This is obviously also true if you actually do pass an array of message-handler-IDs here.
- ``numParms`` is the fourth parameter, it will default to maximum index of msgHandlerIDS (i.e. its length minus 1). This determines the maximum number of parameters your command can take.

To have a further example with one parameter, take a look at the following code:
```js
bot.addCommand('temperature', 'Get temperature of a room', ['temperature', 'temperature_room'], 1);
```
Here it would be required that message-handlers with the IDs ``temperature`` and ``temperature_room`` do exist. The ``temperature`` handler should ask the user to provide the name of the room and set the user-context to use ``temperature_room`` as the next message handler. If the user then replies, or when he calls the command with a parameter in the first place, the ``temperature_room`` message-handler will be used and the bot can return the measured temperature.

#### Announce Commands
Announcing commands to telegram is not required, but you can do so to enable the command-menu in the telegram app.
```js
bot.announceCommands();
```

## Example
The following should server as a basic example to get you started. It will create a bot with a single command ``/temperature`` as described in the Usage-section.

```js
const { TelegramBotUser, TelegramBotWrapper, TelegramCommand, TelegramMsgHandler, TelegramUserContext } = require('./md_telegram_bot_wrapper/TelegramBotWrapper.js');

const TELEGRAM_TOKEN = 'TELEGRAM_TOKEN';
const CHAT_ID = 123456; // Your chat ID

function getTemperature(room) {
    // this is not in the scope of this example, so we return a static value
    return 20;
}

var bot = new TelegramBotWrapper(TELEGRAM_TOKEN);
bot.addUser(new TelegramBotUser(CHAT_ID));

bot.addMsgHandlers([
    new TelegramMsgHandler('temperature',
        (msg, parms, user) => {
            bot.sendMessage(msg.chat.id, 'Which rooms temperature do you want to know?');
            user.setContext(new TelegramUserContext('temperature_room'));
        }
    ),
    new TelegramMsgHandler('temperature_room',
        (msg, parms, user) => {
            let room = parms[0];
            let temperature = getTemperature(room);
            let text = 'Temperature in ' + room + ': ' + temperature + '°C';
            bot.sendMessage(msg.chat.id, text);
        }
    )
]);

bot.addCommand(new TelegramCommand('temperature', 'Get temperature of a room', ['temperature', 'temperature_room']));

bot.announceCommands();
```

## License

This code is freely distributable under the terms of the [MIT license](LICENSE).