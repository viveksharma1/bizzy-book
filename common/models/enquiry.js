'use strict';

module.exports = function (Enquiry) {

    var app = require('../../server/server');
    var User = app.models.supplierscount;
    var DataSource = require('loopback-connector-mongodb');



      
    Enquiry.getEnquiry = function (code, cb) {
        Enquiry.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('enquiry');
            collection.aggregate({
                $group: {
                    _id:  { supliersName: "$supliersName", type: "$type"  },

                   
                        count: { $sum: 1 }
                    
                }
            },
         function (err, instance) {

            
             console.log(instance);
             return cb(null, instance);
             //return cb(null,  instance);            
         });

        });


    }



    Enquiry.remoteMethod(
        'getEnquiry',
        {
            http: { path: '/getEnquiry', verb: 'get' },
            accepts: {arg: 'code', type: 'string', http: { source: 'query' } },         
            returns: {arg: 'sum', type: 'number'}
           
        }
      );




    Enquiry.addEnquiry = function (ctx, req, cb) {
      
      
        console.log(req.payloads);

        Enquiry.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('enquiry');
            collection.insert(req.body,
         function (err, instance) {;


             console.log(instance);
             return cb(null, instance);

         });


        });


    }


    Enquiry.remoteMethod(
        'addEnquiry',
        {
            http: { path: '/addEnquiry', verb: 'post' },
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

        Enquiry.beforeRemote('addEnquiry', function (context, unused, next) {

            var User = app.models.supplierscount;
            var data = context.req.body

            Enquiry.getDataSource().connector.connect(function (err, db) {
                var collection = db.collection('supplierscount');

               

                    collection.update({ email: data.email }, { $inc: { enquiry: +1, } },
                        function (err, instance) {
                            

                        });
              
               
            


            });
            console.log('Putting in the car key, starting the engine.');


            next();
      
    });


     


  
};

