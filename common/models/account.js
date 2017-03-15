'use strict';

module.exports = function(Account) {
    
     var app = require('../../server/server');
  
   
    var DataSource = require('loopback-connector-mongodb');
    
     Account.addammount = function (ctx, req, cb) {
      
       var credit = req.body.credit;
       var debit;
         var accountName = req.body.accountName;
    console.log(req.body);   
        // console.log(req);   
      
       Account.getDataSource().connector.connect(function (err, db) {
              
        
          if(credit!=''){
       db.collection("account").update({accountName:accountName},{ $inc: { credit: credit } },
           function (err, instance) {          
            
            
         });
          }
         if(debit!=''){
 
       db.collection("account").update({accountName:accountName},{ $inc: { debit: debit } },
           function (err, instance) {        
           
            
         });
       }
             
        });
           return cb();
       }
           
                   
    


    Account.remoteMethod(
        'addammount',
        {
            http: { path: '/addammount', verb: 'post' },
            accepts: [{ arg: 'ctx', type: 'object' },
                     {
                         arg: 'req',
                         type: 'object',
                         http: function (ctx) {
                             return ctx.req;
                         }
                     }],
            returns: { arg: 'code', type: 'string' }
        }
      );

};
