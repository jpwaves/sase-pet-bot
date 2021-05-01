import 'dotenv/config.js';
import { DynamoDBClient, PutItemCommand, QueryCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { createReadStream, readdirSync, createWriteStream } from 'fs';

// constants for S3 client configuration and S3 bucket upload
const region = process.env.S3_BUCKET_REGION;
const publickey = process.env.dynamodb_access_key_id;
const secret = process.env.dynamodb_secret_access_key;

const client = new DynamoDBClient({ 
    region: region
});

const table = 'sase-pet-bot-discord-embeds';

export const dynamoDBUpload = async (imageName, uploaderId, petName = null, description = null) => {
    const params = {
        Item: {
            embedId: { S: '1619597379740.jpeg' },
            uploaderId: { S: '193375097254313984' },
            alreadyPostedInCycle: { BOOL: false },
            petName: { S: 'eevee' },
            description: { S: 'i love you babyyyy ur so cutee' }
        },
        TableName: table
    };
    
    const command = new PutItemCommand(params);
    try {
        const data = await client.send(command);
        console.log(data);
        console.log('put successful');
    } catch (error) {
        console.log(error);
        console.log(command);
        console.log(params);
    } finally {
        console.log('put done');
    }
};

//dynamoDBUpload();

export const dynamoDBQueryUnsentImages = async (embedIdKey) => {
    const params = {
        KeyConditionExpression: 'embedId = :ei',
        FilterExpression: 'alreadyPostedInCycle = :posted',
        ExpressionAttributeValues: {
          ':ei': { S: embedIdKey },
          ':posted': { BOOL: false },
        },
        ProjectionExpression: 'embedId, uploaderId, alreadyPostedInCycle, petName, description',
        TableName: 'sase-pet-bot-discord-embeds',
    };
    
    const command = new QueryCommand(params);
    try {
        const results = await client.send(command);
        results.Items.forEach((element, index, array) => {
            console.log(index);
            console.log(element.embedId.S);
            console.log(array);
          });
        console.log('query successful');
        console.log(results.Items);
        return results.Items;
    } catch (error) {
        console.log(error);
    } finally {
        console.log('query done');
    }
}

// dynamoDBQueryUnsentImages('1619597379740.jpeg');

export const dynamoDBRetrieveItem = async (embedIdKey, uploaderIdKey) => {
    const params = {
        Key: {
          embedId: { S: embedIdKey },
          uploaderId: {S: uploaderIdKey }
        },
        ProjectionExpression: 'embedId, uploaderId, alreadyPostedInCycle, petName, description',
        TableName: table
    };

    const command = new GetItemCommand(params);
    try {
        const result = await client.send(command);
        console.log(result.Item);
        console.log('retrieve successful');
    } catch(error) {
        console.log(error);
    } finally {
        console.log('retrieve done');
    }
};

dynamoDBRetrieveItem('1619597379740.jpeg', '193375097254313984');