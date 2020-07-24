// dependencies
const AWS = require('aws-sdk');
const util = require('util');
const xlsx = require('xlsx');
const fs = require('fs');
// get reference to S3 client
const s3 = new AWS.S3();

exports.handler = async (event, context, callback) => {

    // Read options from the event parameter.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    const srcBucket = event.Records[0].s3.bucket.name;

    // Object key may have spaces or unicode non-ASCII characters.
    const srcKey    = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    const dstBucket = srcBucket;
    const dstKey    = srcKey.split(".")[0]+"-converted.csv";
    console.log(dstKey);
    console.log("SRC event : bucket: "+srcBucket+" ,file: "+srcKey)

    // Infer the type from the file suffix.
    const typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.log("Could not determine the file type.");
        return;
    }

    // Get S3 object from src bucket
    try {
        const params = {Bucket: srcBucket, Key: srcKey};
        var s3doc = await s3.getObject(params).promise();
    } catch (error) {
        // Check IAM Role if denied access to S3
        console.log(error);
        return;
    }
    const workbook = xlsx.read(s3doc.Body);
    var outputFilename = "/tmp/out.csv";
    var content = null;
    // xlsx.writefile only takes first sheet for CSV conversion
    workbook.SheetNames.forEach((n, idx) => {
      console.log(n);
      if(n === "Details"){
        content = xlsx.write(workbook, { type: 'binary', bookType: 'csv', sheet: n});
        console.log('Found Details !');
      }
    });
    //var content = xlsx.write(xlsxBody, { type: 'binary', bookType: 'csv'});
    fs.writeFileSync(outputFilename, content, { encoding: 'binary' });
    //xlsx.writeFile(xlsxBody, outputFilename, { bookType: "csv" });

    // Upload the converted document to the destination bucket
    var buffer = fs.readFileSync(outputFilename);

    try {
        const destparams = {
            Bucket: dstBucket,
            Key: dstKey,
            Body: buffer,
            ContentType: "application/octet-stream",
        };
        const putResult = await s3.putObject(destparams).promise();
    } catch (error) {
        console.log(error);
        return;
    }

    return ('Successfully converted '+ dstKey + " from " + srcBucket + '/' + srcKey + ' and uploaded to ' + dstBucket + '/' + dstKey);
};
