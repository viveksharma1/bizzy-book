module.exports = function(server)
 {
 var es = require('event-stream');
 var router = server.loopback.Router();
  var Location = server.models.account;
  Location.createChangeStream(function(err, changes)
   {
    changes.pipe(es.stringify()).pipe(process.stdout);
  });
  server.use(router);
}

