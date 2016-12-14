'use strict';

module.exports = function(Transaction) {
    
    
     var DataSource = require('loopback-connector-mongodb');
     var jwt = require('jsonwebtoken');
     var app = require('../../server/server');
     var MongoClient = require('mongodb').MongoClient;
    
   
   

     Transaction.getPo = function (ctx, req,cb) {
         
             //console.log(req.body);
             
             
                 
       // console.log(req.headers.tokan);
         var tok = req.headers.tokan

         var tokdata = jwt.verify(tok, "vivek",  {   
             
        });
         
         var role = tokdata.role
         
        // console.log(role);
            Transaction.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('Transaction');
                
            if(role == 1||role == 2) {   
            db.collection("transaction").findOne(
                
                 {no:req.body.no},
                 {"itemDetail.miscCharge":0},

                 function(err,instance){

         
           // console.log(instance);
            return cb(null, instance);
         })
            
             }
                
                else{
                    
                 db.collection("transaction").findOne(
                
                 {no:req.body.no},
                

                 function(err,instance){

         
                 //console.log(instance);
                 return cb(null, instance);
                    })  
                    
                }
                
               
        
            
         
            });
         
    
    }


    Transaction.remoteMethod(
        'getPo',
        {
            http: { path: '/getPo', verb: 'post' },
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













