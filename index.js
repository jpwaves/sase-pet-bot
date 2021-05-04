// Importing modules
import 'dotenv/config.js';
import Discord, { MessageAttachment, MessageEmbed } from 'discord.js';
import { 
    download, 
    generateFilePath, 
    clearDownloadFolder } from './image-download.js';
import { 
    s3upload,
    s3getImage } from './s3.js';
import { 
    dynamoDBUpload, 
    dynamoDBQueryUnsentImages, 
    dynamoDBRetrieveItem, 
    resetData,
    dynamoDBGetAllUnsent, 
    togglePosted } from './dynamodb.js';
import { RecurrenceRule, scheduleJob } from 'node-schedule';

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // 
    const rule = new RecurrenceRule();
	rule.hour = 10;
	rule.minute = 0;

    // const rule = '*/30 * * * * *';

    // scheduled posting
	scheduleJob(rule, () => {
		console.log('Ran postDailyPetEmbedMessage on scheduled time at ' + new Date() + '\n');
		postDailyPetEmbedMessage();
	});
});

// upload process
client.on('message', async message => {
    try {
        if (message.content.startsWith('!upload') && message.channel.id == process.env.DISCORD_TARGET_TEXT_CHANNEL_ID) {
            // redirecting user to private message !upload to begin upload process
            console.log('Cannot upload in public text channel');
            const msg = 'To upload a new pet image, private message this bot !upload to start the upload process. When uploading an image file, if you want to include the pet name, and a message to go with the photo do the following formatting:';
            message.author.send(msg);
        } else if (message.content.startsWith('!upload') && message.channel.type == 'dm') {
            if (message.attachments.size != 1) {
                message.author.send('Missing image file/can only upload 1 image per upload operation');
            } else {
                const iter = message.attachments.values();
                const messageFile = iter.next().value;
    
                const content = message.content.slice(7, message.content.length);
                const args = content.split('|').map(arg => {
                    return arg.trim();
                });
                console.log(args);
                
                const petName = args[0];
                const desc = args[1];

                // TODO: download, s3upload not going asynchronously
                // possible solution: convert using await into a series of promises (need to review how data gets passed down via then)
                try {
                    // TODO: convert download to return a read stream that can be piped directly into s3upload
                    // see https://stackoverflow.com/questions/14544911/fs-createreadstream-equivalent-for-remote-file-in-node
                    // for a possible starting point on how to do this
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
                        });
                    });

                } catch(error) {
                    console.log(error);
                    message.author.send('Upload failed. Check logs for more details.');
                }
            }
        }
    } catch(error) {
        console.log(error);
    }
});

// posts random image
const postDailyPetEmbedMessage = async () => {
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
    if (data.length == 1) {
        await resetData();
    }
    await togglePosted(embedData.embedId.S, embedData.uploaderId.S);

    // creating Discord message embed and posting it to channel
    const imageLink = `attachment://${embedData.embedId.S}`;
    const imageFile = new Discord.MessageAttachment(filestream, embedData.embedId.S);
    const msgEmbed = {
        title: embedData.petName.S,
        image: {
            url: imageLink,
        },
        author: embedData.uploaderId.S,
        description: embedData.description.S
    };
    //message.author.send({ files: [imageFile], embed: msgEmbed });
    client.channels.cache.get(process.env.DISCORD_TARGET_TEXT_CHANNEL_ID).send({ files: [imageFile], embed: msgEmbed });
}

client.on('message', async message => {
    if (message.content.startsWith('!test')) {
        await postDailyPetEmbedMessage();
    }
});

console.log(process.env.DISCORD_BOT_TOKEN);
client.login(process.env.DISCORD_BOT_TOKEN);