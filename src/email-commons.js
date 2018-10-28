'use strict';
var aws = require('aws-sdk'); 
var s3 = new aws.S3();

module.exports.getS3File = function getS3File(bucket, key) {
    return new Promise(function (resolve, reject) {
        s3.getS3File(
            {
                Bucket: bucket,
                Key: key
            },
            function (err, data) {
                if (err) return reject(err);
                else return resolve(data);
            }
        );
    })
}





