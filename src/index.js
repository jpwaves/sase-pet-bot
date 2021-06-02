import 'dotenv/config.js';
import { 
    Client,
    MessageAttachment } from 'discord.js';
import { 
    clearDownloadFolder, 
    download, 
    generateFilePath } from './image-download.js';
import { 
    s3getImage,
    s3upload } from './s3.js';
import { 
    dynamoDBGetAllUnsent,
    dynamoDBRetrieveItem,
    dynamoDBUpload, 
    resetData,
    togglePosted } from './dynamodb.js';
import { 
    RecurrenceRule, 
    scheduleJob } from 'node-schedule';
import {
    createWriteStream
} from 'fs';

// construct Discord client for bot
const client = new Client();

/**
 * Effect: Modifies given Discord message embed object by adding the optional parameters, if any
 * @param {Object} embedData Returned object of an item from a DynamoDB GetItemCommand call
 * @param {Object} discordEmbed Object containing parameters for creating a Discord message embed
 */
const addOptionalParams = (embedData, discordEmbed) => {
    // sets title of embed to pet name if a pet name is given in the returned data
    if (embedData.petName.S != 'N/A') {
        discordEmbed.title = embedData.petName.S;
    }

    // sets description of embed to description if a description is given in the returned data
    if (embedData.description.S != 'N/A') {
        discordEmbed.description = embedData.description.S;
    }
};

/**
 * Resets data if the bot ends execution in a state where all data has been posted. Ensures bot can find a embed to post before being run.
 */
const prevalidateData = async () => {
    const data = await dynamoDBGetAllUnsent();
    if (data.length === 0) {
        await resetData();
    }
} 

/**
 * Logs any errors that occur to the error_log text file.
 * @param {String} errorMsg Error message from method
 */
const logError = async (errorMsg) => {
    const stream = createWriteStream('error_log.txt', 
    { 
        'flags': 'a' 
    });

    const timeOfError = new Date();
    stream.write(`Error occurred at: ${timeOfError}\nError Message:\n${errorMsg}\n\n`);
    stream.end();
};

// Upon startup, begin scheduled job for posting images
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Sets the status to tell users that !help is an available command for getting the total list of commands.
    client.user.setActivity('Type !help for list of commands', { type: 'LISTENING' })
    .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
    .catch(console.error);

    // Makes sure that postDailyPetEmbedMessage can find an Discord embed to post
    prevalidateData();

    // standard rule for scheduled job
    const rule = new RecurrenceRule();
    rule.tz = 'America/New_York';
	rule.hour = 7;
	rule.minute = 0;

    // rules for testing scheduled job
    // const rule = new RecurrenceRule();
    // rule.second = 0;

    // scheduled posting
	scheduleJob(rule, () => {
		console.log('Ran postDailyPetEmbedMessage on scheduled time at ' + new Date() + '\n');
		postDailyPetEmbedMessage();
	});
});

/**
 * Provides sample examples of how to use the !upload command
 */
client.on('message', async message => {
    if (message.content.trim() === '!eg') {
        const msgEmbed = {
            title: 'Example uses of !upload command:',
            fields: [
                {
                    name: 'Pet name and message',
                    value: '!upload Marshmellow | My little wittle cutie pie <3'
                },
                {
                    name: 'Only pet name',
                    value: '!upload Marshmellow | N/A'
                },
                {
                    name: 'Only message',
                    value: '!upload N/A | My little wittle cutie pie <3'
                }
            ]
        }

        // Determines where to send response to !eg command
        if (message.channel.type == 'dm') {
            message.author.send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !eg command: ' + error);
            });
        } else if (message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
            client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !eg command: ' + error);
            });
        } else {
            // We don't want the bot to respond when a command is given in the wrong text channel.
        }
    }
});

/**
 * Lists all available commands for the bot.
 */
 client.on('message', async message => {
    if (message.content.trim() === '!github') {
        const msgEmbed = {
            title: 'Click here to go to the GitHub repository for this bot!',
            url: 'https://github.com/jpwaves/sase-pet-bot'
        }

        // Determines where to send response to !github command
        if (message.channel.type == 'dm') {
            message.author.send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !github command: ' + error);
            });
        } else if (message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
            client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !github command: ' + error);
            });
        } else {
            // We don't want the bot to respond when a command is given in the wrong text channel.
        }
    }
});

/**
 * Lists all available commands for the bot.
 */
client.on('message', async message => {
    if (message.content.trim() === '!help') {
        const msgEmbed = {
            title: 'List of Commands',
            // alphabetize this list and complete it
            fields: [
                {
                    name: '!upload [insert-pet-name] | [insert-message]',
                    value: 'Use this command in conjuction with an attachment upload to add a pet photo to the bot.'
                },
                {
                    name: '!eg',
                    value: 'Example uses of the !upload command.'
                },
                {
                    name: '!github',
                    value: 'Links the page for the bot\'s GitHub repository.'
                },
                {
                    name: '!help',
                    value: 'Displays a list of commands for this bot.'
                },
                {
                    name: '!report',
                    value: 'Report an issue with the bot to the developer.'
                }
            ]
        }

        // Determines where to send response to !help command
        if (message.channel.type == 'dm') {
            message.author.send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !help command: ' + error);
            });
        } else if (message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
            client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send({ embed: msgEmbed })
            .catch(error => {
                console.log(error);
                logError('Error occurred in !help command: ' + error);
            });
        } else {
            // We don't want the bot to respond when a command is given in the wrong text channel.
        }
    }
});

/**
 * Forces bot to make one random pet photo post. Only the designated administrator of the bot can execute this command.
 */
 client.on('message', async message => {
    if (message.content.startsWith('!post') &&
     message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID && 
     message.author.tag == process.env.ADMIN_ID) {
        postDailyPetEmbedMessage();
    }
});

/**
 * Takes in any issues or suggestions for the bot
 */
client.on('message', async message => {
    if (message.content.startsWith('!report') && message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
        client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send('Please DM me (Justin Poggers/waves#4196) about any issues, bugs, or suggestions regarding the Pet Bot.')
        .catch(error => {
            console.log(error);
            logError('Error occurred in !report command: ' + error);
        });
    }
});

/**
 * Handles event where users try to upload an image that bot can post later on.
 */
client.on('message', async message => {
    try {
        if (message.content.startsWith('!upload') && message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
            // redirecting user to private message !upload to begin upload process
            console.log('Cannot upload in public text channel');
            message.delete({ reason: 'Cannot upload in public text channel' });
            const msg = 'To upload a new pet image, private message this bot !upload to start the upload process. When uploading an image file, you must include parameters for the pet name and a message description in the following format:\n !upload [pet name] | [description]\n If you don\'t want to include pet name or a message as part of the upload, put "N/A" in for the parameter you don\'t want to include. For examples, use the !eg command.';
            message.author.send(msg);
        } else if (message.content.startsWith('!upload') && message.channel.type == 'dm') {
            // checks to make sure a file was uploaded
            if (message.attachments.size !== 1) {
                message.author.send('Missing image file/can only upload 1 image per upload operation');
            } else {
                // extracting the attached file and arguments
                const iter = message.attachments.values();
                const messageFile = iter.next().value;
    
                const content = message.content.slice(7, message.content.length);
                const args = content.split('|').map(arg => arg.trim()).filter(arg => arg !== '');
                console.log(args);

                // checks that required parameters are present
                if (args.length !== 2) {
                    message.author.send('Missing either pet name or description input parameters. If you don\'t want to include a pet name or description, set the input parameter to "N/A". For examples, use the !help command.');
                } else {
                    const petName = args[0];
                    const desc = args[1];

                    try {
                        // TODO: convert download to return a read stream that can be piped directly into s3upload
                        // see https://stackoverflow.com/questions/14544911/fs-createreadstream-equivalent-for-remote-file-in-node
                        // for a possible starting point on how to do this

                        // begin download and upload process
                        console.log('starting download');
                        download(messageFile.url, generateFilePath('./downloads/'), async () => {
                            console.log('download complete');

                            console.log('starting s3 upload');
                            const key = await s3upload('./downloads/', () => {
                                console.log('upload to s3 bucket complete');
                            });
        
                            console.log('starting dynamodb upload');
                            dynamoDBUpload(key, message.author.id, petName, desc)
                            .then(() => {
                                console.log('upload to dynamodb complete');
                            })
                            .then(async () => {
                                console.log('starting image removal to clean downloads folder');
                                await clearDownloadFolder(key);
                                console.log('clean up complete');
                            })
                            .then(async () => {
                                await message.author.send('Upload Complete!');
                                console.log('upload process complete');
                            })
                            .catch(error => {
                                console.log('Error occurred during dynamodb upload process');
                                console.log(error);
                                logError('Error occurred during dynamodb upload process\n' + error);
                            });
                        });
                    } catch(error) {
                        console.log(error);
                        message.author.send('Upload failed. Check logs for more details.');
                        logError('Upload failed.\n' + error);
                    }
                }
                
            }
        }
    } catch(error) {
        console.log(error);
        logError('Something broke oof.\n' + error);
    }
});

/**
 * Gets data for a random, not-yet-posted Discord embed, creates the embed and posts it
 * in the target text channel.
 */
const postDailyPetEmbedMessage = async () => {
    try {
        // gets all items that haven't been sent yet in this posting cycle
        const data = await dynamoDBGetAllUnsent();

        // gets random item from data
        const randIdx = Math.floor(Math.random() * data.length);
        const randItem = data[randIdx];
        
        // gets embed data from random item
        const embedData = await dynamoDBRetrieveItem(randItem.embedId.S, randItem.uploaderId.S);
        // console.log(embedData);

        // gets image associated with embedData
        const filestream = await s3getImage(embedData.embedId.S, () => {
            console.log('get image complete');
        });
        
        // cycle resetting
        if (data.length <= 1) {
            await resetData();
        }
        await togglePosted(embedData.embedId.S, embedData.uploaderId.S);

        // creating Discord message embed and posting it to channel
        const imageLink = `attachment://${embedData.embedId.S}`;
        const imageFile = new MessageAttachment(filestream, embedData.embedId.S);
        const msgEmbed = {
            image: {
                url: imageLink,
            },
            author: embedData.uploaderId.S
        };
        addOptionalParams(embedData, msgEmbed);
        client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send({ files: [imageFile], embed: msgEmbed });
    } catch(error) {
        console.log('Errored during posting');
        console.log(error);
        console.log('Errored during posting\n' + error);
    }
}

// Logs in bot
client.login(process.env.DISCORD_BOT_TOKEN);