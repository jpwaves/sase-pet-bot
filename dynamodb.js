import 'dotenv/config.js';
import { 
    DynamoDBClient, 
    GetItemCommand,
    PutItemCommand, 
    QueryCommand, 
    ScanCommand,
    UpdateItemCommand } from "@aws-sdk/client-dynamodb";

// constants for DynamoDB client and operations
const region = process.env.S3_BUCKET_REGION;
const table = process.env.DYNAMODB_TABLE_NAME;

const client = new DynamoDBClient({ 
    region: region
});

/**
 * Uploads data for creating a Discord Embed Message to the DynamoDB
 * @param {String} key Key associated with an image file in the S3 bucket
 * @param {String} uploaderId Discord ID of uploader
 * @param {String} petName Name of pet
 * @param {String} description Message to go with pet image
 */
export const dynamoDBUpload = async (key, uploaderId, petName, description) => {
    const params = {
        Item: {
            embedId: { S: key },
            uploaderId: { S: uploaderId },
            alreadyPostedInCycle: { BOOL: false },
            petName: { S: petName },
            description: { S: description }
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

/**
 * Queries all the items in the DynamoDB whose alreadyPostedInCycle attribute is false
 * @param {String} embedIdKey Target embedId of an item in the DynamoDB
 * @param {String} uploaderIdKey Target uploaderId of an item in the DynamoDB
 * @returns Array of all items that have not been sent yet in the current upload cycle
 */
export const dynamoDBQueryUnsentImages = async (embedIdKey, uploaderIdKey) => {
    const params = {
        KeyConditionExpression: 'embedId = :ei and uploaderId = :ui',
        FilterExpression: 'alreadyPostedInCycle = :posted',
        ExpressionAttributeValues: {
          ':ei': { S: embedIdKey },
          ':ui': { S: uploaderIdKey },
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

/**
 * Retrieves the item with matching embedId's and uploaderId's as the input
 * @param {String} embedIdKey Target embedId to get from DynamoDB
 * @param {String} uploaderIdKey Target uploaderId to get from DynamoDB
 * @returns The item with the given embedId and uploaderId
 */
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
        return result.Item;
    } catch(error) {
        console.log(error);
    } finally {
        console.log('retrieve done');
    }
};

// dynamoDBRetrieveItem('1619597379740.jpeg', '193375097254313984');

/**
 * Toggles the status of whether the particular item with the given embedId and uploaderId has been posted already or not
 * @param {String} embedIdKey Target embedId
 * @param {String} uploaderIdKey Target uploaderId
 */
const togglePosted = async (embedIdKey, uploaderIdKey) => {
    const item = await dynamoDBRetrieveItem(embedIdKey, uploaderIdKey);
    const params = {
        ExpressionAttributeValues: {
            ':toggledState': { BOOL: !item.alreadyPostedInCycle.BOOL }
        },
        Key: {
            embedId: { S: embedIdKey },
            uploaderId: { S: uploaderIdKey },
        },
        TableName: table,
        UpdateExpression: 'SET alreadyPostedInCycle = :toggledState'
    };

    const command = new UpdateItemCommand(params);
    try { 
        const data = await client.send(command);
        console.log(data);
        console.log('toggle successful');
    } catch(error) {
        console.log(error);
    } finally {
        console.log('toggle done');
    }
}

// await dynamoDBRetrieveItem('1619597379740.jpeg', '193375097254313984');
// await togglePosted('1619597379740.jpeg', '193375097254313984');
// await dynamoDBRetrieveItem('1619597379740.jpeg', '193375097254313984');

/**
 * Gets all the items that have been posted already in the Discord text channel
 * @returns Array of all the data in DynamoDB that have been posted already
 */
const dynamoDBGetAllSent = async () => {
    const params = {
        FilterExpression: 'alreadyPostedInCycle = :state',
        ExpressionAttributeValues: {
            ':state': { BOOL: true },
        },
        ProjectionExpression: 'embedId, uploaderId',
        TableName: table,
    }

    const command = new ScanCommand(params);
    try {
        const data = await client.send(command);
        console.log(data.Items);
        console.log('get all sent successful');
        return data.Items;
    } catch(error) {
        console(error);
    } finally {
        console.log('get all sent done');
    }
}

// await getAllItems();

/**
 * Modifies all the data in DynamoDB so the alreadyPostedInCycle attribute is false
 */
export const resetData = async () => {
    try {
        const data = await dynamoDBGetAllSent();
        data.forEach(async item => {
            console.log(item);
            await togglePosted(item.embedId.S, item.uploaderId.S);
        });
        console.log('number of items reset: ' + data.length);
    } catch(error) {
        console.log(error);
    } finally {
        console.log('reset done');
    }
};

// await resetData();

/**
 * Gets all the items that haven't been posted yet in the current posting cycle
 * @returns Array of all items that are marked as not having been posted yet in the current cycle
 */
export const dynamoDBGetAllUnsent = async () => {
    const params = {
        FilterExpression: 'alreadyPostedInCycle = :state',
        ExpressionAttributeValues: {
            ':state': { BOOL: false },
        },
        ProjectionExpression: 'embedId, uploaderId',
        TableName: table,
    }

    const command = new ScanCommand(params);
    try {
        const data = await client.send(command);
        console.log(data.Items);
        console.log('get all unsent successful');
        return data.Items;
    } catch(error) {
        console(error);
    } finally {
        console.log('get all unsent done');
    }
}

// await dynamoDBGetAllUnsent();