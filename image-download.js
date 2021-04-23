import request from 'request';
import { createWriteStream } from 'fs';

/**
 * Generates a unique filepath for where a file should be download to.
 * @param {String} path : directories preceding the file name
 * @param {String} ext : extension of the file
 * @returns a String containing the download path for a file
 */
export const generateFilePath = (path, ext) => {
    return path + Date.now() + ext;
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
        request(url).pipe(createWriteStream(filename)).on('close', callback);
    });
};