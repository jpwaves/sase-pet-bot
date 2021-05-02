import request from 'request';
import { 
    createWriteStream, 
    unlink } from 'fs';

/**
 * Generates a unique filepath for where a file should be download to.
 * @param {String} path : directories preceding the file name
 * @returns a String containing the download path for a file
 */
export const generateFilePath = (path) => {
    return path + Date.now();
}

/**
 * (Asynchronous) Downloads the image from the url to the destination of the given file path
 * @param {String} url : url to the image
 * @param {String} filename : location to where image should be downloaded to
 * @param {Function} callback : function that should be executed when image is done
 * downloading
 */
export const download = async (url, filename, callback, data) => {
    request(url, (err, res, body) => {
        // console.log(res.headers);
        // getting extension of image
        const header = res.headers['content-type'].split('/');
        const ext = header[header.length - 1];
        // data.ext = '.' + ext;
        // creating pipe to write downloaded image from url to filename
        request(url).pipe(createWriteStream(filename + '.' + ext)).on('close', callback);
    });
};

// const data = {
//     'ext': '.png'
// };
// console.log(data);
// const url = 'https://media.discordapp.net/attachments/834553741805617254/834643370549837845/Icon_-_Pushpop.jpg';
// await download(url, generateFilePath('./downloads/'), () => {
//     console.log('success');
// }, data);
// setTimeout(() => {
//     console.log(data);
// }, 5000);

export const clearDownloadFolder = async (fileName) => {
    const path = './downloads/' + fileName;

    unlink(path, err => {
        if (err) {
            console.log('file deletion failed');
            throw err;
        }
        console.log('successfully deleted file at ' + path);
    });
};

// clearDownloadFolder('1619993435079.jpeg');