
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongodb = require('mongodb');
var server = require('../../server/server')
var voucherTransaction = server.models.voucherTransaction;

exports.isVoucherExist = function(req, res){
  var vochNo = req.params.vochNo  
  voucherTransaction.getDataSource().connector.connect(function (err, db) {
         isExist(db,function (result) {
             if(result.length>0){
                 console.log(result._id);
                 console.log(result);
                res.status(200).send({id:result[0]._id});
             }else{
                res.status(200).send("not exist");
             }
            
         })
    });
var isExist = function (db, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.find({vochNo:vochNo}).toArray(function(err,result){
            assert.equal(err, null);
            callback(result);
      });
   }
};
exports.dateWiseAccountDetail = function (req, res) {
    var compCode = req.body
    console.log(compCode)
    var toDate = new Date(req.query.date);
    var role = req.query.role
    if(req.query.role == 'UO'){
        var query =  "visible:" + true
    }
    if(req.query.role == 'O'){
        var query =  "isUo:"  + false
    }
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getLedger(db,function (result) {
             console.log(query)
             if(result){
                 var ledgerData = result
                 getAccount(db ,function (result) {
                 var accountData = result
                   if (ledgerData.length > 0) {
                    for (var i = 0; i < accountData.length; i++) {
                     for (var j = 0; j < ledgerData.length; j++) {
                      if (accountData[i]._id.toHexString() == ledgerData[j]._id.accountName) {
                       accountData[i].credit = ledgerData[j].credit
                       accountData[i].debit = ledgerData[j].debit                                        
                  }
                }
              }
            }
             res.send(accountData); 
         });
       }
    });
});
var getLedger = function (db, callback) {
       var collection = db.collection('ledger');
       var cursor = collection.aggregate(     
         {$match: { date: { $lte: toDate},compCode:{$in:compCode},query}},
         {
           $group:
            {
              _id: { accountName: "$accountName" },
               credit: { $sum: "$credit" },
               debit: { $sum: "$debit" }
           }
         },  function(err, result) {
                assert.equal(err, null);
                callback(result);
      });
     }
       var getAccount = function (db,callback) {
           var collection = db.collection('account');
           var cursor = collection.find({}).toArray(function(err, result) {
                assert.equal(err, null);
                callback(result);
           });
      }
};