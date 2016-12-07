var loopback = require('loopback');
var boot = require('loopback-boot');
//var mul  = require('multer');
//var express = require('express');
//var bodyParser = require('body-parser');
//var app = express();
//app.use( bodyParser.json() );
//var path = require('path');
//var http = require('http');
//var moment = require('moment');
var app = module.exports = loopback();
//var mongoose = require('mongoose');
//var url = 'mongodb://localhost:27017/test';
//mongoose.connect(url);
//var db = mongoose.connection;
//app.use( bodyParser.json({limit: '50mb'}) );
//app.use(bodyParser.urlencoded({
 // limit: '50mb',
 // extended: true,
  //parameterLimit:50000
//}));
app.start = function()
{
  // start the web server
  return app.listen(function()
  {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

/*var storage = mul.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb)
   {
    cb(null, file.originalname.replace(path.extname(file.originalname)) + '-' + Date.now() + path.extname(file.originalname))
  }
})*/
/*var upload = mul({ storage: storage });
app.use(express.static(path.join(__dirname, 'public')));
app.post('/ExcelUpload', upload.single('file'), function(req,res,next)
{
    //console.log('Uploade Successful ', req.file, req.body);
    res.json({"message":"Uploade Successful"});
});*/

app.post('/user', function(req, res)
{
    console.log(req.body);
   res.json(data);
});
boot(app, __dirname, function(err)
{
  if (err) throw err;
  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
