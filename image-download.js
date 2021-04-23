import request from 'request';
import { createWriteStream } from 'fs';

const generateFilePath = (path, ext) => {
    return path + Date.now() + ext;
}

const url = "https://cdn.discordapp.com/attachments/834553741805617254/834643370549837845/Icon_-_Pushpop.jpg";
export const download = (url, filename, callback) => {
    request(url, (err, res, body) => {
        // console.log(res.headers);
        request(url).pipe(createWriteStream(filename)).on('close', callback);
    });
};
download(url, generateFilePath('./downloads/', '.jpg'), () => {
    console.log('download complete')}
);