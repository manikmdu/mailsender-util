'use strict';
var AWS = require('aws-sdk');

const fs = require('fs')
const archiver = require('archiver');
const request = require('request');
const validator = require('node-input-validator');

var s3 = new AWS.S3();



exports.handler = async (event, context) => {
//async function handler(event, context) {
    await validateInput(event).catch(() => {
        return Promise.reject('Bad Input');
    });

    var archive = archiver('zip');
    //var stream = require('stream');
    var output = fs.createWriteStream('/tmp/' + 'kiid.zip');
    var downloadedFiles;
    var uploadData = {
        uploadStatus: false,
        uploadUrl: ''
    }
    var url;
    output.on('close', async function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
           url = await  uploadToBucket();
            if('' !== url) {
                console.log(url);
                uploadData.uploadUrl = url;
                uploadData.uploadStatus = true;
            }       
    });

    output.on('end', function () {
        console.log('Data has been drained');
    });

    output.on('finish', () => {
        console.log('zip prepared');
    });

    console.log('where am i printed');

    downloadedFiles = await Promise.all(event.docChangeData.docChanges.map(_key => new Promise((resolve, reject) => {
        request
            .get(_key)
            .on('error', function (err) {
                console.log(err);
            })
            .pipe(fs.createWriteStream('/tmp/' + _key.split('/').pop() + ".pdf"))
            .on('finish', () => {
                console.log('downloaded file:' + _key.split('/').pop() + ".pdf");
                resolve(_key.split('/').pop() + ".pdf");
            });
    }
    ))).catch(err => { throw new Error(err) });
    console.log(downloadedFiles);

    if (null != downloadedFiles && downloadedFiles.length > 0) {
        await new Promise((resolve, reject) => {
            //var myStream = streamTo('apistore.manikmdu.dev.doc.download.kiid', 'kiid.zip',stream);		//Now we instantiate that pipe...
            var archive = archiver('zip');
            archive.on('error', err => {
                console.log(err);
                throw new Error(err);
            });
            archive.pipe(output);
            console.log('Preparing Archive');

            for (let itm of downloadedFiles) {
                archive.append(fs.createReadStream('/tmp/' + itm), { name: itm });
            }
            archive.finalize();				//Tell is, that's all we want to add. Then when it finishes, the promise will resolve in one of those events up there
        }).catch(err => {
            console.log(err);
            throw new Error(err)
        });
        console.log('after finalize');

    } else {
        console.log('No files to zip');
    }
    console.log("test");

};

async function uploadToBucket() {
    console.log('zip is prepared. Uploading to Bucket.');
    await new Promise((resolve, reject) => {
        s3.upload({
            Bucket: 'manikmdu.test.nnip.dev.doc.kiid',
            Key: 'kiid.zip',
            Body: fs.createReadStream('/tmp/kiid.zip')
        }, async (err, data) => {
            if (err) {
                console.log("ERROR while upload");
                console.log(err.message);
                console.log(err);
                reject(err);
            }
            else {
                console.log('uploaded to bucket');
                console.log(data);
                resolve();
            }
        });
    }).catch((err) => {
        console.log(err);
        uploadData.uploadStatus = false;
    });
    var url = await new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', {
            Bucket: 'manikmdu.test.nnip.dev.doc.kiid',
            Key: 'kiid.zip'
        }, async (err, url) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(url);
            }
        });
    }).catch(err => {
        console.log(err);
        uploadData.uploadStatus = false;
    });

    return url;
}

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
            .pipe(fs.createWriteStream('/tmp/' + _key.split('/').pop() + ".pdf"))
            .on('finish', () => {
                console.log('downloaded file:' + _key.split('/').pop() + ".pdf");
                resolve(_key.split('/').pop() + ".pdf");
            });
    }
    ))).catch(err => { throw new Error(err) });
    console.log(list);
    return list;
}
/**
* Removes temp files.
* @param  {} fileNames List of filenames to remove.
 */
async function cleanup(fileNames) {
    console.log(fileNames);
    for (let fileName of fileNames) {
        fs.unlinkSync('/tmp/' + fileName);
    }
}

async function validateInput(event) {
    return new Promise(async (resolve, reject) => {
        let _validator = new validator(event, {
            'docChangeData.docChanges': 'required|array'
        });

        let matched = await _validator.check();
        if (!matched) {
            reject("Not a valid Input");
        } else {
            resolve();
        }
    });
}

// handler(
//     {
//         "docChangeData": {
//             "docChanges": [
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1589690848_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687282803_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1557266795_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0963886675_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546921296_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546922187_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546688564_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555022937_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0922502454_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0922503007_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1301030653_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1132078178_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1703072162_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1301028160_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0953791927_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687284841_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1673809486_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687287513_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0953792065_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687283363_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687284254_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546915488_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546916452_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687284767_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555020212_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546915215_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0119216801_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555021020_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555028389_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0953790440_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546916379_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687284098_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546921536_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0577845711_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687288677_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1083015625_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1703072329_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0341736642_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0846843927_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555019479_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1738490520_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0332193001_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555017697_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0922501720_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1823159238_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555022424_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0953791505_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555020725_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555015998_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555028033_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546916023_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0756536206_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0803999100_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0800560368_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1703070208_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546914242_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1473481429_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1145127293_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1703072089_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1044755665_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1738490447_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1738490793_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0509951512_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555020998_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687282555_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687287430_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0756536388_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1823159071_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0546921882_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687288594_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0119209269_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0577847170_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0119209004_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555019396_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1703070117_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687283793_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0577850471_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1623640734_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0121204944_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555028207_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687284411_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1823158859_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1473482401_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0750259714_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555019552_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1453520618_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1823158776_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0242142734_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0303706609_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0119215662_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1687288750_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0889159926_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555020642_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555022853_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0809673659_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1823158420_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0555028975_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU1160599913_CH_DE',
//                 // 'https://api.nnip.com/DocumentsApi/files/KIID_LU0577846875_CH_DE',
//                 'https://api.nnip.com/DocumentsApi/files/KIID_LU1075101847_CH_DE'
//             ]
//         }
//     }
//     , null)
//     .then((data) => {
//         console.log(data);
//     })
//     .catch((reject) => {
//         console.log(reject);
//     });
