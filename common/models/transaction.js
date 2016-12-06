'use strict';

module.exports = function(Transaction) {
     var jwt = require('jsonwebtoken');
     var app = require('../../server/server');
  
   
    var DataSource = require('loopback-connector-mongodb');
    
     Transaction.getPo = function (ctx, req, cb) {
      
         
        console.log(req.headers.tokan);
         var tok = req.headers.tokan

       var tokdata = jwt.verify(tok, "vivek",  {   
             
        });
         
         var role = tokdata.role
         
         console.log(role);
          Transaction.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('Transaction');
            Transaction.find({where:{role:role,ordertype:"po"}},
         function (err, instance) {

              console.log(role);
             console.log(instance);
             return cb(null, instance);
             //return cb(null,  instance);            
         });

        });

         
           
           console.log(tokdata);
    }


    Transaction.remoteMethod(
        'getPo',
        {
            http: { path: '/getPo', verb: 'get' },
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
