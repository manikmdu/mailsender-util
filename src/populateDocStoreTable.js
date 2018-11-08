// Load the SDK for JavaScript
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-1'});
var request = require('request');
var util = require('util');

//require('request-debug')(request);




// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-10-08'});
const ch_lang_list =['en','de','it','fr','nl','da','es','fi'];
const countries =['CH', 'NL','AT', 'BE', 'CL', 'BL', 'DK', 'DE', 'ES','FI'];
function downloadJSONData(country, language, docType, cb) {

    let uri = util.format('https://api.nnip.com/DocumentsApi/v2/getDownloads/?country=%s&lang=%s&documenttypes=%s', country, language,docType);
    console.log(uri);
    request(uri, (error, response, body) => cb (error, response, body) );
}

function populateDocStoreTable(input, cb) {

    // Call DynamoDB to add the item to the table
    ddb.putItem({
        TableName : 'MANIKMDU_DOC_STORE_TABLE',
        Item: {
            "docId":{"S":input.contentId},
            "dT_dST_cty_loc":{"S":input.type+'|'+input.subType+'|'+input.countries[0]+'|'+input.language},
            "docType":{"S":input.type},
            "docSubType":{"S":input.subType},
            "cty":{"S":input.countries[0]},
            "locale":{"S":input.language},
            "loc":{"S":input.url},
            "publishedDate":{"S":input.publicationDate}   
        },
        ReturnConsumedCapacity:"TOTAL"
    }, function(err, data) {
            cb(err, data);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

countries.forEach(_country => {
    ch_lang_list.forEach(element => {
        downloadJSONData("CH",element,"KIID", (error, response, body) => {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                //console.log('body:', body); // Print the HTML for the Google homepage. 

                if(response.statusCode === 200) {
                    var data = JSON.parse(body);
                    console.log(data.totalCount);
                    data.list.forEach(element => {
                        populateDocStoreTable(element, (err, data) => {
                            console.log(err);
                            console.log( data);
                        });

                    });
                } 
        })
    }
    );
});

//populateDocStoreTable(() =>{});