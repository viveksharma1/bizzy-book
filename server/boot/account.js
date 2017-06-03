
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongodb = require('mongodb');
var server = require('../../server/server')
var voucherTransaction = server.models.voucherTransaction;
var Account = server.models.account;

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
         var collection1 = db.collection('ledger');
     
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
    var compCode = req.body 
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getAccountaggregate(db,function (result) {
             if(result){
                 console.log(result)
                 var accountData = result;
                 getLedgerForReport(db, compCode,function (result) {
                     if(result){
                         var ledgerdata = result
                         var reportdata = []
                         for(var i=0;i<accountData.length;i++){
                             for(var j=0;j<ledgerdata.length;j++){
                                 if((accountData[i]._id.id).toHexString() == ledgerdata[j]._id.accountName) {
                                     var under = accountData[i]._id.accountName
                                     console.log(under)
                                     var output = {};
                                     output["account"]= under;
                                     if(accountData[i]._id.balanceType == 'credit'){
                                         output["amount"]= ledgerdata[j].credit - ledgerdata[j].debit;
                                     }if(accountData[i]._id.balanceType == 'debit'){
                                         output["amount"]= ledgerdata[j].debit - ledgerdata[j].credit ;
                                     }
                                    
                                      if(accountData[i]._id.ancestor[0] == "PRIMARY"){
                                      var index = accountData[i]._id.ancestor.indexOf("PRIMARY");
                                      if (index > -1) {
                                            accountData[i]._id.ancestor.splice(index, 1);
                                      }
                                      }
                                      output["ancestor"]= accountData[i]._id.ancestor;
                                      output["balanceType"]= accountData[i]._id.balanceType;
                                      reportdata.push(output);
                                      //console.log(reportdata)
                                 }
                             }
                         }
                         res.send(reportdata)

                     }
             });
             }
         });
    });
     var getAccountaggregate = function (db, callback) {
          var  ancestors = [ "BRANCH / DIVISIONS",
                        "CAPITAL ACCOUNT",
                        "CURRENT ASSETS",
                        "CURRENT LIABILITIES",
                        "FIXED ASSETS",
                        "INVESTMENTS",
                        "LOANS (LIABILITY)",
                        "MISC. EXPENSES (ASSET)",
                        "SUSPENSE A/C",
                    ]
       var collection = db.collection('account');
        var cursor = collection.aggregate(  
        {$match: {ancestor:{$in:ancestors}}},   
         {
           $group:
            {
              _id: {accountName: "$Under",id:"$_id",balanceType:"$balanceType",ancestor:"$ancestor"}
           }
         },  function(err, result) {
                assert.equal(err, null);
                callback(result);
      });
     }
     var getLedgerForReport = function (db,compCode, callback) {
       var collection = db.collection('ledger');
       var cursor = collection.aggregate( 
         {$match: {compCode:{$in:compCode},isUo:false}},    
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

exports.getBalanceSheet = function (req, res) {
    var toDate = new Date(req.query.date);
    var role = req.query.role
     var  ancestors = [ "BRANCH / DIVISIONS",
                        "CAPITAL ACCOUNT",
                        "CURRENT ASSETS",
                        "CURRENT LIABILITIES",
                        "FIXED ASSETS",
                        "INVESTMENTS",
                        "LOANS (LIABILITY)",
                        "MISC. EXPENSES (ASSET)",
                        "SUSPENSE A/C",
                    ]
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        getAccountForReport(db,function (result) {
            var accountId = [];
             if(result){
                 for(var i =0;i<result.length;i++){
                      var resultData = result[i].id.toHexString();
                      accountId.push(resultData); 
                 }
                 console.log(accountId)
                 getLedgerForReport(db,accountId, function (result) {
                       if(result){
                           var ledger_data = result ;
                            getAccount(db,ancestors, function (result) {
                                if(result){
                                    var reportdata = []
                                   console.log(result.length)
                                    for(var i=0;i<result.length;i++){
                                        for(var k=0;k<ledger_data.length;k++){
                                         for(var j=0;j<result[i].ancestor.length;j++){
                                             var data = result[i].ancestor[j]
                                             if((result[i]._id).toHexString() == ledger_data[k]._id.accountName) {
                                                 console.log(result[i]._id).toHexString()
                                                  console.log(data)
                                                  console.log(result[i].credit)
                                             }
                                            // reportdata.push({result[j].ancestor:result[i].credit})
                                         }
                                        }

                                    }

                                }
                               
                               res.send(result); 
                            });
                       }
                 });                     
             }
        
        });
    });

  var getAccountForReport = function (db, callback) {
       var collection = db.collection('account');
      var  ancestor = [ "BRANCH / DIVISIONS",
                        "CAPITAL ACCOUNT",
                        "CURRENT ASSETS",
                        "CURRENT LIABILITIES",
                        "FIXED ASSETS",
                        "INVESTMENTS",
                        "LOANS (LIABILITY)",
                        "MISC. EXPENSES (ASSET)",
                        "SUSPENSE A/C",
                    ]
      
       var cursor = collection.aggregate(     
       {$match: {ancestor:{$in:ancestors}}},
       {$project:{id:"$_id"}},
          function(err, result) {
                assert.equal(err, null);
                callback(result);
      });

      
 }
 var getLedgerForReport = function (db, accountId,callback) {
     console.log(accountId)
       var collection = db.collection('ledger');
       //if(req.query.role == 'O'){
       var cursor = collection.aggregate(     
         {$match: {compCode:{$in:["COM2016123456781","COM2016123456780"]},isUo:false,accountName:{$in:accountId}}},
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
  //  }
    //  if(req.query.role == 'UO'){
    //      var cursor = collection.aggregate(     
    //      {$match: { date: { $lte: toDate},compCode:{$in:compCode},visible:true}},
    //      {
    //        $group:
    //         {
    //           _id: { accountName: "$accountName" },
    //            credit: { $sum: "$credit" },
    //            debit: { $sum: "$debit" }
    //        }
    //      },  function(err, result) {
    //             assert.equal(err, null);
    //             callback(result);
    //   });
    //  }
 }
  var getAccount = function (db,ancestor,callback) {
           var collection = db.collection('account');
           collection.find({ancestor:{$in:ancestor}}).toArray(function(err, result) {
                assert.equal(err, null);
                callback(result);
           });
      }
};
exports.data1 = function (req, res) {
voucherTransaction.getDataSource().connector.connect(function (err, db) {
    var collection = db.collection('inventory');
   collection.find().forEach(function(data) {
    collection.update({
        "_id": data._id
       
    }, {
        "$set": {
            "BALANCE": Number(data.BALANCE)
        }
    },{multi:true})
   
});
});
}