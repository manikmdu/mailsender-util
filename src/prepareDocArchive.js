'use strict';
var AWS = require('aws-sdk');

const fs = require('fs')
const archiver = require('archiver');
const request = require('request');
const validator = require('node-input-validator');

var s3 = new AWS.S3();



//exports.handler = async (event, context) => {
async function handler(event, context) {

    await validateInput(event).catch(()=>{
        return Promise.reject('Bad Input');
    });

    var archive = archiver('zip');
    var stream = require('stream');
    let downloadedFiles = await downloadFiles(event.docChanges).catch((reject) => {
        console.log(reject);
    });

    if (null != downloadedFiles && downloadedFiles.length > 0) {
        await new Promise((resolve, reject) => { 
            var myStream = streamTo('apistore.manikmdu.dev.doc.download.kiid', 'kiid.zip',stream);		//Now we instantiate that pipe...
            var archive = archiver('zip');
            archive.on('error', err => { throw new Error(err); } );
            
            //Promise gets resolved when the fluid stops running... so that's when you get to close and resolve
            myStream.on('close', resolve);
            myStream.on('end', resolve);
            myStream.on('error', reject);
            //Pass that pipe to archive so it can push the fluid straigh down to S3 bucket
            archive.pipe(myStream);
            for(let itm of downloadedFiles) {
                archive.append(fs.createReadStream(itm), { name: itm });
            }			
            archive.finalize();				//Tell is, that's all we want to add. Then when it finishes, the promise will resolve in one of those events up there
        }).catch(err => { throw new Error(err) } );

        cleanup(downloadedFiles);
    } else {
        console.log('No files to zip');
    }
};

/**
 * Function to stream data to S3 bucket.
 * @param  {} bucket Bucket Name where the document needs to be uploaded.
 * @param  {} key The key for the document which gets uploaded.
 */
function streamTo (bucket, key, stream) {
	var pass = new stream.PassThrough();
	s3.upload( { Bucket: bucket, Key: key, Body: pass }, (err, data) => {
        if(err) {
            console.log("ERROR while upload");
            console.log(err.message);
            console.log(err);
        } else {
            console.log(data);
        }
     } );
	return pass;
};

/**
 * Download list of files from the internet and writes them into local temp folder.
 * @param  {} listOfFiles   List of URIs to download from the internet.
 */
async function downloadFiles(listOfFiles) {
    var list = await Promise.all(listOfFiles.map(_key => new Promise((resolve, reject) => {
    request
        .get(_key)
        .on('error', function (err) {
            console.log(err);
        })
        .pipe(fs.createWriteStream(_key.split('/').pop() + ".pdf"))
        .on('finish', () => {
            console.log('downloaded file:' + _key.split('/').pop() + ".pdf");
            resolve(_key.split('/').pop() + ".pdf");
        });
        }
    ))).catch(err => { throw new Error(err) } );
    console.log(list);
    return list;
}
/**
* Removes temp files.
* @param  {} fileNames List of filenames to remove.
 */
async function cleanup(fileNames) {
    for(let fileName of fileNames) {
       fs.unlinkSync(fileName);
    }
}

async function validateInput(event) {
    return new Promise(async (resolve, reject) => {
        let _validator = new validator( event, {
            'docChanges':'required|array'
        });
    
        let matched = await _validator.check();
        if (!matched) {
            reject( "Not a valid Input");
        } else {
            resolve();
        }
    });
}

handler(
    {
    "docChanges":[
    'https://api.nnip.com/DocumentsApi/files/KIID_LU1156026913_CH_DE',
    'https://api.nnip.com/DocumentsApi/files/KIID_LU1204756735_CH_DE'
]
}
, null).catch((reject) => {
    console.log(reject);
});

