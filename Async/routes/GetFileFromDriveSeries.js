'use strict';
var express = require('express');
var router = express.Router();
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
var mime = require('mime-types')
const XLSX = require('xlsx');
var nodemailer = require('nodemailer');
const csv = require('csvtojson')
require('dotenv').config();
const async = require('async');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground/';

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const APP_PASSWORD_GMAIL = process.env.APP_PASSWORD_GMAIL;



const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
// to connect to gooogle drive
const drive = google.drive({
    version: 'v3',
    auth: oauth2Client,
});

router.get('/send', async function (req, res, next) {
    // to convert json file to excel
    const responseData = fs.readFileSync(path.join(__dirname, '../json/employee.json'));
    const workSheet = XLSX.utils.json_to_sheet(JSON.parse(responseData));
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "employee");
    XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
    XLSX.write(workBook, { bookType: "xlsx", type: "binary" });
    XLSX.writeFile(workBook, "employee.xlsx");
    let rsp = {};
    //Using Promises
    async.series([
        function uploadFile(callback) {
            const filePath = path.join(__dirname, '../employee.xlsx');

            const response = drive.files.create({
                requestBody: {
                    name: 'employee.xlsx',
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
                media: {
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    body: fs.createReadStream(filePath),
                },
            }, (error, json) => {
                if (error) {
                    return console.log(error);
                }
                rsp = json.data;
                console.log(json.data);
                callback(null, json.data);

            });
        },
        function fetchFile(callback) {
            const fileId = rsp.id;
            // console.log(rsp)
            if (fileId) {
                try {
                    drive.permissions.create({
                        fileId: fileId,
                        requestBody: {
                            role: 'reader',
                            type: 'anyone',
                        },
                    });

                    var dest = fs.createWriteStream("downloaded_from_drive.xlsx");  // Please set the filename of the saved file.
                    drive.files.get(
                        { fileId: fileId, alt: "media", mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', },
                        { responseType: "stream" },
                        (err, { data }) => {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            data
                                .on("end", () => console.log("Done."))
                                .on("error", (err) => {
                                    console.log(err);
                                    return process.exit();
                                })
                                .pipe(dest);
                        }
                    )
                    const outputFilename = "converted.csv";
                    const workBook = XLSX.readFileSync(rsp.name);
                    XLSX.writeFileSync(workBook, outputFilename, { bookType: "csv" });
                    callback(null, true);

                } catch (error) {
                    console.log(error.message);
                }
            } else {
                return false;
            }

        },
        function convertCsvToJson(callback) {
            const outputFilename = "converted.csv";
            const csvFilePath = outputFilename;
            const jsonObj = csv()
                .fromFile(csvFilePath).then(() => {
                    let json = JSON.stringify(jsonObj);
                    fs.writeFileSync('drive_employee.json', json);
                    callback(null, 'done');
                });

        },
        function sendMails(callback) {
            let mailTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'developer.likhith@gmail.com',
                    pass: APP_PASSWORD_GMAIL
                },
                tls: {
                    rejectUnauthorized: false,
                }
            });

            let mailDetails = {
                from: 'developer.likhith@gmail.com',
                to: 'likhith.thammegowda@tarento.com',//srivathsa.nagaraj@tarento.com
                subject: 'Sucessfully executed the Node script',
                text: 'PFA Tarento Employee json data file',
                attachments: [{
                    filename: 'drive_employee.json',
                    path: path.join(__dirname, '../drive_employee.json')
                }]
            };

            try {
                mailTransporter.sendMail(mailDetails, function (err, data) {
                    if (err) {
                        console.log(err, "executed")
                    } else {
                        callback(null, 'mail sent successfully');
                        console.log("mail sent successfully")
                    }
                });
            } catch (error) {
                callback(null, error);
            }
        }
    ], function (err, result) {
        if (err) {
            res.send(JSON.stringify(err));
        }
        res.send(JSON.stringify(result));
    });
});

module.exports = router;
