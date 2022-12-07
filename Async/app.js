var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const keys = require('./config/keys');
var GoogleDriveFunctionWaterFall = require('./routes/GetFileFromDriveWaterFall');
var GoogleDriveFunctionSeries = require('./routes/GetFileFromDriveSeries');
var AsyncParallel = require('./routes/AsyncParallel');

// connect to mongodb
mongoose.Promise = global.Promise;
var db=mongoose.connect(keys.mongodb.dbURI, { useNewUrlParser: true, useUnifiedTopology: true  }, (error,client) => {
  if(error) {
    return console.log(error);
  }
  console.log('connected to mongodb');
});
mongoose.pluralize(null);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/googleDriveWaterFall', GoogleDriveFunctionWaterFall);
app.use('/googleDriveSeries', GoogleDriveFunctionSeries);
app.use('/add', AsyncParallel);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
