
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongodb = require('mongodb');
var isodate = require("isodate");
var server = require('../../server/server')
var voucherTransaction = server.models.voucherTransaction;
var Account = server.models.account;
var es = require('event-stream');
var router = server.loopback.Router();
var userActivity = server.models.userActivity;
  userActivity.createChangeStream(function(err, changes)
   {
    changes.pipe(es.stringify()).pipe(process.stdout);
  });

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

// get closing balance of an account
exports.closingBalance = function (req, res) {
    var compCode = req.query.compCode 
    var accountId = req.params.accountId
    var role = req.query.role 
    console.log(" geting current balance of accountID ".green,accountId + " in company ".red,compCode)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getData(db,compCode,accountId,role,function (result) {
             if(result.length > 0){
                 getAccountType(db,accountId,function (instance) {
                 console.log(" Balance ".yellow,result)
                 console.log("account type".yellow,instance[0].balanceType)
                  if (instance[0].balanceType == 'credit') {
                        var balance = result[0].credit - result[0].debit
                    }
                    if (instance[0].balanceType == 'debit') {
                      var balance = result[0].debit - result[0].credit
                 }
                 res.send({balance:balance})
                 });
             }else{
                 console.log(" Balance ".yellow,0)
                 res.send({status:"no data"})
             }
         });
    });
    var getAccountType = function(db,accountId,callback){
        var collection = db.collection('account');
        Account.find({where:{id:accountId}},  function(err, result) {
                assert.equal(err, null);
                callback(result);
      });   
    }
    var getData = function (db,compCode,accountId,role, callback) {
        var collection = db.collection('ledger');
        if(req.query.role == 'O'){
         var cursor = collection.aggregate(     
            {$match: { compCode:compCode,accountName:accountId,isUo:false}},
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
    if(req.query.role == 'UO'){
         var cursor = collection.aggregate(     
         {$match: {compCode:compCode,accountName:accountId,visible:true}},
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
   }
}
// date Wise Account Detail
exports.dateWiseAccountDetail = function (req, res) {
    var compCode = req.body 
    var toDate = new Date(req.query.date);
    var role = req.query.role
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getLedger(db,function (result) {
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
       if(req.query.role == 'O'){
       var cursor = collection.aggregate(     
         {$match: { date: { $lte: toDate},compCode:{$in:compCode},isUo:false}},
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
     if(req.query.role == 'UO'){
         var cursor = collection.aggregate(     
         {$match: { date: { $lte: toDate},compCode:{$in:compCode},visible:true}},
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
 }
       var getAccount = function (db,callback) {
           var collection = db.collection('account');
           var cursor = collection.find({isActive:true}).toArray(function(err, result) {
                assert.equal(err, null);
                callback(result);
           });
      }
};
       
exports.getBalanceSheettest = function (req, res) {
    var compCode = req.query.compCode 
    var ancestor = req.body
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getAccountaggregate(db, ancestor,function (result) {
             if(result){
                 var accountData = result;
                 getLedgerForReport(db, compCode,function (result) {
                     if(result){
                         var ledgerdata = result
                         var reportdata = []
                         for(var i=0;i<accountData.length;i++){
                             for(var j=0;j<ledgerdata.length;j++){
                                 if((accountData[i].id == ledgerdata[j]._id.accountName)) {
                                     var output = {};
                                     if(accountData[i].balanceType == 'credit'){
                                         output["amount"]= Math.abs(ledgerdata[j].credit - ledgerdata[j].debit);
                                     }
                                     if(accountData[i].balanceType == 'debit'){
                                         output["amount"]= Math.abs(ledgerdata[j].debit - ledgerdata[j].credit) ;
                                     }
                                        var index = accountData[i].ancestor.indexOf("PRIMARY");
                                          if (index > -1) {
                                          accountData[i].ancestor.splice(index, 1);
                                         }
                                       output["ancestor"]= accountData[i].ancestor;
                                       output["balanceType"]= accountData[i].balanceType;
                                       output["id"]= accountData[i].id;
                                       output["nodes"]= []
                                       reportdata.push(output);    
                                 }
                             }
                         }
                          res.send(reportdata)
                     }else{
                          res.send("no data")
                     }
                 });
             }
         });
    });
     var getAccountaggregate = function (db,ancestors, callback) { 
       var collection = db.collection('account');
        var cursor = collection.aggregate(  
         {$match: {ancestor:{$in:ancestors}}},  
         {$match: {isActive:true}}, 
         {$project:{
             accountName:"$Under",
             id:"$_id",
             balanceType:"$balanceType",
             ancestor:"$ancestor", 
         }},  function(err, result) {
                assert.equal(err, null);
                callback(result);
      });
     }
     var getLedgerForReport = function (db,compCode, callback) {
       var collection = db.collection('ledger');
       var cursor = collection.aggregate( 
         {$match: {compCode:compCode}},    
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
}


exports.data1 = function (req, res) {
voucherTransaction.getDataSource().connector.connect(function (err, db) {
    var collection = db.collection('voucherTransaction');
   collection.find({type:"Sales Invoice"}).forEach(function(data) {
    collection.update({
        "_id": data._id
       
    }, {
        "$set": {
            "duedate": isodate(data.duedate)
            
        }
    },{multi:true})
   
});
});
}




"getGrpupDataForBalanceSheet"
exports.getGrpupDataForBalanceSheet = function (req, res) {
    var  type = req.query.type
    var  compCode = req.query.compCode
     var getLedgerData = function (db, callback) {
         var collection = db.collection('ledger');
         collection.aggregate(
                 {$match: {compCode:compCode}},    
                 {       
                    $group:
                   {
                     _id: { accountName: "$accountName" },
                      credit: { $sum: "$credit" },
                      debit: { $sum: "$debit" }
                   }
                },function(err, result) {
                    assert.equal(err, null);
                    callback(result);
           });
       }
       var getGroup = function (db,ancestors, callback) {
         var collection = db.collection('account');
         var cursor = collection.aggregate(  
           {$match:  {ancestor:type}}, 
           {$match:  {isActive:true}}, 
           {$project:{
             under:"$Under",
             id:"$_id",
             type:"$type",
             balanceType:"$balanceType",
             accountName:"$accountName",
             ancestor:"$ancestor",        
           }
        }, 
          function(err, result) {
               assert.equal(err, null);
               callback(result);
    });
}
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getGroup(db,type,function (result) {
             if(result){
                 var groupData = result;
                 getLedgerData(db,function (result) {
                     if(result){
                     var ledgerData = result
                     var accData = []
                        for(var i= 0;i<groupData.length;i++){
                            var index = groupData[i].ancestor.indexOf(type) + 1
                            for(var j= 0;j<ledgerData.length;j++){
                                if(groupData[i].id == ledgerData[j]._id.accountName){
                                    if(groupData[i].balanceType == 'credit'){
                                        amount  = Math.abs(ledgerData[j].credit - ledgerData[j].debit)
                                    }
                                    if(groupData[i].balanceType == 'debit'){
                                        amount  = Math.abs(ledgerData[j].debit - ledgerData[j].credit)
                                    } 
                                     if((groupData[i].ancestor.length-groupData[i].ancestor.indexOf(type))  == 1){   
                                     }else{
                                            accData.push({under:groupData[i].ancestor[index],amount:amount});
                                    }
                                    if(groupData[i].under == type) {
                                      accData.push({under:groupData[i].accountName,amount:amount,accountId:groupData[i].id});        
                                    } 
                                }        
                            }  
                        }    
                        res.send({data:accData});    
                  }          
               });
             }
         });   
      });
   }



exports.getSalesRegister = function (req, res) {
    var compCode = req.query.compCode
    var type = req.query.type
     var getSalesAccount = function (db,type, callback) {
       var collection = db.collection('account');
            collection.aggregate(
                   {$match: {ancestor:type,isActive:true}},    
                        
                   { $project:
                   {
                      accountName:"$accountName",
                      id:  "$_id", 
                      balanceType:"$balanceType"
                   }
                },function(err, result) {
                    assert.equal(err, null);
                    callback(result);
           });
       }
       var getLedger = function (db,compCode, callback) {
         var collection = db.collection('ledger');
         collection.aggregate(
                   {$match: {compCode:compCode}},
                 {       
                     $group:
                   {
                     _id: { accountName: "$accountName" },
                      credit: { $sum: "$credit" },
                      debit: { $sum: "$debit" }
                   }
                },function(err, result) {
                    assert.equal(err, null);
                    callback(result);
           });
      }
     
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getSalesAccount(db,type,function (result) {
             if(result){
                 console.log(result)
                 var accountData = result;
                 var data = []
                 getLedger(db,compCode,function (result) {
                     if(result){
                          console.log(result)
                       var ledgerData = result
                        for(var i= 0;i<accountData.length;i++){
                            for(var j= 0;j<ledgerData.length;j++){
                                if(accountData[i].id == ledgerData[j]._id.accountName){
                                      ledgerData[j].accountName = accountData[i].accountName
                                      data.push(ledgerData[j]);
                                }
                            }
                        }
                         res.send(data);
                     
                     }else{
                          res.send("no Data");
                     }    
                 });
             }
       });    
   });
}


"get month wise sales ledger"

exports.getMonthWiseSales = function (req, res) {
    var compCode = req.query.compCode
    
     var accountName = req.query.accountName
     var getLedger = function (db,accountName,callback) {
       var collection = db.collection('ledger');
            collection.aggregate(
                  {$match: {accountName:accountName,compCode:compCode}},    
                  { $group:
                    {
                      _id: { date: "$date",accountName:"$accountName"},
                        credit: { $sum: "$credit" },
                        debit: { $sum: "$debit" }       
                    }
                  }
                ,function(err, result) {
                    assert.equal(err, null); 
                    callback(result);
           });
       }
      
     
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getLedger(db,accountName,function (result) {
             if(result){ 
               console.log("month wise sales data".bgMagenta,result)        
               res.send(result);     
             }
       });    
   });
}