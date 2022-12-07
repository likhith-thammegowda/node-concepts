const { createLogger, format, transports } = require('winston');
var winston = require('winston');
require('winston-daily-rotate-file');

var fileRotateTransport = new (winston.transports.DailyRotateFile)({
    filename: './logs/%DATE%.log',
    datePattern: 'DD-MM-YYYY',
    maxSize: '20m',
    format: format.combine(
        format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
        format.align(),
        format.printf(info => `${info.level}: ${[info.timestamp]}: ${info.message}`),
    )
});

module.exports = winston.createLogger({
    transports: [
        fileRotateTransport
    ]
});