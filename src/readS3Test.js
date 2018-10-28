'use strict';
var emailCommons = require('./email-commons');
var aws = require('aws-sdk'); 

function test() {

    emailCommons.getS3File('apistore.manikmdu.dev.doc.kiid', 'BE0128812931_BE_en_20180215000000.pdf')
        .then(function(fileData){
            
        })
        .catch()
}

test();
module.exports.send = (event, context, callback) => {

    getS3File('apistore.manikmdu.dev.doc.kiid', 'BE0128812931_BE_en_20180215000000.pdf')
        .then(function (fileData) {
            var mailOptions = {
                from: 'manikmdu@me.com',
                subject: 'KIID Report',
                html: `<p>Please find newly released KIID report.</p><p>Warm Regards <br/> NN Investment Partners</p>`,
                to: 'manikmdu@aol.com',
                // bcc: Any BCC address you want here in an array,
                attachments: [
                    {
                        filename: fileData.filename,
                        content: fileData.Body
                    }
                ]
            };

            console.log('Creating SES transporter');
            // create Nodemailer SES transporter
            var transporter = nodemailer.createTransport({
                SES: ses
            });

            // send email
            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                    console.log('Error sending email');
                    callback(err);
                } else {
                    console.log('Email sent successfully');
                    callback();
                }
            });
        })
        .catch(function (error) {
            console.log(error);
            console.log('Error getting attachment from S3');
            callback(err);
        });
}