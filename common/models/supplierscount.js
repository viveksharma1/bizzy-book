'use strict';

module.exports = function(Supplierscount) {
    
    
    
    var DataSource = require('loopback-connector-mongodb');


    
    Supplierscount.incrimentPo = function (ctx, req, cb) {
      
      
       
           
           console.log(req.body);
        Supplierscount.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('supplierscount');
                     
                    collection.update({email: req.body.email }, { $inc: { po: +1, } },
                        function (err, instance) {
                            
                            return cb(null, instance);
                        });
              


        });


    }


    Supplierscount.remoteMethod(
        'incrimentPo',
        {
            http: { path: '/incrimentPo', verb: 'post' },
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
