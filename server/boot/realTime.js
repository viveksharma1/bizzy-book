module.exports = function(server)
 {
 var es = require('event-stream');
 var router = server.loopback.Router();
 // var account = server.models.account;
//var voucherTransaction = server.models.voucherTransaction;
 // account.on('changed', function(inst) {
  //console.log('model with id %s has been changed', inst.id);
  // => model with id 1 has been changed
//});
  
 // account.createChangeStream(function(err, changes)
  // {
   // changes.pipe(es.stringify()).pipe(process.stdout);
  //});
 
  server.use(router);
}

