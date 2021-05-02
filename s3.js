import 'dotenv/config.js';
import { 
    S3Client, 
    PutObjectCommand, 
    GetObjectCommand } from "@aws-sdk/client-s3";
import { 
    createReadStream, 
    readdirSync, 
    createWriteStream } from 'fs';

// constants for S3 client configuration and S3 bucket upload
const region = process.env.S3_BUCKET_REGION;
const publickey = process.env.AWS_ACCESS_KEY_ID;
const secret = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.S3_BUCKET_NAME;

const client = new S3Client({ 
    region: region,
    accessKeyId: publickey,
    secretAccessKey: secret
});

/**
 * Uploads an image to the S3 bucket designated in the environment variable
 * @param {String} imageFolder The path to the folder (must end with a backslash)
 * @returns The key of the image that was uploaded to the S3 bucket
 */
export const s3upload = async (imageFolder, callback) => {
    // getting files from the given imageFolder path
    const files = readdirSync(imageFolder);
    if (files.length == 0) {
        throw new Error('No images downloaded');
    } else if (files.length > 1) {
        throw new Error('Should not have more than 1 image in folder');
    }

    // getting image contents
    const fileName = files[0];
    const path = imageFolder + fileName;
    const filestream = createReadStream(path);

    // setting parameters for bucket upload
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: filestream,
        ContentType: 'image/jpeg'
    };

    // uploading to S3 bucket
    const command = new PutObjectCommand(params);
    try {
        const data = await client.send(command);
        console.log('put successful');
        callback();
        return fileName;
    } catch (error) {
        console.log(error);
    } finally {
        console.log('upload done');
    }
};

/**
 * Gets an object from the S3 bucket given an valid key
 * @param {String} key Associated key for an object in the S3 bucket
 * @param {Function} callback Function to be called upon successful completion of get
 */
export const s3getImage = async (key, callback) => {
    // setting parameters for getting object from S3 bucket
    const params = {
        Bucket: bucketName,
        Key: key,
    };

    // getting from S3 bucket
    const command = new GetObjectCommand(params);
    try {
        const data = await client.send(command);

        // writing data from returned object to local file
        data.Body.pipe(createWriteStream(key)).on('close', callback);
    } catch(error) {
        console.log(error);
    } finally {
        console.log('get image done');
    }
};

// s3upload('./downloads/', () => {console.log('x');});
// const testPath = '1619597379740.jpeg';
// s3getImage(testPath, () => {console.log('x');});