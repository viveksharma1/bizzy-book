var loopback = require('loopback');
var boot = require('loopback-boot');
var es = require('event-stream');
var app = module.exports = loopback();
var bodyParser = require('body-parser');
 app.use(bodyParser.json({extended: true,limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true,limit: '50mb'}));
app.use(bodyParser.json());
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

boot(app, __dirname, function(err)
{
  if (err) throw err;
  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
