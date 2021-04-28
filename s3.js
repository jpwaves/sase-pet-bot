import 'dotenv/config.js';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream, readdirSync } from 'fs';

const region = process.env.S3_BUCKET_REGION;
const publickey = process.env.AWS_ACCESS_KEY_ID;
const secret = process.env.AWS_SECRET_ACCESS_KEY;
const bucketName = process.env.S3_BUCKET_NAME;

const client = new S3Client({ 
    region: region,
    accessKeyId: publickey,
    secretAccessKey: secret
});

const s3upload = async imageFolder => {
    const files = readdirSync(imageFolder);
    if (files.length == 0) {
        throw new Error('No images downloaded');
    } else if (files.length > 1) {
        throw new Error('Should not have more than 1 image in folder');
    }

    const fileName = files[0];
    const path = imageFolder + fileName;
    const filestream = createReadStream(path);
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: filestream,
    };

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