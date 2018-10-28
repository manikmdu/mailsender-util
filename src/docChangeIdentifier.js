'use strict';
var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'eu-west-1'});
var moment = require('moment');

const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.docTableName || 'DOC_STORE_TABLE';
const tableIndexName = process.env.doctTableIndexName || 'dT_dST_cty_loc-index';

exports.handler = async (event, context) => {
//async function handler(event,context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    console.log(tableName + " "+ tableIndexName);
    var docChangeList=[];
    let keyConditionAttributes = await prepareKeyConditionExpression(event);

    await queryDB(keyConditionAttributes, docChangeList);

    return docChangeList;
};

async function queryDB(keyConditionAttributes, docChangeList) {
    var params = {
        TableName: tableName,
        IndexName: tableIndexName,
        ProjectionExpression: "docId, loc",
        KeyConditionExpression: "dT_dST_cty_loc = :dT_dST_cty_loc and publishedDate between :startDate and :endDate",
        ExpressionAttributeValues: {
            ":dT_dST_cty_loc": keyConditionAttributes.dT_dST_cty_loc,
            ":startDate": keyConditionAttributes.startDate,
            ":endDate": keyConditionAttributes.endDate
        }
    };
    await new Promise(function(resolve, reject) {

        docClient.query(params, function (err, data) {
            if (err) {
                console.log("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err);
            }
            else {
                console.log("Query succeeded.");
                for(const item of data.Items) {
                    console.log(" -", item.docId + ": " + item.loc);
                    docChangeList.push(item.loc);
                }
                resolve();
            }
        });
    });
}

async function prepareKeyConditionExpression(event) {
    var country;
    var language;
    var docType;
    var docSubType;
    var period = process.env.defaultPeriod;
    var startDate;
    var endDate;
    var keyExpressionAttributes = {
        startDate:'',
        endDate:'',
        dT_dST_cty_loc:''
    }

    if (null !== event && null !== event.data) {
        country = event.data.country;
        language = event.data.language;
        docType = event.data.docType;
        docSubType = event.data.docSubType;
        period = event.data.period || process.env.defaultPeriod;

        switch (period) {
            case 'THIS_MONTH':
                keyExpressionAttributes.startDate = new moment().startOf('month').format("YYYY-MM-DD");
                keyExpressionAttributes.endDate = new moment().endOf('month').format("YYYY-MM-DD");  
                break; 
        }
        //TODO: handle alternate flows if country, launguage, docType, docSubType data not available
        keyExpressionAttributes.dT_dST_cty_loc = docType+'|'+docSubType+'|'+country+'|'+language;

        console.log('Prepared keyExpressionAttributes:: '+ 
            'startDate: '+ keyExpressionAttributes.startDate +
            'endDate: '+ keyExpressionAttributes.endDate +
            'dT_dST_cty_loc: ' + keyExpressionAttributes.dT_dST_cty_loc);

        return keyExpressionAttributes;
    }
    else {
        console.log('Mandatory Input data missing');
        throw new Error("Mandatory Input data missing.");
    }


        
}


// handler({    "data": {
//     "country": "CH",
//     "language": "de",
//     "docType": "Fund_Documents",
//     "docSubType": "KIID",
//     "period": "THIS_MONTH",
//     "emailAddresses": [
//         "manikmdu@me.com"
//     ]
// }
// },null);