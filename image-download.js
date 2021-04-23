import request from 'request';
import { createWriteStream } from 'fs';

/**
 * Generates a unique filepath for where a file should be download to.
 * @param {String} path : directories preceding the file name
 * @returns a String containing the download path for a file
 */
export const generateFilePath = (path) => {
    return path + Date.now();
}

/**
 * Downloads the image from the url to the destination of the given file path
 * @param {String} url : url to the image
 * @param {String} filename : location to where image should be downloaded to
 * @param {Function} callback : function that should be executed when image is done
 * downloading
 */
export const download = (url, filename, callback) => {
    request(url, (err, res, body) => {
        // console.log(res.headers);

        // getting extension of image
        const header = res.headers['content-type'].split('/');
        const ext = header[header.length - 1];

        // creating pipe to write downloaded image from url to filename
        request(url).pipe(createWriteStream(filename + '.' + ext)).on('close', callback);
    });
};

// const url = 'https://media.discordapp.net/attachments/834553741805617254/834643370549837845/Icon_-_Pushpop.jpg';
// download(url, generateFilePath('./downloads/'), () => {
//     console.log('success');
// });