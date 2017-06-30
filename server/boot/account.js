
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongodb = require('mongodb');
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
        // var collection1 = db.collection('ledger');
     
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
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
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
    });
 }
        
exports.getBalanceSheettest = function (req, res) {
    var compCode = req.body 
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getAccountaggregate(db,function (result) {
             if(result){
                  getGroup(db,function (data1) {
                      var groupData = data1
                      for(var i=0;i<groupData.length;i++){
                          for(var j=0;j<result.length;j++){
                              if(groupData[i].name  == result[j].accountName){
                                  result[j].trackid = groupData[i].id
                              }
                          }

                      }
                 console.log(result)
                 var accountData = result;
                 getLedgerForReport(db, compCode,function (result) {
                     if(result){
                         var ledgerdata = result
                         var reportdata = []
                         for(var i=0;i<accountData.length;i++){
                             for(var j=0;j<ledgerdata.length;j++){
                                 if((accountData[i].id == ledgerdata[j]._id.accountName)) {
                                     var under = accountData[i].accountName
                                    //console.log(under)
                                     var output = {};
                                    // output["account"]= under;
                                     if(accountData[i].balanceType == 'credit'){
                                         output["amount"]= ledgerdata[j].credit - ledgerdata[j].debit;
                                     }if(accountData[i].balanceType == 'debit'){
                                         output["amount"]= ledgerdata[j].debit - ledgerdata[j].credit ;
                                     }
                                    
                                   
                                        var index = accountData[i].ancestor.indexOf("PRIMARY");
                                          if (index > -1) {
                                          accountData[i].ancestor.splice(index, 1);
                                     }
                                     
                                      output["ancestor"]= accountData[i].ancestor;
                                      output["balanceType"]= accountData[i].balanceType;
                                      output["id"]= accountData[i].id;
                                       output["trackid"]= accountData[i].trackid;
                                      reportdata.push(output);
                                      //console.log(reportdata)
                                 }
                             }
                         }
                         res.send(reportdata)

                     }
             });
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
        //   { $unwind: { path:"$ancestor",includeArrayIndex: "arrayIndex"}},
        //   {  
        //    $group:
        //     {
        //       _id: {accountName: "$Under",id:"$_id",balanceType:"$balanceType",ancestor:"$ancestor" , arrayIndex :"$arrayIndex"},
              
        //    }
        //   },
         {$project:{
             accountName:"$Under",
             id:"$_id",
             balanceType:"$balanceType",
            
             ancestor:"$ancestor",         


         }},  function(err, result) {
                assert.equal(err, null);
                console.log(result)
                callback(result);
      });
     }

     var getGroup = function (db, callback) {
       var collection = db.collection('groupMaster');
       var cursor = collection.aggregate( 
           {$project:{
             name:"$name",
             id:"$_id",   
             ancestor:"$ancestor" 

         }},
          function(err, result) {
                assert.equal(err, null);
                console.log("group",result)
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
    var collection = db.collection('voucherTransaction');
   collection.find({type:"Sales Invoice"}).forEach(function(data) {
    collection.update({
        "_id": data._id
       
    }, {
        "$set": {
            "amountUo": Number(data.amount),
            "amountO": Number(data.amount)
        }
    },{multi:true})
   
});
});
}


exports.getGrpupData = function (req, res) {
    var under = req.query.under
     var getLedgerData = function (db, callback) {
         var collection = db.collection('ledger');
         collection.aggregate(
                 // {$match: {compCode:compCode},isUo:false},    
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
       var getGroup = function (db,under, callback) {
         var collection = db.collection('account');
         collection.find({ancestor:under}).toArray(function(err, result) {
                assert.equal(err, null);
                callback(result);
        });
      }
      function getAggregateLineItems(data) {
        return Enumerable.From(data).GroupBy("$.under", null, function (key, g) {
            return {
                id: key,
                amount: g.Sum("$.amount| 0")
            }
        })
       .ToArray();
    }
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
         getGroup(db,under,function (result) {
             if(result){
                 var groupData = result;
                 var data = []
                 getLedgerData(db,function (result) {
                     if(result){
                     var ledgerData = result
                        for(var i= 0;i<groupData.length;i++){
                            for(var j= 0;j<ledgerData.length;j++){
                                if(groupData[i]._id == ledgerData[j]._id.accountName){
                                    if(groupData[i].balanceType == 'credit'){
                                        var amount = ledgerData[j].credit - ledgerData[j].debit
                                    }
                                    if(groupData[i].balanceType == 'debit'){
                                        var amount = ledgerData[j].debit - ledgerData[j].credit
                                    }
                                      data.push({under:groupData[i].Under,amount:amount});
                                }


                            }

                        }
                            //var data1 = getAggregateLineItems(data)
                            res.send(data);
                     
                     }

                   
                 });
             }

       });

      
   });
}




exports.getGrpupDataForBalanceSheet = function (req, res) {
    var  type = req.query.type
     var getLedgerData = function (db, callback) {
         var collection = db.collection('ledger');
         collection.aggregate(
                 // {$match: {compCode:compCode},isUo:false},    
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
           {$match: {ancestor:type}}, 
           {$project:{
             under:"$Under",
             id:"$_id",
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
                 console.log(result)
                 var groupData = result;
                 var data = []
                 getLedgerData(db,function (result) {
                     if(result){
                     var ledgerData = result
                     var accData = []
                     var sum = []
                        for(var i= 0;i<groupData.length;i++){
                            for(var j= 0;j<ledgerData.length;j++){
                                if(groupData[i].id == ledgerData[j]._id.accountName){
                                    if(groupData[i].balanceType == 'credit'){
                                        var amount = ledgerData[j].credit - ledgerData[j].debit
                                    }
                                    if(groupData[i].balanceType == 'debit'){
                                        var amount = ledgerData[j].debit - ledgerData[j].credit
                                    } 
                                       var obj = {under:groupData[i].accountName,amount:amount}
                                       accData.push(obj)

                                       data.push({under:groupData[i].under,amount:amount});
                                       if(groupData[i].Under != groupData[i].accountName){
                                        data.push({under:groupData[i].accountName,amount:amount});
                                       }
                                        
                                      
                                }

                                   
                            }
                            accData = []

                        }
                            //var data1 = getAggregateLineItems(data)
                            console.log("data",data)
                            res.send(data);
                     
                     }

                   
                 });
             }

       });

      
   });
}



exports.getSalesRegister = function (req, res) {
    var compCode = req.query.compCode
     var getSalesAccount = function (db, callback) {
       var collection = db.collection('account');
            collection.aggregate(
                   {$match: {ancestor:"SALES ACCOUNTS"}},    
                        
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
         getSalesAccount(db,function (result) {
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