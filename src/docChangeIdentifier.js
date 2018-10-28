'use strict';
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-1'});
var docClient = new AWS.DynamoDB.DocumentClient();


exports.handler = (event, context, callback) => {

    console.log('LogScheduledEvent');
    console.log('Received event:', JSON.stringify(event, null, 2));

    var params = {
        TableName : "DOC_STORE_TABLE",
        IndexName: "dT_dST_cty_loc-index",
        ProjectionExpression:"docId, loc",
        KeyConditionExpression: "dT_dST_cty_loc = :dT_dST_cty_loc and publishedDate between :startDate and :endDate",
        ExpressionAttributeValues: {
            ":dT_dST_cty_loc": "Fund_Documents|KIID|CH|de",
            ":startDate": "2018-10-01",
            ":endDate": "2018-10-31"
        }
    };

    docClient.query(params, function(err, data) {
        if (err) {
            console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
        } else {
            console.log("Query succeeded.");
            data.Items.forEach(function(item) {
                console.log(" -", item.docId + ": " + item.loc);
            });
        }
    });
    callback(null, 'Finished');

};