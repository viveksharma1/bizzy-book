

var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongodb = require('mongodb');
var server = require('../../server/server')

/* Delete contra and journal by id
   The function delete all ledger and Inventory of that particular voucher
*/
var voucherTransaction = server.models.voucherTransaction; 
  exports.deleteJournalAndContra = function (req, res) {
       var voId = req.params.voId
        voucherTransaction.getDataSource().connector.connect(function (err, db) {
             deleteVoucher(db, voId,function (result) {
            if(result.result.n){
                console.log("contra deleted",result.result.n); 
                  deleteLedger(db, voId,function (result) {
                    if(result.result.n){
                      console.log("ledger deleted",result.result.n);
                      res.status(200).send("Deleted");
                    }else{
                       res.status(200).send("Deleted");
                     }
                });        
             }
            else{
                 res.status(200).send("Can Not Delete , voId is not valid");
            }
   });
    var deleteVoucher = function (db, voId, callback) {
       var collection = db.collection('voucherTransaction');
       var cursor = collection.remove({_id:new mongodb.ObjectId(voId)},function(err, result) {
         assert.equal(err, null);
         callback(result);
      });
     }
     var deleteLedger = function (db, voRefId, callback) {
       var collection = db.collection('ledger');
       var cursor = collection.remove({voRefId:voId},function(err, result) {
         assert.equal(err, null);
         callback(result);
      });
     }
 });

  }

  /* Delete voucherTransaction by id
   The function delete all ledger and Inventory of that particular voucher
*/
    exports.deleteTransaction = function (req, res) {
        var voId = req.params.voId
        voucherTransaction.getDataSource().connector.connect(function (err, db) {
        deleteVoucher(db, voId,function (result) {
            if(result.result.n){
                console.log("voucher Transaction deleted",result.result.n);
                deleteInventory(db, voId,function (result) {
                  if(result.result.n){
                  console.log("inventory deleted",result.result.n);  
                  deleteLedger(db, voId,function (result) {
                    if(result.result.n){
                      console.log("ledger deleted",result.result.n);
                      res.status(200).send("Voucher Deleted");
                    }else{
                        res.status(200).send("Voucher Deleted");
                    }
                });    
              }else{
                  res.status(200).send("Voucher Deleted");
              }
          });    
       }
            else{
                 res.status(200).send("Can Not Delete , voId is not valid");
            }
   });
 });
     var deleteVoucher = function (db, voId, callback) {
       var collection = db.collection('voucherTransaction');
       var cursor = collection.remove({_id:new mongodb.ObjectId(voId)},function(err, result) {
         assert.equal(err, null);
         callback(result);
      });
     }
      var deleteInventory = function (db, invId, callback) {
       var collection = db.collection('inventory');
       var cursor = collection.remove({invId:voId},function(err, result) {
         assert.equal(err, null);
         callback(result);
      });
     }
     var deleteLedger = function (db, voRefId, callback) {
       var collection = db.collection('ledger');
       var cursor = collection.remove({voRefId:voId},function(err, result) {
         assert.equal(err, null);
         callback(result);
      });
     }
};

