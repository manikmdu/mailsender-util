'use strict';

var AWS = require("aws-sdk");
AWS.config.update( { region: "eu-west-1" } );
var s3 = new AWS.S3();
var stream = require('stream');

const archiver = require('archiver');

const streamTo = (bucket, key) => {
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
      
handler = async (req, ctx, cb) => {
 //async   function test(req, ctx, cb) {
	var keys = ['BE0128812931_BE_en_20180215000000.pdf'];
    var list = await Promise.all(keys.map(_key => new Promise((resolve, reject) => {
        s3.getObject({
            Bucket : "apistore.manikmdu.dev.doc.kiid",
            Key:_key
        }, (err, data) => {
            if(data) {
                resolve( { data: data.Body, name: `${_key.split('/').pop()}` } );
            } else {
                reject(err);
            }
        });
        /*
        s3.get('apistore.manikmdu.dev.doc.kiid', key)
                .then(data => resolve( { data: data.Body, name: `${key.split('/').pop()}` } ));*/
        }
    ))).catch(err => { throw new Error(err) } );

    await new Promise((resolve, reject) => { 
        var myStream = streamTo('apistore.manikmdu.dev.doc.download.kiid', 'fileName.zip');		//Now we instantiate that pipe...
        var archive = archiver('zip');
        archive.on('error', err => { throw new Error(err); } );
        
        //Your promise gets resolved when the fluid stops running... so that's when you get to close and resolve
        myStream.on('close', resolve);
        myStream.on('end', resolve);
        myStream.on('error', reject);
        
        archive.pipe(myStream);			//Pass that pipe to archive so it can push the fluid straigh down to S3 bucket
        list.forEach(itm => archive.append(itm.data, { name: itm.name } ) );		//And then we start adding files to it
        archive.finalize();				//Tell is, that's all we want to add. Then when it finishes, the promise will resolve in one of those events up there
    }).catch(err => { throw new Error(err) } );
    
    cb(null, { } );		//Handle response back to server
};

test(null, null, () => {

});