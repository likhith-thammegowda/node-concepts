'use strict';
var express = require('express');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
const async = require('async');
const path = require('path');
const fs = require('fs');
const skills = require('../json/skills.json');
const employees = require('../json/employee.json');
const loggers = require('../logger/winston');
const db = require('../app');


const { format, createLogger, transports } = require("winston");

const { combine, timestamp, label, printf,prettyPrint  } = format;
const CATEGORY = "Async Parallel";


const customFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    level: "info",
    format: combine(label({ label: CATEGORY }), timestamp(), customFormat,prettyPrint()),
    transports: [new transports.File({
        filename: "logs/info.log",
    }),],
});

router.get('/', async function (req, res, next) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        //Using Promises
        async.parallel([
            function (callback) {
                // console.log(companies)
                skills.forEach(function (skill) {
                    var myobj = { name: skill.id, description: skill.description, created_date: skill.created_date };
                    dbo.collection("skills").insertOne(myobj, function (err, res) {
                        if (err) throw err;
                    });
                })

                callback(null, 'Inserted Skills');
            },
            function (callback) {
                employees.forEach(function (employee) {
                    var myobj = { name: employee.firstName, email: employee.email, buName: employee.buName };
                    dbo.collection("employee").insertOne(myobj, function (err, res) {
                        if (err) throw err;
                    });
                })
                callback(null, 'Inserted Employee');
            }
        ]).then(results => {
            res.send(results);
            logger.log({
                level: 'info',
                message: 'Inserted Employee and Skills'
              });
            // logger.info("Inserted Skills");
            // loggers.info("Inserted Employee and Skills");
        }).catch(err => {
            res.send(err);
            loggers.info("An error occured!");
        });
    });
});

module.exports = router;
