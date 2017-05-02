module.exports = function(server) {

    var mongodb = require('mongodb');
    var router = server.loopback.Router(); 
    var master = server.models.master;  
    var Inventory = server.models.inventory;  
    var BankTransaction = server.models.BankTransaction;  
    var voucherTransaction = server.models.voucherTransaction;
    var Accounts = server.models.account;  
    var Ledgers = server.models.ledger;  
    var groupMaster = server.models.groupMaster;
    var MongoClient = require('mongodb').MongoClient;
    var assert = require('assert');
    var mmongoose = require('mongoose');
    var colors = require('colors');
    //var cron = require('node-cron');
  
"rest Api Starts here"
router.post('/updateAccount',function (req, res){    
        var id = req.body.id; 
        Accounts.getDataSource().connector.connect(function (err, db) {   
        Accounts.update({id:new mongodb.ObjectId(id)},{isParent:true},function (err, instance) { 
           console.log(instance);
           console.log("account updated ");   
      }); 
         res.send({status:"200"});
   });
});

"get expense data"
router.post('/getExpense',function (req, res){    
        var refNo = req.query.refNo
        Transaction.getDataSource().connector.connect(function (err, db) {   
           var collection = db.collection('transaction');
           Transaction.find({where:{ordertype:"EXPENSE",refNo:refNo }},function (err, instance) { 
           res.send(instance);  
      });    
   });    
});

"save inventory Item"
router.post('/saveItem',function (req, res){    
        var DESCRIPTION = req.body         
        master.count({name:req.body.name},function (err, instance) { 
          if(instance){
             if(instance>0){
             res.send("item exist")
           }
      }
    else{
        master.create(req.body,function (err, instance) { 
          if (err) {    
             console.log(err)
            } 
             else{
              console.log("item Data Saved");
              res.send({"status":"200"});
             }         
         })
       }
   });      
 });

 "Account Entry function"

 function accountEntry(data,isUo,voRefId){
  var acData = data;
  Ledgers.count({voRefId:voRefId,isUo:isUo}, function (err, instance) {                                    
   if (err) {    
          console.log(err)
   }   
  else {
       count = instance;
       console.log(count)
    if(count>0)
      {      
        Ledgers.remove({voRefId:voRefId,isUo:isUo}, function (err, instance) {
                      console.log("ledger removed")       
        })                         
      }                                           
          Ledgers.create(data, function(err, instance){
                if (err) {    
                     console.log(err)
                 } else{    
                     console.log("ledger updated")                                
                  }                                    
                });                   
       }
      });
 }

 "custom Payement" 
router.post('/payement',function (req, res){ 
   var data =  req.body
    voucherTransaction.count({type:"Payment"}, function (err, instance) {                                    
     if (err) {    
        console.log(err)
    }   
      else 
         data.no = instance + 1; 
         var vochNo  = instance + 1; 
         console.log(data.paymentNo);
 voucherTransaction.getDataSource().connector.connect(function (err, db) {  
    var collection = db.collection('voucherTransaction'); 
    voucherTransaction.create( data,   function (err, instance) { 
       if (err) {    
              console.log(err)
         } 
          else{
               var customPaymentInfo ={
                     status:"done",
                     amount: data.data,
                     paymentDate:data.date,
                     bankAccount:data.vo_payment.bankAccountId,
                     partyAccount:data.vo_payment.partyAccountId,
                     voRefId:instance.id
                    }  
     voucherTransaction.update({no:data.refNo},{'billData.customPaymentInfo':customPaymentInfo} ,function (err, instance) {
          if (err) {    
                 console.log(err)
             } 
             else{
                     console.log(instance)
                }
      });
        var ledger = [];
      ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,particular:data.vo_payment.bankAccountId,refNo:vochNo,voType:"Payment",debit:Number(data.amount),voRefId:instance.id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,particular:data.vo_payment.partyAccountId,refNo:vochNo,voType:"Payment",credit:Number(data.amount),voRefId:instance.id,isUo:false}
                     )
                   accountEntry(ledger,false,instance.id); 
                   res.send({status:'200'});
              }                        
         });   
     });
   });
});

"create new Account"
router.post('/createAccount',function (req, res){
    var id = req.query.id 
      var accountData =  req.body              
      groupMaster.find({where:{name:accountData.Under}}, function (err, instance) { 
                 if(instance){
                  var ancestor = instance[0].ancestor 
                  accountData.ancestor = ancestor;
                   ancestor.push(accountData.Under);
                 
                 }
       if(id != 'null'){        
        Accounts.update({id:id}, accountData, function (err, instance) { 
             if (err) {    
                     console.log(err)
                 }   
                 else{
                  console.log("account updated")
                  res.send({"status":"Account created"})
                 }
           });  
    }
    else{       
           Accounts.create(accountData, function (err, instance) { 
             if (err) {    
                     console.log(err)
                 }   
                 else{
                  res.send({"status":"Account created"})
                 }
           });     
         }  
      }); 
  }); 
            
                 
  "update account"
  router.post('/updateAccount/:id',function (req, res){ 
      var id = req.params.id 
      var accountData = req.body
       Accounts.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('account');       
        collection.update({_id:new mongodb.ObjectId(id)},{$push:{'compCode':accountData.compCode}},function (err, instance) { 
            if(instance){
               console.log("account updated ");
               console.log(instance.result);
               res.send({status:"200"});
            }
            else{
              console.log(err);
            }      
        });     
     });
 });             
                
 "create group"
router.post('/createGroup',function (req, res){ 
   var groupData =  req.body
    groupMaster.count({accountName:groupData.name}, function (err, instance) {                                    
          if (err) {    
             console.log(err)
           }   
            else{
              if(instance>0){
                 console.log("group All Ready exist")
                 res.send({"messege":"group All Ready exist"})
              }
              else{
      groupMaster.find({where:{name:groupData.type}}, function (err, instance) { 
                 if(instance){
                   var ancestor = [];
                   var ancestor = instance[0].ancestor
                   ancestor.push(groupData.type);
                   groupData.ancestor = ancestor;
                 }
        groupMaster.create(groupData, function (err, instance) { 
             if (err) {    
                  console.log(err)
                 }   
                 else{
                  res.send({"status":"group created"})
                 }
             });  
          }); 
         }
       }            
    });
  });

   "get supplier count "
   router.get('/getSupplierCount/:compCode',function (req, res){ 
    var compCode = req.params.compCode 
     Accounts.find({where:{ancestor:'SUNDRY CREDITORS'}}, function (err, instance) { 
                 if(instance){ 
                    var count = instance.length; 
                    res.send({count:count});
                 };
           
      }); 
  });
  "get sundry creditor account"
router.get('/getSupplierAccount/:compCode',function (req, res){  
     var compCode = req.params.compCode 
     Accounts.find({where:{ancestor:'SUNDRY CREDITORS'}}, function (err, instance) { 
                 if(instance){  
                    res.send(instance);
                 };
           
       }); 
  });
  "get sales account"
router.get('/getSaleAccount/:compCode',function (req, res){  
     var compCode = req.params.compCode 
     Accounts.find({where:{ancestor: 'SALES ACCOUNTS'}}, function (err, instance) { 
                 if(instance){               
                   res.send(instance);
                 };
           
      }); 
  });
  "get sundry debitor account"
router.get('/getPartytAccount/:compCode',function (req, res){  
     var compCode = req.params.compCode 
     Accounts.find({where:{ancestor: 'SUNDRY DEBTORS'}}, function (err, instance) { 
                 if(instance){              
                   res.send(instance);
                 };
           
      }); 
  });
   
"get tax account "
router.get('/getPaymentAccount/:compCode',function (req, res){ 
  var compCode = req.params.compCode  
     Accounts.find({where:{or:[{ancestor: 'BANK ACCOUNTS'},{ancestor:'CASH-IN-HAND'}]}}, function (err, instance) { 
                 if(instance){                
                   res.send(instance);
                 };
           
      }); 
  }); 
"getExpenseAccount"
  router.get('/getExpenseAccount/:compCode',function (req, res){ 
  var compCode = req.params.compCode  
     Accounts.find({where:{or:[{ancestor: 'DIRECT EXPENSES'},{ancestor:'INDIRECT EXPENSES'}]}}, function (err, instance) { 
                 if(instance){                
                   res.send(instance);
                 };
           
       }); 
  });     
     

router.post('/saveBadlaVoucher',function (req, res){  
        var id = req.query.id
        var data = req.body;
        console.log(req.body);
    var data=req.body[0];
    var dataBadla=req.body[1];
        if (id != 'null' ) {
            var query = { id: id }
            console.log(id);
            updatePayment(req.body,id);
            //res.send({status:'200'});
      voucherTransaction.update({_id:new mongodb.ObjectId(id)}, dataBadla, function (err, instance) { 
            if(err)
              console.log(err);
            else {
               var ledger = [];
                 if(dataBadla.role == 'UO'){
          ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId, remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:id,isUo:true,visible:true});
          accountEntry(ledger,true,id);
                   }
                 else if(dataBadla.role == 'O'){

           ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId,remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:id,isUo:false});
           accountEntry(ledger,false,id); 
                   }
                 res.send({status:'200'});
                }  
           });
        }
        else {
         createPayment(data);
               voucherTransaction.create(dataBadla, function (err, instance) { 
               if(err){
                console.log(err);
               }else{
                   var vochID  = instance.id                              
                   var ledger = [];
                 if(dataBadla.role == 'UO'){
           ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId,remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:instance.id,isUo:true,visible:true});
           console.log(ledger);
                     accountEntry(ledger,true,instance.id);
                   }
                 else if(dataBadla.role == 'O'){
          
          ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId,remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:instance.id,isUo:false});
           console.log(ledger);
                     accountEntry(ledger,false,instance.id); 
                   }    
                   //updateTransactions(data.vo_payment.billDetail,data.date,data.vochNo,vochID,data.role);
           res.send({status:'200'});
         }
                 });
           
        }
   });     
   
   "Receipt"
   router.post('/receipt',function (req, res){  
        var id = req.query.id
        var data = req.body;
        console.log(req.body);
        if (id != 'null' ) {
           var query = { id: id }
           updateReceipt(req.body,id);
           res.send({status:'200'});
        }
        else {
           createReceipt(data);
           res.send({status:'200'});
        }
   });     
       function updateReceipt(data,id){
        console.log(id);
           voucherTransaction.update({_id:new mongodb.ObjectId(id)}, data, function (err, instance) { 
            if(err)
              console.log(err);
            else {
               var ledger = [];
                 if(data.role == 'UO'){
                     ledger.push({accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:id,isUo:true,visible:true}
                     )
                     console.log(ledger);
                     accountEntry(ledger,true,id);
                   }
                 else if(data.role == 'O'){

         ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:id,isUo:false}
                     )
                     console.log(ledger);
                     accountEntry(ledger,false,new mongodb.ObjectId(id)); 
                   }
                   updatePaymentLog(data.vo_payment.billDetail,data.date,data.vochNo,new mongodb.ObjectId(id),data.role);  
                }  
           });
       }

        function createReceipt(data){
          voucherTransaction.create(data, function (err, instance) { 
               if(err){
                console.log(err);
               }
                   var vochID  = instance.id                              
                   var ledger = [];
                 if(data.role == 'UO'){
           for(var m=0;m<data.vo_payment.billDetail.length;m++){
             var bill=data.vo_payment.billDetail[m];
             if(bill.interest){
               if(bill.interest>0){
                ledger.push(
                {accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Interest Receivable",credit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:true,visible:true},
                {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Interest Receivable",debit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:true,visible:true});
               }else if(bill.interest<0) {
                 ledger.push(
                 {accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Interest Payable",credit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:true,visible:true},
                               {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Interest Payable",debit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:true,visible:true});
               }
               //accountEntry(ledger,true,instance.id);
           
       }

           }
                     ledger.push({accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true}
                     )
           console.log(ledger);
                     accountEntry(ledger,true,instance.id);
                   
         }
                 else if(data.role == 'O'){
           for(var m=0;m<data.vo_payment.billDetail.length;m++){
             var bill=data.vo_payment.billDetail[m];
             if(bill.interest){

                if(bill.interest>0){
                ledger.push(
                {accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Interest Receivable",credit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:false},
                {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Interest Receivable",debit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:false});
               }else if(bill.interest<0) {
                 ledger.push(
                 {accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Interest Payable",credit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:false},
                               {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Interest Payable",debit:Math.abs(Number(bill.interest)),voRefId:instance.id,isUo:false});
               }
           }
           }
         ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:instance.id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:instance.id,isUo:false}
                     )
           console.log(ledger);
                     accountEntry(ledger,false,instance.id); 
                   
         }         console.log("updating transacation log");  
                   updateTransactions(data.vo_payment.billDetail,data.date,data.vochNo,vochID,data.role);
                 });
           
      }  
    "update payment log"
    function updatePaymentLog(data,date,vochNo,vochID,role){
       voucherTransaction.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('voucherTransaction');        
          for(var i=0 ;i<data.length;i++){  
             collection.update(
                             { vochNo:data[i].vochNo, "paymentLog.id": vochID},
                             { $set: { "paymentLog.$.amount" : data[i].amountPaid}}
                            
                             ,function (err, instance) { 
                 if(instance){     
                       console.log(instance.result);  
               } 

           });  
        }                                   
   });
}

  
   "update voucherTransaction"
      function updateTransactions(data,date,vochNo,vochID,role){  
      voucherTransaction.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('voucherTransaction');        
           for(var i = 0;i<data.length;i++ ){
              if(role == 'UO'){
                var query1 =  {$set:{adminBalance:Number(data[i].balance)}}
                var query2 =  {$push:{'paymentLog':{id:vochID,date:date,vochNo:vochNo,amount:data[i].amountPaid,isUo:true}}}
         }
          if(role == 'O'){
            var query1 =  {$set:{balance:Number(data[i].balance)}}
            var query2 =  {$push:{'paymentLog':{id:vochID,date:date,vochNo:vochNo,amount:data[i].amountPaid,isUo:false}}}

         }
    collection.update({id:vochID},query1,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }               
      });
     collection.update({id:vochID},query2, function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }
                
           });  
        }
        console.log("Transaction log updated");
     
    });       
 }
" payment voucherTransaction"
  router.post('/payment',function (req, res){  
    var data = req.body;
    //createPayment(data,true);
    var id = req.query.id
        //var data = req.body;
        //console.log(req.body);
        if (id != 'null' ) {
           //var query = { id: id }
           updatePayment(req.body,id,res);
           //res.send({status:'200'});
        }
        else {
           createPayment(data,res);
           //res.send({status:'200'});
        }
               
 });
function updatePayment(data,id,res){
        console.log(id);
           voucherTransaction.update({_id:new mongodb.ObjectId(id)}, data, function (err, instance) { 
            if(err)
              console.log(err);
            else {
               var ledger = [];
                 if(data.role == 'UO'){
                     ledger.push({accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Payment",debit:Number(data.amount),voRefId:id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Payment",credit:Number(data.amount),voRefId:id,isUo:true,visible:true}
                     )
                     console.log(ledger);
                     accountEntry(ledger,true,id);
                   }
                 else if(data.role == 'O'){

         ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Payment",debit:Number(data.amount),voRefId:id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Payment",credit:Number(data.amount),voRefId:id,isUo:false}
                     )
                     console.log(ledger);
                     accountEntry(ledger,false,new mongodb.ObjectId(id)); 
                   }
                   updatePaymentLog(data.vo_payment.billDetail,data.date,data.vochNo,new mongodb.ObjectId(id),data.role);  
                if(res) res.send(instance);
              }  
           });
       }
  function createPayment(data,res){
    voucherTransaction.create( data, function (err, instance) { 
                 if(instance){   
                 var vochID  = instance.id             
                   //res.send(instance);
                   var ledger = [];
                   if(data.role == 'UO'){
                     ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Payment",debit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Payment",credit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true}
                     )
                     accountEntry(ledger,true,instance.id);
                   }
                     if(data.role == 'O'){
           ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Payment",debit:Number(data.amount),voRefId:instance.id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Payment",credit:Number(data.amount),voRefId:instance.id,isUo:false}
                     )
                     accountEntry(ledger,false,instance.id); 
                   }    
                   updateTransactions(data.vo_payment.billDetail,data.date,data.vochNo,vochID,data.role);
           if(res) res.send(instance);
                 }

 }); 
  }

router.post('/updateInventoryStatus', function (req, res) {
        var data = req.body
        console.log(data.ids)
        var log = { status: data.status, dt: data.dt, remarks: data.remarks };
        Inventory.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('inventory');
            for (var i = 0; i < data.ids.length; i++) {
                var objectId = new mongodb.ObjectId(data.ids[i]);
                collection.findOne({ _id: objectId }, { statusTransaction: 1 }, function (err, entry) {
                    console.log("\n"+entry);
                    if (err)
                        console.log(err);
                    else {
                        var logs = [];
                        if (entry.statusTransaction)
                            logs = entry.statusTransaction;
                        logs.push(log);
                        console.log(logs);
                        collection.update({ _id: objectId }, { $set: { currentStatus: data.status, statusTransaction: logs } },{upsert:true}, function (err, instance) {
                            if (err)
                                console.log(err)
                            else {
                                console.log("status updated");
                                console.log(instance.result);

                            }
                        });
                    }
                });
            }

        });
        res.send({ status: '200' });
    });

    //Insert additional remarks
    router.post('/insertAddRemark', function (req, res) {
        var data = req.body
        console.log(data.ids)
        var log = { dt: data.dt, remarks: data.remarks };
        Inventory.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('inventory');
            for (var i = 0; i < data.ids.length; i++) {
                var objectId = new mongodb.ObjectId(data.ids[i]);
                collection.findOne({ _id: objectId }, { addRemarks: 1 }, function (err, entry) {
                    //console.log(entry);
                    if (err) {
                        console.log(err);
                    } else {
                        var logs = [];
                        if (entry.addRemarks)
                            logs = entry.addRemarks;
                        logs.push(log);
                        console.log(logs);
                        collection.update({ _id: objectId }, { $set: { addRemarks: logs } }, function (err, instance) {
                            if (err)
                                console.log(err)
                            else {
                                console.log("remark added");
                                console.log(instance.result);

                            }
                        });
                    }
                });
            }


        });
        res.send({ status: '200' });
    });

    "update weigths"
    router.post('/updateWt', function (req, res) {
        var data = req.body
        console.log(data.ids)
        var qry = {
            NETWEIGHT: data.netwt,
            ADJUSTMENTWT: data.adjustmentWt,
            TOTALNETWT: data.totalNetWt
        }

        // var log = { dt: data.dt, remarks: data.remarks };
        //var objectId = new mongodb.ObjectId(data.id);
        //console.log(objectId)
        Inventory.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('inventory');
            for (var i = 0; i < data.ids.length; i++) {
                var objectId = new mongodb.ObjectId(data.ids[i]);
                collection.update({ _id: objectId }, { $set: qry }, function (err, instance) {
                    if (err)
                        console.log(err)
                    else {
                        console.log("weigths updated");
                        console.log(instance.result);

                    }
                });
            }
        });
        res.send({ status: '200' });
    });


router.get('/getAggregateInventories', function (req, res) {
        var visible = req.query.visible;
        var columns = req.query.columns;
        var group = req.query.group;
        console.log(group);

        Inventory.getDataSource().connector.connect(function (err, db) {
            if (err) console.log(err);
            else {
                var collection = db.collection('inventory');
                collection.aggregate({ $match: { visible: visible=='true' } },{"$group": { "_id":JSON.parse( group) }}, function (err, instance) {
                    if (err) console.log(err);
                    else {
                        console.log(instance);
                        res.send(instance);
                    }

                });
            }
        

        });
    });

router.get('/getAggregateInventoriesUO', function (req, res) {
        var visible = req.query.visible;
        var columns = req.query.columns;
        var group = req.query.group;
        console.log(group);
        Inventory.getDataSource().connector.connect(function (err, db) {
            if (err) console.log(err);
            else {
                var collection = db.collection('inventory');
                collection.aggregate({ $match: { visible: visible=='false' } },{"$group": { "_id":JSON.parse( group) }}, function (err, instance) {
                    if (err) console.log(err);
                    else {
                        console.log(instance);
                        res.send(instance);
                    }
                });
            }
        });
    });



"save voucherTransaction"
router.post('/saveVoucher', function (req, res) {
        var data = req.body  
        var id = req.query.id
        if (id) {
            var query = { id: id }
        }
        else {
            query = { vochNo: data.vochNo }
        }
        voucherTransaction.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('transaction');
            voucherTransaction.count(query, function (err, instance) {
                if (err) {
                    console.log(err)
                }
                else {
                    count = instance;
                    console.log(instance)
                    if (count == 0) {
                        createVoucher(data);
                    }
                    else {
                        updateVoucher(data,id);
                    }
                }
            });
        });
       "create voucher"
        function createVoucher(data) {
            voucherTransaction.create(data, function (err, instance) {
                if (err) {
                    console.log(err)
                }
                else {
                    console.log("voucher created")
                    console.log(instance)
                    if (data.role == 'O') {
                        var invData = data.invoiceData.billData;
                        var vochNo = data.vochNo
                        var date = data.date
                        var id = instance.id
                        var accountData = data.invoiceData.accountlineItem;
                        var ledger = [];
                       
                        if (accountData) {
                            for (var i = 0; i < accountData.length; i++) {
                                ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: instance.id, isUo: false })
                            }
                        }
                        ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: false,visible:false,compCode:data.compCode },
                                    { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: false,visible:false,compCode:data.compCode }

                           )
                        accountEntry(ledger, false, instance.id);
                        updateInventoryValue(invData,id,date,vochNo);
                    }

                    if (data.role == 'UO') {
                        var accountData = data.invoiceData.accountlineItem;

                        var ledger = [];
                        if (accountData) {
                            for (var i = 0; i < accountData.length; i++) {
                                ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: instance.id, isUo: true,visible:true,compCode:data.compCode })
                            }
                        }
                        ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: true, visible: true,compCode:data.compCode },
                                { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: true, visible: true,compCode:data.compCode }

                       )
                        accountEntry(ledger, true, instance.id);
                    }

                   console.log({"message":"voucher Created","id":instance.id});
                   res.send({"message":"voucher Created","id":instance.id});
                }

            });
        }


      

      "update voucherTransaction"
        function updateVoucher(data,id) {
            if (id) {
                var query = { id: id}
            }
            else {
                query = { vochNo: data.vochNo }
            }
            voucherTransaction.update(query, data, function (err, instance) {
                if (err) {
                    console.log(err)
                }
                else {
                    console.log(instance);
                    if (data.role == 'O') {
                       
                        var invDataSales = data.invoiceData.billData;
                        var vochNo = data.vochNo
                        var date = data.date
                        

                        var accountData = data.invoiceData.accountlineItem;
                        var accountData = data.invoiceData.accountlineItem;
                        var objectId= new mongodb.ObjectId(id)
                        var ledger = [];
                        if (accountData) {
                            for (var i = 0; i < accountData.length; i++) {
                                ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(accountData[i].amount), voRefId: objectId, isUo: false, visible:false,compCode:data.compCode })
                            }
                        }
                        ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: false,visible:false,compCode:data.compCode },
                                    { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: false ,visible:false,compCode:data.compCode }

                        )
                        console.log(ledger);
                        accountEntry(ledger, false, objectId);
                        updateInventorySales(invDataSales,id,date,vochNo);
                        
                    }
                    if (data.role == 'UO') {
                         var invDataSales = data.invoiceData.billData;
                        var vochNo = data.vochNo
                        var date = data.date
                        var accountData = data.invoiceData.accountlineItem;      
                        var objectId= new mongodb.ObjectId(id)
                        var ledger = [];
                        if (accountData) {
                            for (var i = 0; i < accountData.length; i++) {
                                ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(accountData[i].amount), voRefId: objectId, isUo: true,visible:true,compCode:data.compCode })
                            }
                        }
                        ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular:  data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: true, visible: true,compCode:data.compCode },
                                { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: true, visible: true,compCode:data.compCode }

                       )     
                        accountEntry(ledger, true, objectId);
                           updateInventorySales(invDataSales,id,date,vochNo);
                    }
                    console.log({"message":"voucher Updated","id":id});
                    res.send({"message":"voucher Updated","id":id});
                }
            });
        }
    });

  "update inventory balance"
    function updateInventoryValue(data,id,date,vochNo){      
       Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');
           for(var i =0;i<data.length;i++)
            {  
                  var sum = 0 ;
                if(data[i].salesTransaction){
                 for(var j = 0;j<data[i].salesTransaction.length;j++){                  
                       var sum = sum + Number(data[i].salesTransaction[j].saleQty)
                 }
                 var invBalance = sum + Number(data[i].itemQty);
               }
               else{
                var invBalance = data[i].itemQty;
               }
             var query = {$push: {'salesTransaction': {id:id,date:date,vochNo:vochNo,saleQty:data[i].itemQty,isUo:true}}} 
             var query1 =  { $set: { "BALANCE" : invBalance}}       
             collection.update({_id:new mongodb.ObjectId(data[i].id)},query1,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 } 
                 });  
                 collection.update({_id:new mongodb.ObjectId(data[i].id)},query,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 } 
                 });           
           }                                                     
});
    }

    "update salesTransaction data in Inventory"
    function updateInventorySales(data,id,date,vochNo){
    console.log(data);
       Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');     
          for(var i = 0;i<data.length;i++)
            {  
                  var sum = 0 ;
          console.log(i);
          console.log(data[i]);
          if(data[i].salesTransaction){
            for(var j = 0;j<data[i].salesTransaction.length;j++){
             if(data[i].salesTransaction[j].id != id){      
               var sum = sum + Number(data[i].salesTransaction[j].saleQty)
             }
            }   
            var invBalance = sum + Number(data[i].itemQty);
            collection.update(
                 { _id: new mongodb.ObjectId(data[i].id), "salesTransaction.id": new mongodb.ObjectId(id)},
                 { $set: { "salesTransaction.$.saleQty" : data[i].itemQty,"BALANCE" : invBalance}}
                
                 ,function (err, instance) { 
           if(instance){     
           console.log(instance.result);  
           } 

           });
          }else{
            var invBalance = data[i].itemQty;
            var query = {$push: {'salesTransaction': {id:id,date:date,vochNo:vochNo,saleQty:data[i].itemQty,isUo:true}}} 
             var query1 =  { $set: { "BALANCE" : invBalance}}       
             collection.update({_id:new mongodb.ObjectId(data[i].id)},query1,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 } 
                 });  
                 collection.update({_id:new mongodb.ObjectId(data[i].id)},query,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 } 
                 });          
          
               }           
             }                   
                                   
        });
    }



  "Get outstanding voucher detail by customer name "
         router.get('/getVoucherData', function (req, res) {  
           var customerId  = req.query.customerId
       console.log(customerId);
           voucherTransaction.getDataSource().connector.connect(function (err, db) {   
              var collection = db.collection('voucherTransaction');  
              collection.aggregate(
                   {$match :{customerId:customerId}},
                   {$match:{balance:{$gt:0}}},
                   {$project :{
                      date: "$date",
                      duedate: "$duedate",
                      amount: "$amount",
                      vochNo: "$vochNo",
                      type: "$type",
                      balance:"$balance",
            invoiceData:"$invoiceData",
            vo_badla:"$vo_badla",
                      id:"$_id"                   
                   }
                 }
              ,function (err, instance) {
                if(instance){
                  res.send(instance)
                }
                else
                  console.log(err);
              });
            });   
        });        



  "get key value pair of account"
    router.get('/getAccountNameById', function (req, res) {  
       Accounts.getDataSource().connector.connect(function (err, db) {   
          var collection = db.collection('account');  
              collection.aggregate(
                   {$project :{
                      accountName: "$accountName",                      
                   }
                 }
              ,function (err, instance) {
                if(instance){
                  res.send(instance)
                }
                else
                  console.log(err);
              });
          });   
      })

"get starting openingBalance of an account"
router.get('/getStartingBalance/:accountName',function (req, res){
     var compCode = req.query.compCode
     var accountName = req.params.accountName
     console.log(compCode,accountName)
Accounts.getDataSource().connector.connect(function (err, db) {  
     var collection = db.collection('account'); 
   Accounts.find({where:{accountName:accountName}},function (err, instance) { 
          if(instance){
            console.log("accountData",instance)
                res.send(instance);  
          }           
       }); 
    }); 
});
"get openingBalance of a particular account"
router.get('/getOpeningBalnceByAccountName/:compCode',function (req, res){ 
     var compCode = req.params.compCode
     var accountName = req.query.accountName
     var toDate = new Date(req.query.date);
     console.log(toDate)
   Ledgers.getDataSource().connector.connect(function (err, db) {  
     var collection = db.collection('ledger'); 
     collection.aggregate(
        { $match : {
           date: {
           $lte: toDate   
       },
         compCode:compCode,
         accountName:accountName
     }}, 
       { $group:
         {
           _id: {accountName:"$accountName"},          
           credit: { $sum: "$credit" },
           debit: { $sum: "$debit" }
         }
       }
          , function (err, instance) {
              if(instance.length>0){
                var openingBalance = {credit:instance[0].credit,debit:instance[0].debit}
                res.send({openingBalance:openingBalance}); 
              }
              else{
                res.send("no data"); 
              }     
         });
     });
 });

router.get('/dateWiseAccountDetail/:compCode',function (req, res){ 
    var compCode = req.params.compCode
    var toDate = new Date(req.query.date);
    console.log(toDate)
    console.log(compCode)
Ledgers.getDataSource().connector.connect(function (err, db) {  
   var collection = db.collection('ledger'); 
   collection.aggregate(
   { $match : {
      date: {
      $lte: toDate
      
    },
    compCode:compCode,
  }}, 
     { $group:
         {
           _id: {accountName:"$accountName"},          
           credit: { $sum: "$credit" },
           debit: { $sum: "$debit" }
         }
       }
,   function (err, instance) {
          var ledgerDatalessThan = instance 
          var ledgerDatagreaterThan = instance
          console.log(instance);
        Accounts.find({where:{isActive:true}},function (err, instance) { 
          var accountData = instance    
          ledgerData = ledgerDatalessThan 
          if(ledgerDatalessThan.length>0){           
            for(var i=0;i<accountData.length;i++){
               for(var j=0;j<ledgerData.length;j++){
               if(accountData[i].id == ledgerDatalessThan[j]._id.accountName){    
                   accountData[i].credit =ledgerDatalessThan[j].credit
                   accountData[i].debit = ledgerDatalessThan[j].debit 
                   //accountData[i].openingBalance = (ledgerDatalessThan[j].credit - ledgerDatalessThan[j].debit)                                         
                }   
              }
            } 
          }
          res.send(accountData);             
         });   
     });                            
  });   
});



router.get('/getOpeningBalnce/:accountName',function (req, res){
   var compCode = req.query.compCode  
   var fromDate  = new Date(req.query.date) 
   var toDate  = new Date(req.query.todate)
   var accountName = req.params.accountName
   console.log(accountName)
   var openingBalnce = function(db, callback) {
      var collection = db.collection('ledger');
      var cursor =   collection.aggregate([
                  { $match : {
                            date: { $lte: fromDate },                                        
                            accountName:accountName,
                            compCode:compCode         
                            }
                  }, 
                { $group:
                           {
                           _id: {accountName:"$accountName"},          
                            credit: { $sum: "$credit" },
                            debit: { $sum: "$debit" }
                          }
                }
]).toArray(function(err, result) {
                assert.equal(err, null);
                console.log(result);
                callback(result);
     });
}
      var getLedgerData = function(db, callback) {
         var ledger;
         var collection = db.collection('ledger');
             var cursor = collection.find({"accountName":accountName,compCode:compCode, date:{$gte:fromDate,$lt:toDate}}).toArray(function(err, result) {;
                assert.equal(err, null);
                console.log(result);
                callback(result);
        });                                        
     }
       Ledgers.getDataSource().connector.connect(function (err, db) {  
                var collection = db.collection('ledger');               
                openingBalnce(db, function(data) {
                  var ledgerOpeningBalnce = {};
                  if(data.length>0){
                    ledgerOpeningBalnce = {credit:data[0].credit,debit:data[0].debit}
                  }
                  else{
                    ledgerOpeningBalnce = '';
                  }
                  
                  console.log(ledgerOpeningBalnce)
                   getLedgerData(db, function(data) {
                     res.send({openingBalance:ledgerOpeningBalnce,ledgerData:data})               
                });                
              });
         });                                
    });   


 "create Expense and save Expense"
router.post('/saveExpensetest/:expenseId',function (req, res){
    var data = req.body;
    var expenseId = req.params.expenseId;
    var query;
   if(expenseId != 'null'){
        var query  = {_id:new mongodb.ObjectId(expenseId)}
       }
       else{
        query = {no:data.transactionData.no}
       }
 voucherTransaction.getDataSource().connector.connect(function (err, db) {  
                var collection = db.collection('voucherTransaction');               
                isExpenseExist(db, function(result) {
                  console.log(result)
                  console.log(query)
                  if(result>0){
                    updateExpence(db, data, function(result) {
                      if(result){
                         console.log("Expense Updated")
                         var ledger = createLedgerJson(data.transactionData,expenseId);
                         accountEntry(ledger,false,new mongodb.ObjectId(expenseId));
                         res.status(200).send(expenseId);                  
                      }
                    });
                  }
                  else{
                    createExpence(db, data, function(result) {
                      console.log(result.ops[0]._id);
                      if(result){
                         console.log("Expense Created")
                         var ledger = createLedgerJson(data.transactionData,result.ops[0]._id);
                         accountEntry(ledger,false,new mongodb.ObjectId(result.ops[0]._id));
                         res.status(200).send(result.ops[0]._id);
                     }
                });
             }                  
         });
     });      
     var isExpenseExist = function(db, callback) {
        var collection = db.collection('voucherTransaction');
        console.log("query in is ",query)
        var cursor = collection.count(query,function(err, result) {;
                  assert.equal(err, null);
                  console.log(result);
                  callback(result);
        });
    }
      var updateExpence = function(db, expenseData,callback) {
        var collection = db.collection('voucherTransaction');
              var cursor = collection.update(query,expenseData, function(err, result) {;
                  assert.equal(err, null);
                  callback(result);
        });                                        
     }
      var createExpence = function(db, expenseData,callback) {
        var collection = db.collection('voucherTransaction');
             var cursor = collection.insert(expenseData, function(err, result) {;
                 assert.equal(err, null);
                 callback(result);
        });                                        
      }
                                   
});   
     "createLedgerJson"
      function createLedgerJson(data,id)
       {    
           var accountTable = data.accountTable
           var itemTable = data.itemTable
           console.log()           
           var ledger  = [];
                if(data.role == 'O')
                {   if(data.itemTable != "[]"){
                    ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:id,isUo:false,visible:true,compCode:data.compCode})
                  }
                      if(data.tdsAccountId){
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:id,isUo:false,visible:true,compCode:data.compCode})
                          }
                      if(data.itemTable != []){
                        for(var i=0;i<itemTable.length;i++)
                        {        
                           ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:id,isUo:false,visible:true,compCode:data.compCode})
                        } 
                      }
                       if(data.accountTable != []){
                        for(var i=0;i<accountTable.length;i++)
                        {        
                           ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:id,isUo:false,visible:true,compCode:data.compCode})
                        }
                      } 
                  } 
                if(data.role == 'UO')
                {  if(data.itemTable != []){
                     ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:id,isUo:true,visible:true,compCode:data.compCode})
                   }
                      if(data.tdsAccountName)
                        {
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:id,isUo:true,visible:true,compCode:data.compCode})
                        }
                     if(data.itemTable != []){
                        for(var i=0;i<itemTable.length;i++)
                        {        
                           ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:id,isUo:true,visible:true,isUo:true,visible:true,compCode:data.compCode})
                        } 
                      }
                      if(data.accountTable != []){
                        for(var i=0;i<accountTable.length;i++)
                        {        
                           ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:id,isUo:true,visible:true,compCode:data.compCode})
                        } 
                      }

                }                                            
                       
                 return ledger; 
   }


  "save bill new"

  router.post('/saveBillTest/:billId',function (req, res){
   var data = req.body;
   var compCode = data.compCode
   var billId = req.params.billId;
   var query;
   if(billId != 'null')
   {
        var query  = {_id:new mongodb.ObjectId(billId)}
   }
   else
   {
        query = {no:data.no}
   }
 voucherTransaction.getDataSource().connector.connect(function (err, db) {  
                var collection = db.collection('voucherTransaction');               
                isBillExist(db, function(result) {
                  if(result>0){
                    updateBill(db, data, function(result) {
                      if(result){
                         console.log("Bill Updated",result)
                         var lineItem;
                         var visible;
                         if(data.role == 'O'){
                          lineItem = data.transactionData.manualLineItem
                          visible = true;

                         }
                          if(data.role == 'UO'){
                          lineItem = data.transactionData.itemDetail
                          visible = false;
                         }
                         var ledger = createLedgerJson(data.transactionData,billId);
                         accountEntry(ledger,false,new mongodb.ObjectId(billId));
                          updateInventory(db, visible, function(result) {          
                            if(result){
                              console.log("inventory removed")
                              isInventoryExist(db, function(result) { 
                                 console.log("checking inventory ...")         
                                 if(result>0){
                                  console.log("inventory Count",result);
                                  var inventoryData = createInventoryData(lineItem,visible,data.no,billId,result,compCode);
                                  console.log("inventory data",inventoryData)
                                }
                                else{
                                  var inventoryData = createInventoryData(lineItem,visible,data.no,billId,0,compCode);
                                }                        
                            createInventory(db, inventoryData, function(result) {          
                                 if(result){
                                 console.log("inventory created",result)
                                 res.status(200).send(billId);                                
                                  }
                        });
                     });             
                   }                 
               });
             }
          });
        }
                
                  else{
                    createBill(db, data, function(result) {   
                      if(result)
                      {
                         console.log("Bill Created",result)
                         var ledger = createLedgerJson(data.transactionData,result.ops[0]._id);
                         accountEntry(ledger,false,new mongodb.ObjectId(result.ops[0]._id));
                         var billId = result.ops[0]._id
                         var lineItem;
                         if(data.role == 'O'){
                          lineItem = data.transactionData.manualLineItem
                         }
                          if(data.role == 'UO'){
                          lineItem = data.transactionData.itemDetail
                         }

                         isInventoryExist(db, function(result) { 
                            console.log("checking inventory ...")         
                              if(result>0){
                                console.log(result);
                                 var inventoryData = createInventoryData(lineItem,true,data.no,billId,result,compCode);
                                 console.log("inventory data",inventoryData)
                              }
                              else{
                                  var inventoryData = createInventoryData(lineItem,true,data.no,billId,0,compCode);
                              }
                        
                         createInventory(db, inventoryData, function(result) {          
                              if(result){
                                console.log("inventory created",result)
                                res.status(200).send(billId);
                                 
                              }
                        });

                     });
                  }
                });
              }
                                
          });

    }); 

      "check if bill exist or not"    
     var isBillExist = function(db, callback) {
        var collection = db.collection('voucherTransaction');
        var cursor = collection.count(query,function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });
    }
    "get inventory count of visible item"
     var isInventoryExist = function(db, callback) {
        var collection = db.collection('inventory');
        var cursor = collection.count({visible:true,isActive:true},function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });
    }
    "update bill"
      var updateBill = function(db, billData,callback) {
        var collection = db.collection('voucherTransaction');
        var cursor = collection.findOne(query, function(err, instance) {
           assert.equal(err, null);
           if(instance){     
               var tdata = generateTransaction(billData,instance,billData.role)               
             }
               var cursor = collection.update(query,tdata, function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });  
      });                                       
     }
     "create bill"
      var createBill = function(db, billData,callback) {
        var collection = db.collection('voucherTransaction');
             var cursor = collection.insert(billData, function(err, result) {
                 assert.equal(err, null);
                 callback(result);
        });                                        
      }
      "create inventory"
      var createInventory = function(db, inventoryData,callback) {
        var collection = db.collection('inventory');
             var cursor = collection.insert(inventoryData, function(err, result) {
                 assert.equal(err, null);
                 callback(result);
        });                                        
      }
      "update inventory"
      var updateInventory = function(db, visible,callback) {
        var collection = db.collection('inventory');          
             var cursor = collection.remove({invId:billId,visible:visible,isActive:true}, function(err, result) {;
                 assert.equal(err, null);
                 callback(result);
        });                                        
      }
                                   
});
   " return Inventory data "
       function createInventoryData(data,visible,no,billId,count,compCode){
          for(var i=0;i<data.length;i++)
             {        
               data[i].isActive  = true;
               data[i].visible = visible;
               data[i].no = no;
               data[i].invId = billId;
               data[i].rgNo = count + i + 1;
               data[i].compCode = compCode;
            }  
            return data;
       }
       function generateTransaction(data ,data1,role){
            if(role == 'O'){
              data.transactionData.adminAmount = data1.transactionData.adminAmount
              data.transactionData.adminBalance = data1.transactionData.adminBalance
              data.transactionData.itemDetail = data1.transactionData.itemDetail
            }
            if(role == 'UO'){
              data.transactionData.amount = data.data1.amount
              data.transactionData.balance = data.data1.balance
               data.transactionData.balance2 = data.data1.balance
              data.transactionData.manualLineItem = data.data1.manualLineItem
            }
            
            return data;
       }
       "create ledger json"
       function createLedgerJson(data,id)
       {    
           console.log("ledger",data);                   
           var ledger  = [];
                if(data.role == 'O')
                 {
                   var accountData =  data.accountlineItem;                 
                        for(var i=0;i<accountData.length;i++)
                         {        
                            ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:id,isUo:false,compCode:data.compCode})
                         }  
                            ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.amount),voRefId:id,isUo:false,visible:false,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:id,isUo:false,visible:false,compCode:data.compCode})
                }
                if(data.role == 'UO')
                {     var accountData =  data.accountlineItem;
                       for(var i=0;i<accountData.length;i++)
                        {        
                           ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:id,isUo:false,visible:true,compCode:data.compCode})
                        }                                       
                           ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.adminAmount),voRefId:id,isUo:true,visible:true,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:id,isUo:true,visible:true,compCode:data.compCode})
                           
                       
                     
                }                                            
                       console.log(ledger)
                 return ledger; 
   }

 "get Sales invoice transaction data"

   router.get('/getInvoiceData/:compCode',function (req, res){
    var compCode = req.params.compCode;
    var role = req.query.role;
     voucherTransaction.getDataSource().connector.connect(function (err, db) {  
              getData(db, role,function(result) {          
                  if(result){
                     res.status(200).send(result);
                  }
              });
            });

    var getData = function(db, role,callback) {
        var collection = db.collection('voucherTransaction');  

        var cursor = collection.aggregate( 
                {$match:{compCode,compCode}},
                {$match:{$or:[{type:"General Invoice"},{type:"Sales Invoice"}]}},
                {$project : 
                { type : "$type",
                  invoiceNo:"$vochNo",
                  date:"$date",
                  duedate:"$duedate",
                  amount:"$amount",
                  balance:"$balance",
                  customer:"$customerId",
                  compCode:"$compCode",
                  id:"$_id"

                }} ,function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });
    }

   });

   

   "get transaction data"

   router.get('/getTransactionData/:compCode',function (req, res){
    var compCode = req.params.compCode;
    var role = req.query.role;
     voucherTransaction.getDataSource().connector.connect(function (err, db) {  
              getData(db, role,function(result) {          
                  if(result){
                     res.status(200).send(result);
                  }
              });
            });

    var getData = function(db, role,callback) {
        var collection = db.collection('voucherTransaction');
            if(role == 'O'){
              var amount = "$transactionData.amount"
              var balance = "$transactionData.balance"
            }
            if(role == 'UO'){
              var amount = "$transactionData.adminAmount"
              var balance = "$transactionData.adminBalance"
            }

        var cursor = collection.aggregate( 
                {$match:{compCode,compCode}},
                 {$match:{$or:[{type:"PURCHASE INVOICE"},{type:"EXPENSE"}]}},
                {$project : 
                { type : "$type",
                  invoiceNo:"$no",
                  date:"$date",
                  amount:amount,
                  balance:balance,
                  supplier:"$transactionData.supliersId",
                  compCode:"$compCode",
                  id:"$_id"

                }} ,function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });
    }

   });

   " get all transaction of a particular supplier"
    router.get('/getAllTransaction/:supliersId',function (req, res){
    var supliersId = req.params.supliersId;
     voucherTransaction.getDataSource().connector.connect(function (err, db) {  
              getData(db, function(result) {          
                  if(result){
                     res.status(200).send(result);
                  }
              });
            });

   var getData = function(db, callback) {
        var collection = db.collection('voucherTransaction');
        var cursor = collection.aggregate(
                   {$match :{'transactionData.supliersId':supliersId}},
                   {$match:{'transactionData.balance':{$gt:0}}},
                   {$project :{
                      date: "$date",
                      duedate: "$transactionData.billDueDate",
                      amount: "$amount",
                      vochNo: "$vochNo",
                      type: "$type",
                      balance:"$transactionData.balance",
                      invoiceType:"$transactionData.invoiceType",
                      id:"$_id"                   
                   }
                 }
              ,function(err, result) {
                  assert.equal(err, null);
                  callback(result);
        });
    }

   });

   "get all open bill of a particular supplier"

 router.get('/openingBalanceLedgerEntrynew/:compCode',function (req, res){
  var compCode = req.params.compCode;
 voucherTransaction.getDataSource().connector.connect(function (err, db) {  
              getAccount(db, function(result) {          
                  if(result.length>0){
                    console.log('total ',result.length,'account found'.red);
                    var accountData = result
                     console.log('creating ledger json'.white);
                      var data = createJsonData(accountData,compCode)
                      console.log('ledger json '.green,data);
                      ledgerEntry(db,data, function(result) { 
                        if(result){
                           console.log('ledger entry done sucessfully'.green);
                           res.status(200).send(result);
                        }

                      })
                  }
              });
          });

      var getAccount = function(db,callback){
         var collection = db.collection('account');
         console.log('geting account data...'.green);
         var cursor = collection.find({}).toArray(function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
      function createJsonData(data,compCode){
          var ledger = [];
          var currentDate = new Date("02/02/2017")
           for(var i=0;i<data.length;i++)
               {  
                if(data[i].balanceType == 'credit' && data[i].openingBalance){    
                  ledger.push({accountName:data[i]._id.toHexString(),date:currentDate,particular:data[i]._id.toHexString(),refNo:'',voType:"Balance",credit:Number(data[i].openingBalance),voRefId:'',isUo:false,visible:true,compCode:compCode})
                }
                if(data[i].balanceType == 'debit' && data[i].openingBalance){    
                  ledger.push({accountName:data[i]._id.toHexString(),date:currentDate,particular:data[i]._id.toHexString(),refNo:'',voType:"Balance",debit:Number(data[i].openingBalance),voRefId:'',isUo:false,visible:true,compCode:compCode})
               }
            }
            return ledger;
         }
   });

      var ledgerEntry = function(db,data ,callback){
         var collection = db.collection('ledger');
         var cursor = collection.insertMany(data,function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
      var updateledgerEntry = function(db,data ,callback){
         var collection = db.collection('ledger');

         var credit;
         var query;
         if(data[0].credit){
            credit = data[0].credit
            console.log("new balance is".yellow,credit)
           var cursor = collection.update({accountName:data[0].accountName,compCode:data[0].compCode,voType:"Balance"},{$set:{credit:credit}},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
          }
          else{
             debit = data[0].debit
             console.log("new balance is".yellow,debit)
             var cursor = collection.update({accountName:data[0].accountName,compCode:data[0].compCode,voType:"Balance"},{$set:{debit:debit}},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
          }
         
      }

      var checkOpeningLedger = function(db,accountId ,compCode,callback){
         var collection = db.collection('ledger');
         console.log('checking data with query'.red,accountId,compCode)
         var cursor = collection.count({accountName:accountId,compCode:compCode,voType:"Balance"},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
      function createJson(data,compCode,accountId,role){
        console.log("Role is".green,role)
          var ledger = [];
          var isUo;
          var visible;
          if(role == 'UO'){
            isUo = false
            visible = true
          }
          if(role == 'O'){
            isUo = true
            visible = false
          }
          var currentDate = new Date("02/02/2017")
           for(var i=0;i<data.length;i++)
               {  
                if(data[i].balanceType == 'credit' && data[i].openingBalance){    
                  ledger.push({accountName:accountId,date:currentDate,particular:accountId,refNo:'',voType:"Balance",credit:Number(data[i].openingBalance),voRefId:'',isUo:isUo,visible:visible,compCode:compCode})
                }
                if(data[i].balanceType == 'debit' && data[i].openingBalance){    
                  ledger.push({accountName:accountId,date:currentDate,particular:accountId,refNo:'',voType:"Balance",debit:Number(data[i].openingBalance),voRefId:'',isUo:isUo,visible:visible,compCode:compCode})
               }
            }
            return ledger;
         }
var getAccount = function(db,accountId,callback){
         var collection = db.collection('account');
         var cursor = collection.find({_id:new mongodb.ObjectId(accountId)}).toArray(function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }

 router.post('/openingBalanceLedgerEntry/:compCode',function (req, res){
  var accountData = req.body;
  var compCode = req.params.compCode;
  var accountId = req.query.accountId;
  var role = req.query.role;
  console.log('>request processing...'.yellow)
  console.log("Role is",req.query)
  voucherTransaction.getDataSource().connector.connect(function (err, db) { 
               getAccount(db, accountId,function(result) {
               var openingLedger = result; 
               console.log('Account Info '.green,result);
               checkOpeningLedger(db,accountId,compCode, function(result) {  
               console.log("is exist".green,result)   
               var data = createJson(openingLedger,compCode,accountId,role)
               console.log("data for ledgerEntry".red,data)   
                  if(result>0){ 
                     console.log('opening Balance ledger exist'.green);
                     console.log('updating existing ledger...'.yellow);
                    updateledgerEntry(db,data, function(result) { 
                    if(result){
                         console.log('ledger entry done sucessfully'.green,result.result);
                         res.status(200).send(result);
                      }
                    })
                  }
                  if(result == 0){
                    console.log('opening Balance ledger does not exist'.red);
                    console.log('creating opening balance ledger...'.green);
                    ledgerEntry(db,data, function(result) { 
                    if(result){
                         console.log('ledger entry done sucessfully'.green);
                         res.status(200).send(result);
                      }
                    })

                  }
                });

                })
             });


 }) 

   " rosemate"

   router.post('/saveRosemate',function (req, res){  
        var id = req.query.id
        var data = req.body;
        //console.log(req.body);
        if (id != 'null' ) {
           var query = { id: id }
           updateRosemate(req.body,id,function(){
        res.send({status:'200'});
       });
           
        }
        else {
           createRosemate(data,function(){
        res.send({status:'200'});
       });
           
        }
   });
   function createRosemate(data,callback){
     function createReceiptEntries(callback1){ voucherTransaction.count({type:'Receive Payment'},function (err, instance) { 
          if(instance){
        console.log(instance);
        var cVouchNo=instance;
        var receipts=data.vo_rosemate.receipts;
        for(var i=0;i<receipts.length;i++)
      {  
              cVouchNo++;
              receipts[i].vochNo=cVouchNo;
        receipts[i].id = mmongoose.Types.ObjectId();
        console.log(receipts[i]);
              createReceipt(receipts[i]);
             } 
            console.log("Calling Callback1");
           if(callback1) callback1();  
           }
       
     });
     }
     function createPaymentEntries(callback2){ voucherTransaction.count({type:'Payment'},function (err, instance) { 
          if(instance){
            console.log("Insisde create payment");
        console.log(instance);
        var cVouchNo=instance;
    var payments=data.vo_rosemate.payments;
        for(var i=0;i<payments.length;i++)
                         {  
              cVouchNo++;
              payments[i].vochNo=cVouchNo;
        payments[i].id = mmongoose.Types.ObjectId();
        console.log(payments[i]);
              createPayment(payments[i]);
                         }
            console.log("Calling Callback2");
             if(callback2) callback2(); 
      }
     });
     
     }
     
     createReceiptEntries(createPaymentEntries(function(){
       voucherTransaction.count({type:'Rosemate'},function (err, instance) { 
       console.log(data);
       data.vochNo=instance;
     voucherTransaction.create(data, function (err, instance) { 
               if(err){
                console.log(err);
               }
    else{
      if(callback) callback();
     }
     });
       });
     }));
      //functionCreateRosemateEntry(){
    
     //}
   }
   function updateRosemate(data,id,callback){
     //get all receipts and check if has id
     //then update receipts and update related ledger and logs
     //if not then create new receipts and create ledger entries.
     //
     //function createReceiptEntries(callback1){
      var receipts=data.vo_rosemate.receipts;
    var payments=data.vo_rosemate.payments;
    //var newReceipts=
    
    function processReceipts(i){
      if(i<receipts.length){
        var id=receipts[i].id;
      if(id){
        //console.log(receipts[i]+"updating");
        updateReceipt(receipts[i],receipts[i].id);
        receipts[i].id=mmongoose.Types.ObjectId(id);
        processReceipts(i+1);
      }
      else{
        voucherTransaction.count({type:'Receive Payment'},function (err, instance) { 
          if(instance){
            //console.log(instance);
            var cVouchNo=instance+1;
                    receipts[i].vochNo=cVouchNo;
            receipts[i].id = mmongoose.Types.ObjectId();
            console.log(receipts[i]+" creating");
            createReceipt(receipts[i]);
            processReceipts(i+1);
          }
        });
      }
      }else{//if(callback1) 
      processPayments(0);}
    
    }
        processReceipts(0);
    
    
    function processPayments(i){
      if(i<payments.length){
      if(payments[i].id){
        updatePayment(payments[i],payments[i].id);// uncomment later
        payments[i].id=mmongoose.Types.ObjectId(id);
        processReceipts(i+1);
      }
      else{
        voucherTransaction.count({type:'Receive Payment'},function (err, instance) { 
        if(instance){
          //console.log(instance);
          var cVouchNo=instance+1;
                        payments[i].vochNo=cVouchNo;
        payments[i].id = mmongoose.Types.ObjectId();
        //console.log(payments[i]);
              createPayment(payments[i]);
        
          
        }});
      }
      }else{  
      createRosemateEntry();
      }
    }
    //}
    //var newReceipts=
          
        
    
function createRosemateEntry(){
  console.log("Insisde create rosemate");
     voucherTransaction.update({_id:new mongodb.ObjectId(id)}, data, function (err, instance) { 
               if(err){
                console.log(err);
               }
    else{
      
       
    if(callback) callback();  
      }
     });
}

   }

  "getAccountOpeningBalnce"
   router.get('/getAccountOpeningBalnce/:compCode',function (req, res){
      var compCode = req.params.compCode
      var accountId = req.query.accountId
      var role = req.query.role
      voucherTransaction.getDataSource().connector.connect(function (err, db) { 
         getBalance(db, compCode,role,accountId,function(result) {
          if(result.length>0){
            var balance
            if(result[0].credit){
              balance = result[0].credit
            }
            else{
              balance = result[0].debit
            }
              console.log('balance is'.green,balance);
                   res.status(200).send({'balance':balance});
              }
              else{
                res.status(200).send({'balance':0});
              }
              
         })
   })
    var getBalance = function(db,compCode,role,accountId,callback){
         var collection = db.collection('ledger');
         var isUo
         if(role == 'UO'){
          isUo = true
         }
         if(role == 'O'){
          isUo = false
         }
         var cursor = collection.find({accountName:accountId,compCode:compCode,isUo:isUo,voType:"Balance"}).toArray(function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
   });


    
     "account delete"
     router.post('/deleteAccount/:accountId',function (req, res){
      var accountId = req.params.accountId
       voucherTransaction.getDataSource().connector.connect(function (err, db) { 
               deleteAccount(db, accountId,function(result){
                if(result){
                  console.log("account is deleted Id".red,  accountId)
                      res.status(200).send({'status':"success"});
                }

              });
            });

         var deleteAccount = function(db,accountId,callback){
         var collection = db.collection('account');
         var cursor = collection.update({_id:new mongodb.ObjectId(accountId)},{$set:{isActive:false}},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }

     });

     "purchase voucher delete"
      router.post('/deleteVoucher/:voucherId',function (req, res){
      var accountId = req.params.accountId
       voucherTransaction.getDataSource().connector.connect(function (err, db) { 
               deleteVoucher(db, voucherId,function(result){
                if(result){
                  console.log("voucher is deleted Id".red,  voucherId)
                  deleteLedger(db, accountId,function(result){
                    if(result)
                      console.log("All ledger of accountId".yellow,voucherId , "is deleted sucessfully" )
                      res.status(200).send({'status':"success"});
                  });
                }

              });
            });
         var deleteVoucher = function(db,accountId,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.remove({_id:new mongodb.ObjectId(accountId)},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
      var deleteLedger = function(db,accountId,callback){
         var collection = db.collection('ledger');
         var cursor = collection.remove({accountName:accountId},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
      var deleteInventory = function(db,accountId,callback){
         var collection = db.collection('Inventory');
         var cursor = collection.remove({accountName:accountId},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }

     });
     router.get('/getInvoiceSett/:invoiceNo',function (req, res){
       var invoiceNo = req.params.invoiceNo;
       voucherTransaction.getDataSource().connector.connect(function (err, db) { 
               getInvoice(db, invoiceNo,function(result){
                 if(result.length>0){
                    res.status(200).send(result);
                 }
                 else{
                   res.status(200).send({'status':"Not Found"});
                 }
             });
       });
       var getInvoice = function(db,invoiceNo,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.aggregate(
           {$match:{vochNo:invoiceNo}},
           {$project:{
              supplier:"$transactionData.supliersId",
              date:"$date",
              totalLineItemData:"$transactionData.manualLineItem",
              totalAmount:"$amount",
              accountData:"$transactionData.accountlineItem"
           }}

         ,function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
  });
// purchaseSettelment count
   router.post('/voucherTransactionsExist/:refNo',function (req, res){
     var refNo = req.params.refNo
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        isExist(db, refNo,function(result){
          if(result>0){
            var count = result 
            getId(db, refNo,function(result){
              if(result){
                res.status(200).send({count:count,id:result[0]._id});
              }
            });
          }
          else{
             res.status(200).send({count:0});
          }
        })
     })
     var getId = function(db,refNo,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.find({invoiceNo:refNo}).toArray(function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
     var isExist = function(db,refNo,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.count({invoiceNo:refNo},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
  });
  router.get('/getVoucherTransactionCount/:type',function (req, res){
    var type = req.params.type
      voucherTransaction.getDataSource().connector.connect(function (err, db) { 
        getCount(db, type,function(result){
          if(result){
             res.status(200).send({count:result});
          }
          else{
             res.status(200).send();
          }
        });
      });
       var getCount = function(db,type,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.count({type:type},function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
  });
// purchaseSettelment api
   router.post('/purchaseSettelment/:id',function (req, res){
     var id = req.params.id
     var settelmentData =req.body
     voucherTransaction.getDataSource().connector.connect(function (err, db) { 
             if(id!="null"){
               updatePurchaseSettelment(db, settelmentData,new mongodb.ObjectId(id),function(result){
                 if(result){
                   ledger = ledgerCreation(settelmentData,id);
                   accountEntry(ledger,true,id);
                    res.status(200).send({id:id});
                 }
               });
             }
             else{
               savePurchaseSettelment(db, settelmentData,id,function(result){
                 var ledger;
                 if(result){
                   console.log(result.ops[0]._id)
                   ledger = ledgerCreation(settelmentData,result.ops[0]._id);
                   accountEntry(ledger,false,result.ops[0]._id);
                   res.status(200).send({id:result.ops[0]._id});
                 }
               });
             }
     });
    function ledgerCreation(data,id){
        var  firstLedger = data.ledgerDataFirst
        var  secondLedger = data.ledgerDataSecond
        var  thirdLedger = data.ledgerDataThird
        var ledger = [];
        var paritcular = "Purchase Settelment"  + data.invoiceNo
        ledger.push({accountName:firstLedger.accountId,date:data.date,particular:paritcular,refNo:data.voRefNo,voType:"Purchase Settelment",credit:Number(firstLedger.amount),voRefId:id,isUo:true,visible:true,compCode:data.compCode})
        ledger.push({accountName:secondLedger.accountId,date:data.date,particular:firstLedger.accountId,refNo:data.voRefNo,voType:"Purchase Settelment",debit:Number(secondLedger.amount),voRefId:id,isUo:true,visible:true,compCode:data.compCode})
        ledger.push({accountName:thirdLedger.accountId,date:data.date,particular:firstLedger.accountId,refNo:data.voRefNo,voType:"Purchase Settelment",debit:Number(thirdLedger.amount),voRefId:id,isUo:true,visible:true,compCode:data.compCode})
       return ledger;
    }
    var savePurchaseSettelment = function(db,settelmentData,id,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.insert(settelmentData,function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
    var updatePurchaseSettelment = function(db,settelmentData,id,callback){
         var collection = db.collection('voucherTransaction');
         var cursor = collection.update({_id:id},settelmentData,function(err, result){
                assert.equal(err, null);
                callback(result);
         });
      }
   });
  server.use(router);
};
