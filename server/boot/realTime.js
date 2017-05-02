module.exports = function(server)
 {
 var es = require('event-stream');
 var router = server.loopback.Router();
  var account = server.models.account;
  var voucherTransaction = server.models.voucherTransaction;
  account.createChangeStream(function(err, changes)
   {
    changes.pipe(es.stringify()).pipe(process.stdout);
  });
  voucherTransaction.createChangeStream(function(err, changes)
   {
    changes.pipe(es.stringify()).pipe(process.stdout);
  });
  server.use(router);
}

