import 'dotenv/config.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream, readdirSync } from 'fs';

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
 * @param {String} imageFolder : the path to the folder (must end with a backslash)
 */
export const s3upload = async imageFolder => {
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

    // creating parameters for bucket upload
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: filestream,
    };

    // uploading to S3 bucket
    const command = new PutObjectCommand(params);
    try {
        const data = await client.send(command);
        console.log('put successful');
    } catch (error) {
        console.log(error);
    } finally {
        console.log('done');
    }
};