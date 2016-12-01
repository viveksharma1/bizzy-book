var loopback = require('loopback');
var boot = require('loopback-boot');
//var moment = require('moment');
var app = module.exports = loopback();
//var mongoose = require('mongoose');

//var url = 'mongodb://localhost:27017/test';
//mongoose.connect(url);
//var db = mongoose.connection;

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
