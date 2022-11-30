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


// to upload file to google drive
const uploadFile = (fetchFile) => {
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
    }, (error,json) => {
        if(error){
            return console.log(error);
        }
        fetchFile(json.data)
    });
}

// function to send email alert to user
const sendMails = () => {
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
                console.log("mail sent successfully")
            }
        });
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
}

// // function to convert csv to json
const convertCsvToJson = (outputFilename) => {
    const csvFilePath = outputFilename;
    csv()
        .fromFile(csvFilePath)
        .then((jsonObj) => {
            console.log(jsonObj);
            let json = JSON.stringify(jsonObj);
            fs.writeFileSync('drive_employee.json', json);
            // to send mail
            sendMails();
        });
    res.send(true);
}

//function to fetch uploaded file
const fetchFile = (fileDetails) => {
    const fileId = fileDetails.id;
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
            const workBook = XLSX.readFile(fileDetails.name);
            XLSX.writeFile(workBook, outputFilename, { bookType: "csv" });
            //to convert csv to json
            convertCsvToJson(outputFilename);

        } catch (error) {
            console.log(error.message);
        }
    } else {
        return false;
    }

}


router.get('/send', function (req, res, next) {
    // to convert json file to excel
    const responseData = fs.readFileSync(path.join(__dirname, '../json/employee.json'));
    const workSheet = XLSX.utils.json_to_sheet(JSON.parse(responseData));
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "employee");
    XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
    XLSX.write(workBook, { bookType: "xlsx", type: "binary" });
    XLSX.writeFile(workBook, "employee.xlsx");

    uploadFile(fetchFile);
    res.send(true)
});

module.exports = router;
