module.exports = function(server) {
 // Install a `/` route that returns server status
    
    var mongodb = require('mongodb');
    var router = server.loopback.Router();
    var Transaction = server.models.transaction;
     var inventoryStock = server.models.inventoryStock;  
     var master = server.models.master;  
     var Inventory = server.models.Inventory;  
     var BankTransaction = server.models.BankTransaction;  
    var Accounts = server.models.account;  
     var Ledgers = server.models.ledger;  
    var supplier = server.models.suppliers;
    var customer = server.models.customer;

    var cron = require('node-cron');
    
  router.post('/transaction',function (req, res){
      
      
        var Tdata = req.body;
        console.log(Tdata);
        Ledgers.getDataSource().connector.connect(function (err, db) {   
        var Ledger = db.collection('ledger');
        Ledgers.create(req.body,function (err, instance) { 
            
        if(instance){  
             Ledgers.create(req.body.Inventory,function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log(instance)
                 }
             });
            
            Accounts.getDataSource().connector.connect(function (err, db) {
                var Account = db.collection('account');
                Account.update(
                  {accountName:Tdata.accountName},{ $inc: { debit: Number(Tdata.value)} },
                  function (err, instance) { 
                    if(instance){                     
                    Account.update(
                      {accountName:Tdata.particular},{ $inc: { credit: Number(Tdata.value) } },
                      function (err, instance) { 
                        if(instance){                           
                           console.log("done");
                         }                    
                        if (err) {    
                           console.log(err)
                         }     
                    });                     
             }           
            
             if (err) {    
                console.log(err)
             }               
            
        })
            });
        }
              if (err) {    
                  console.log(err)
              }     
  });
      });
       res.send({"status":"200"});
  });
    
    
    // admin bill update route

      router.post('/admintTransactionEdit',function (req, res){
      
      
        var Tdata = req.body;
        var no = req.body.no;
        var ledgerdata =  {
                        compCode: req.body.compCode,
                        supCode: req.body.supCode,
                        supliersName: req.body.supliersName,
                        accountName: req.body.accountName,
                        email: req.body.email,
                        date: req.body.date,
                        particular: req.body.particular,
                        no: req.body.no,
                        debit: req.body.debit,
                        credit: req.body.credit,
                        creditMsc: req.body.creditMsc,
                        debitMsc: req.body.debitMsc,
                        value: req.body.value,
                        type: req.body.type,
                        lastModified: req.body.lastModified



        }

        var invLedger =  {
                        compCode: req.body.Inventory.compCode,
                        supCode: req.body.Inventory.supCode,
                        supliersName: req.body.Inventory.supliersName,
                        accountName: req.body.Inventory.accountName,
                        email: req.body.Inventory.email,
                        date: req.body.Inventory.date,
                        particular: req.body.Inventory.particular,
                        no: req.body.Inventory.no,
                        debit: req.body.Inventory.debit,
                        credit: req.body.Inventory.credit,
                        creditMsc: req.body.Inventory.creditMsc,
                        debitMsc: req.body.Inventory.debitMsc,
                        value: req.body.Inventory.value,
                        type: req.body.Inventory.type,
                        lastModified: req.body.Inventory.lastModified



        }
        console.log(Tdata);
         console.log(ledgerdata);
        Ledgers.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('ledger');
        collection.update({no:no,type:'BILL'},{'$set':ledgerdata},function (err, instance) { 
            
        if(instance){  
             collection.update({no:no,type:'Inventory'},{'$set':invLedger},function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log("Inventory ledger created")
                 }
             });
            
            Accounts.getDataSource().connector.connect(function (err, db) {
                var Account = db.collection('account');
                Account.update(
                  {accountName:Tdata.accountName},{ $inc: { debitMsc: Number(Tdata.value)} },
                  function (err, instance) { 
                    if(instance){                     
                    Account.update(
                      {accountName:Tdata.particular},{ $inc: { creditMsc: Number(Tdata.value) } },
                      function (err, instance) { 
                        if(instance){                           
                           console.log("done");
                         }                    
                        if (err) {    
                           console.log(err)
                         }     
                    });                     
             }           
            
             if (err) {    
                console.log(err)
             }               
            
        })
            });
        }
              if (err) {    
                  console.log(err)
              }     
  });
      });
       res.send({"status":"200"});
  });
    
    
        
  router.post('/createSupplier',function (req, res){    
        var sup = req.body;
        console.log(sup);
        supplier.getDataSource().connector.connect(function (err, db) {   
      
        supplier.create(req.body,function (err, instance) { 
            console.log(instance);
            
            if(instance){  
              Accounts.create(req.body.account,function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log("account created ")
                 }
             });
             supplier.update({email:instance.email},{supCode:instance.id},function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log("id Created")
                 }
             });
            
            }
        res.send({"status":instance});
      });
       
  });
    
    
  });
    
    // create customer
    
    
    
     router.post('/createCustomer',function (req, res){    
        var sup = req.body;
        console.log(sup);
        supplier.getDataSource().connector.connect(function (err, db) {   
      
        customer.create(req.body,function (err, instance) { 
            console.log(instance);
            
            if(instance){  
              Accounts.create(req.body.account,function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log("account created ")
                 }
             });
             customer.update({email:instance.email},{cusCode:instance.id},function (err, instance) { 
                if (err) {    
                       console.log(err)
                        } 
                 else{
                     console.log("id Created")
                 }
             });
            
            }
        res.send({"status":instance});
      });
       
  });
    
    
  });
    
    //create inventory
    
     router.post('/createInventory',function (req, res){      
        var data = req.body   
        
        Inventory.create(req.body,function (err, instance) {       
         if (err)
           {    
              console.log(err)
            } 
             else
              {
               
               console.log("Inventory created ")
              }
      });
         
         

    res.send({status:"200"});
  });


    // update inventory


    
     //get inventory ledger

      
    
   //bank transaction 
    
    
     router.post('/postBanktransaction',function (req, res){ 
        
        var data = req.body 
        
          console.log(data[3])
       
        BankTransaction.getDataSource().connector.connect(function (err, db) {   
      
        BankTransaction.create(req.body,function (err, instance) { 
          
        if (err) {    
                console.log(err)
        } 
        else{  
                console.log(instance)
         }
           
        res.send({"status":instance});
      });
       
  });
    
    
  });
   
    
    //get supplier
    
    router.get('/getSupplier',function (req, res){    
        var sup = req.query.supCode;
        console.log(sup);
        supplier.getDataSource().connector.connect(function (err, db) {   
       
        supplier.find({where:{supCode:new mongodb.ObjectId(sup)}},function (err, instance) { 
            console.log(instance);
            res.send(instance);
           
        
      });
       
  });
    
    
  });
    
    
    router.get('/gettransactions',function (req, res){    
        var sup = req.query.supCode;
        console.log(sup);
        Transaction.getDataSource().connector.connect(function (err, db) {   
       
        Transaction.find({where:{supCode:sup}},function (err, instance) { 
            console.log(instance);
            res.send(instance);          
        
      });
       
  });
      
  });


router.get('/getBillData',function (req, res){    
        var billNo = req.query.billNo;
        
        Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('Inventory');
        collection.aggregate({

       $match : {NO: billNo}}, 
       {$group:
         {
           _id: {DESCRIPTION:"$DESCRIPTION" ,FOBUNITPRICEUSD:"$FOBUNITPRICEUSD",CIFUNITPRICE:"$CIFUNITPRICE",SUBCATEGORY:"$SUBCATEGORY",GRADE:"$GRADE",FINISH:"$FINISH"},          
           NETWEIGHT: { $sum: "$NETWEIGHT" },

           FOBTALAMOUNT:{$sum: { $multiply: [ "$FOBUNITPRICEUSD", "$NETWEIGHT" ] }},
           CIFTOTALAMOUNT:{$sum: { $multiply: [ "$CIFUNITPRICE", "$NETWEIGHT" ] }},  
           assesableValue:{ $sum: "$NETWEIGHT2" },
           exciseDuty:{ $sum: "$NETWEIGHT2" },
           dutyAmount:{ $sum: "$NETWEIGHT2" },
           SAD:{ $sum: "$NETWEIGHT2" },
           totalDutyAmt:{ $sum: "$NETWEIGHT2" },
           totalDutyAmt:{ $sum: "$NETWEIGHT2" },
           customData:{ $sum: "$NETWEIGHT2" },



            count:{$sum:1}
           
         }
     }
    

     , function (err, instance) { 

      res.send(instance);
     });
       
  });
      
  });
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

// save bill with custom duty 


router.post('/saveCustom',function (req, res){    
        var billNo = req.body.billNo;
        var manualLineItem  = req.body.manualLineItem;
        
Transaction.getDataSource().connector.connect(function (err, db) {   
       
        Transaction.update({ no:billNo },
      {
        manualLineItem:manualLineItem

      },

    function(err,instance){

      Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');
       // Inventory.update({no:data.no,visible:visible,isActive:true},{isActive:false},function(err, instance){
         for(var i=0;i<req.body.manualLineItem.length;i++)
             {        
             req.body.manualLineItem[i].isActive  = true;
             req.body.manualLineItem[i].visible = true;
             req.body.manualLineItem[i].no = billNo;
            }   
           Inventory.update({no:billNo,visible:true,isActive:true},req.body.manualLineItem,function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                     console.log("inventory updated")

                 
                  }         
      });
     });
     
       res.send({status:"200"});
    })
  });
      
  });

 //get expense data 



router.post('/getExpense',function (req, res){    
        var refNo = req.query.refNo;
       
        
        Transaction.getDataSource().connector.connect(function (err, db) {   
         var collection = db.collection('transaction');
        Transaction.find({where:{ordertype:"EXPENSE",refNo:refNo }},function (err, instance) { 
          res.send(instance);
        
      });
       
       
  });
      
  });

 
//cron.schedule('* * * * *', function(){
  //console.log('running a task every minute');
//});

// Save Expense
  router.post('/saveExpense',function (req, res){    
         var ExpenseData = req.body;
         var transactionData = req.body.transactionData;
         var expenseAccount = req.body.expenseAccount;
         var expenseLedger = req.body.expenseLedger;
         var tdsAccountData = req.body.tdsAccountData;
         var tdsLedger = req.body.tdsLedger;
         var count;
          console.log(ExpenseData);
     
      Transaction.count({expenseId:transactionData.expenseId}, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            }   
            else{
           count = instance;
           console.log(count)
           if(count== 0){            
            saveExpenseData();
            console.log("Expense Save");
            res.send({status:"200"});
           }
           else{
             console.log("Expense exist");
             res.send({status:"500"});
           }


         }                           
        });


    function saveExpenseData() {
      // body...

      Transaction.create(transactionData, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            }   
            else{
            console.log("Transaction Data Saved",transactionData);
         }                           
        });
  
      
    if(tdsLedger.credit != null||tdsLedger!=undefined){
     Ledgers.create(tdsLedger, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            } 
            else{
            console.log("TdsLedger Ledger Data Saved",tdsLedger);
         }  

        });

       Accounts.getDataSource().connector.connect(function (err, db) {
           var tdsAccountCredit = tdsAccountData.credit;
           var tdsAccountDebit = tdsAccountData.debit;      
           var tdsAccountName = tdsAccountData.accountName;                
           var collection = db.collection('account');
        if(tdsAccountCredit!=''){
       collection.update({accountName:tdsAccountName},{ $inc: { credit: Number(tdsAccountCredit)} },
           function (err, instance) { 
            if (err) {    
            console.log(err);
         }  
         else{
            console.log("Tds Acoount Data Saved:",tdsAccountCredit);
         }  
         
         });
          }
         if(tdsAccountDebit!=''){
      collection.update({accountName:tdsAccountName},{ $inc: { debit: Number(tdsAccountDebit) } },
           function (err, instance) {        
             if (err) {    
            console.log(err);
         }  else{
            console.log("Tds Acoount Data Saved:",tdsAccountDebit);
         }             
         });
       }                   
    })  
    }  
      
        Ledgers.create(expenseLedger, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            } 
            else{
            console.log("Expense Ledger Data Saved",expenseLedger);
         }                            
        });
     Accounts.getDataSource().connector.connect(function (err, db) {
           var expenseCredit = expenseAccount.credit;
           var expenseDebit = expenseAccount.debit;      
           var expenseAccountName = expenseAccount.accountName;              
           var collection = db.collection('account');
        if(expenseCredit!=''){
       collection.update({accountName:expenseAccountName},{ $inc: { credit: Number(expenseCredit)} },
           function (err, instance) { 
            if (err) {    
            console.log(err);
         } 
         else{
            console.log("Expense Acoount Data Saved:",expenseCredit);
         }               
         });
          }
         if(expenseDebit!=''){
      collection.update({accountName:expenseAccountName},{ $inc: { debit: Number(expenseDebit) } },
           function (err, instance) {        
             if (err) {    
            console.log(err);
         }   
         else{
            console.log("Expense Acoount Data Saved:",expenseDebit);
         }            
         });
       }                   
    }) 
   }
     
     
     
   });    
 //end save Expense  

 //inventory item



router.post('/saveItem',function (req, res){    
        var GODOWN = req.body.GODOWN;
         var DESCRIPTION = req.body.DESCRIPTION;
          var RRMARKS = req.body.RRMARKS;

       
        
       
        master.create({GODOWN},function (err, instance) { 
          if (err) {    
             console.log(err)
            } 
            else{
            console.log("item Data Saved");
         }         
          
      });

        master.create(DESCRIPTION,function (err, instance) { 
         
      });

        master.create(RRMARKS,function (err, instance) { 
        
      });
       
       res.send({"status":"200"});
       
  });

//

router.post('/liveSearch',function (req, res){    

   var text = req.query.text;
       
        master.getDataSource().connector.connect(function (err, db) {   
         var collection = db.collection('master');
        
        collection.find({ $text: { $search: text }}, function(err, instance){
         res.send(instance);
            
      });
       
      }); 
  });


// Save Bill route

router.post('/saveBill',function (req, res){ 
       var data = req.body;
       console.log(data)
       Transaction.count({no:data.no}, function (err, instance) {                                    
                 if (err) {    
                     console.log(err)
                 }   
                  else 
               {
                   count = instance;
                   console.log(count)
                if(count== 0)
                {            
                   createBill(data);
                   console.log(foo);                 
                   createInventory(data);
                   console.log("Bill Created");
                   res.send("foo");
                   
                   
               }
                else   
                {
                  var foo =  updateBill(data);
                  updateInventory(data);                  
                   console.log("bill updated");
                  res.send(foo);
                }
         }                           
        });   
       
       // Bill create Function

       function createBill(data){
        Transaction.create(data, function(err, instance){

              if (err) {    
                     console.log(err)
                 }   
                  else  {
                      console.log("bill created")
                      console.log(instance)
                      if(data.role == 2){
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];
                      
                     

                      
                    for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(accountData[i].amount),voRefId:instance.id,isUo:false})
                        }  
                        ledger.push({accountName:data.supliersName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(data.amount),voRefId:instance.id,isUo:false},
                                    {accountName:'Inventory',date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.amount),credit:0,voRefId:instance.id,isUo:false}    

                           )
                       accountEntry(ledger,false,instance.id);
                     }
                  }         
      });
       }
    
    // create Inventory
       function createInventory(data){         
         if(data.role == 3){     
         var inventoryData  = data.itemDetail;      
           for(var i=0;i<inventoryData.length;i++)
             {        
             inventoryData[i].isActive  = true;
             inventoryData[i].visible = false;
            }                
         }         
          if(data.role == 2){
           var inventoryData  = data.manualLineItem;                 
             for(var i=0;i<inventoryData.length;i++)
             {        
               inventoryData[i].isActive  = true;
               inventoryData[i].visible = true;
               inventoryData[i].no = data.no;
            } 
         }                      
        Inventory.create(inventoryData, function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                     console.log("inventory created")
                     return instance;
                  }         
      });
    }
       // update Inventory

       function updateInventory(data){
         if(data.role == 3){
            var visible = false;
         }
          if(data.role == 2){
            var visible = true;
         }

       Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');
       // Inventory.update({no:data.no,visible:visible,isActive:true},{isActive:false},function(err, instance){
           Inventory.remove({no:data.no,visible:visible,isActive:true},function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                     console.log("inventory updated")
                     createInventory(data);
                  }         
      });
     });
       }  

                          
          



       
  

      // Bill update Function
       function updateBill(data){

          if(data.role == 3){

         delete data.manualLineItem;
         delete data.totalWeight;
          delete data.amount;
         delete data.balance;
         console.log(data);
        }
         if(data.role == 2){

         delete data.itemDetail;
         delete data.adminAmount;
         delete data.adminBalance;
         console.log(data);
        }
        Transaction.update({no:data.no},data, function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                   console.log(instance);
                     if(data.role == 2){
                     console.log(data.billId);
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];
                    for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(accountData[i].amount),voRefId:new mongodb.ObjectId(data.billId),isUo:false})
                        }  
                        ledger.push({accountName:data.supliersName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(data.amount),voRefId:new mongodb.ObjectId(data.billId),isUo:false},
                                    {accountName:'Inventory',date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.amount),credit:0,voRefId:new mongodb.ObjectId(data.billId),isUo:false}    

                           )
                        console.log(ledger);

                       accountEntry(ledger,false,new mongodb.ObjectId(data.billId));
                   
                       
                     }

                  }         
      });
       }    
  });

// Account Entry function

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

                    Ledgers.remove({voRefId:voRefId,isUo:false}, function (err, instance) {
                               console.log("ledger removed")       
                           })        
                   Ledgers.find({voRefId:voRefId,isUo:isUo}, function (err, instance) { 
                      if (err) {    
                     console.log(err)
                       } 
                         else {
                           console.log(instance)
                           console.log("instance")
                          for(var i=0;i<instance.length;i++){ 
                           if(instance[i].credit){
                              console.log(instance[i].accountName)
                              var accountName = instance[i].accountName
                              var credit =  Number(instance[i].credit);
                              Accounts.getDataSource().connector.connect(function (err, db) {  
                                 var collection = db.collection('account');   
                              collection.update({accountName:accountName},{ $inc: { credit: - Number(credit)} }, function (err, instance) { 
                                 console.log("ledger removed")                               
                              });
                           });
                           }                
                           if(instance[i].debit){
                               console.log(instance[i].accountName)
                               var accountName = instance[i].accountName
                                var debit =  Number(instance[i].debit);
                               Accounts.getDataSource().connector.connect(function (err, db) {  
                                 var collection = db.collection('account');   
                              collection.update({accountName:accountName},{ $inc: { debit: - Number(debit)} }, function (err, instance) {                                 
                              });
                           });
                           }
                          }
                           
                         }
                   });   


                     }
           
                                           
                  Ledgers.create(data, function(err, instance){
                            if (err) {    
                              console.log(err)
                             } else{      
                        Ledgers.getDataSource().connector.connect(function (err, db) {  
                           var collection = db.collection('ledger');    
                        for(var i=0;i<data.length;i++){ 
                           if(data[i].credit != 0){
                               var accountName = data[i].accountName
                              var credit =  Number(data[i].credit);
                              Accounts.update({accountName:accountName},{ $inc: { credit: Number(credit)} }, function (err, instance) {  
                                  console.log("account Updated")
                               console.log(instance)                                  
                                    });
                                 }                        
                           if(data[i].debit!= 0){
                               var accountName = data[i].accountName
                                var debit =  Number(data[i].debit);
                              Accounts.update({accountName:accountName},{ $inc: { debit: Number(debit)} }, function (err, instance) {
                                 console.log("account Updated")
                                  console.log(instance) 
                                                                 
                              });
                           }

                          }

                            });
                             
                            }  
                                   
                       });
           
                      
            
                     
               }
});

 }

router.get('/chartOfAccount',function (req, res){ 

Ledgers.getDataSource().connector.connect(function (err, db) {  
   var collection = db.collection('ledger'); 
   collection.aggregate({
      $group:
         {
           _id: {accountName:"$accountName"},          
           credit: { $sum: "$credit" },
           debit: { $sum: "$debit" },
         }
},   function (err, instance) { 

          var ledgerData = instance

        Accounts.find({},function (err, instance) { 
              var accountData = instance 
            for(var i=0;i<ledgerData.length;i++){

               if(accountData[i].accountName == ledgerData[i]._id.accountName){
                accountData[i].credit =ledgerData.credit
                 accountData[i].debit =ledgerData.debit

               }

              } 
               res.send(accountData);   


      });
        


                               
});   
});
});

  server.use(router);
};
