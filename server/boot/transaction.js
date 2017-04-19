module.exports = function(server) {
 // Install a `/` route that returns server status
    
    var mongodb = require('mongodb');
    var router = server.loopback.Router();
    var Transaction = server.models.transaction;
     var inventoryStock = server.models.inventoryStock;  
     var master = server.models.master;  
     var Inventory = server.models.inventory;  
     var BankTransaction = server.models.BankTransaction;  
      var voucherTransaction = server.models.voucherTransaction;
    var Accounts = server.models.account;  
     var Ledgers = server.models.ledger;  
    var supplier = server.models.suppliers;
    var groupMaster = server.models.groupMaster;
    var customer = server.models.customer;
    var MongoClient = require('mongodb').MongoClient;
    var assert = require('assert');

    var cron = require('node-cron');
    
  router.post('/transaction',function (req, res){
      
      
        var Tdata = req.body;
        console.log(Tdata);
        Ledgers.getDataSource().connector.connect(function (err, db) {   
        var Ledger = db.collection('ledger')
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
             supplier.update({id:instance.id},{supCode:instance.id},function (err, instance) { 
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
     
        supplier.getDataSource().connector.connect(function (err, db) {   
      
        customer.create(req.body,function (err, instance) { 
            console.log(instance);
            
            if(instance){  
             
             customer.update({id:instance.id},{cusCode:instance.id},function (err, instance) { 
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
        
         var itemTable = req.body.itemTable;
         var accountTable = req.body.accountTable;     
         var tdsLedger = req.body.tdsLedger;
         var count;
          console.log(ExpenseData); 
      Transaction.count({expenseId:req.body.expenseId}, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            }   
            else{
           count = instance;
           console.log(count)
           if(count== 0){            
            saveExpenseData(ExpenseData);
            console.log("Expense Save");
            res.send({status:"200"}); 
            
           }
           else{
               updateExpence(ExpenseData);
             console.log("Expense exist");   
             res.send({status:"200"});       
           }


         }                           
        });

// update expense 

     function updateExpence(data){
      console.log(data);
      var id   = data.id
      Transaction.update({expenseId:data.expenseId},data, function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                   console.log(instance); 
                   console.log("Expense Updated");
                    console.log(data.id);
                      var itemTable =  data.itemTable;
                      var accountTable =  data.accountTable;
                      var ledger  = [];
                      if(data.role == 'O'){
                         ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:mongodb.ObjectId(id),isUo:false,visible:true,compCode:data.compCode})
                        if(data.tdsAccountId){
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:mongodb.ObjectId(id),isUo:false,visible:true,compCode:data.compCode})
                        }
                      for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:false,visible:true,compCode:data.compCode})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:false,visible:true,compCode:data.compCode})
                        } 
                      } 
                      if(data.role == 'UO'){
                         ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:mongodb.ObjectId(id),isUo:true,visible:true,compCode:data.compCode})
                        if(data.tdsAccountName){
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:mongodb.ObjectId(id),isUo:true,visible:true,compCode:data.compCode})
                        }
                         for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:true,visible:true,isUo:true,visible:true,compCode:data.compCode})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:true,visible:true,compCode:data.compCode})
                        } 

                      }                                            
                        console.log(ledger);
                        if(id != undefined){
                       accountEntry(ledger,false,new mongodb.ObjectId(id));  
                        }
                        else{

                           console.log("voRef id is indefiend");
                        }
                  }         
      });



     }
    function saveExpenseData(data) {
      Transaction.create(data, function (err, instance) {                                    
            if (err) {    
             console.log(err)
            }   
            else{     console.log("expense Created")
                      var itemTable =  data.itemTable;
                      var accountTable =  data.accountTable;
                      var ledger  = [];
                      if(data.role == 'O'){
                         ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:instance.id,isUo:false,visible:true,compCode:data.compCode})
                        if(data.tdsAccountName){
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:instance.id,isUo:false,visible:true,compCode:data.compCode})
                        }
                      for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:instance.id,isUo:false,visible:true,compCode:data.compCode})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:instance.id,isUo:false,visible:true,compCode:data.compCode})
                        }
                      }
                      if(data.role == 'UO'){
                         ledger.push({accountName:data.supliersId,date:data.date,particular:itemTable[0].accountId,refNo:data.no,voType:"Expense",credit:data.amount,voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode})
                        if(data.tdsAccountName){
                           ledger.push({accountName:data.tdsAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",credit:data.tdsamount,voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode})
                        }
                      for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(itemTable[i].amount),voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Expense",debit:Number(accountTable[i].amount),voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode})
                        }
                      }

                        console.log("Expense Ledger Data",ledger);
                       accountEntry(ledger,false,instance.id);
            
         }                           
        });    
   }   
   });    
 //end save Expense  

 //inventory item



router.post('/saveItem',function (req, res){    
        //var GODOWN = req.body.GODOWN;
         var DESCRIPTION = req.body
          //var RRMARKS = req.body.RRMARKS;
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
       var data = req.body  
       if(data.billId){
        var query  = {id:data.billId}
       }
       else{
        query = {no:data.no}
       }
        Transaction.getDataSource().connector.connect(function (err, db) {   
          var collection = db.collection('transaction');
          Transaction.count(query, function (err, instance) {                                    
                 if (err) {    
                     console.log(err)
                 }   
                  else 
               {
                   count = instance;
                   console.log(instance)
                if(count == 0)
                {            
                   createBill(data);                  
                   console.log("Bill Created");
                   res.send("Bill Created");                   
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
                      if(data.role == 'O'){
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];                     
                    for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:instance.id,isUo:false,compCode:data.compCode})
                        }  
                        ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.amount),voRefId:instance.id,isUo:false,visible:false,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:instance.id,isUo:false,visible:false,compCode:data.compCode}    

                           )
                       accountEntry(ledger,false,instance.id);
                     }

                     if(data.role == 'UO'){
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];  
                       for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:instance.id,isUo:false,visible:true,compCode:data.compCode})
                        }                                       
                        ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.adminAmount),voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:instance.id,isUo:true,visible:true,compCode:data.compCode}    

                           )
                       accountEntry(ledger,true,instance.id);
                     }

                     createInventory(data,instance.id);
                  }   
                 
      });
       }
    
    // create Inventory
       function createInventory(data,billId){         
         if(data.role == 'UO'){     
          console.log(billId)
         var inventoryData  = data.itemDetail;      
           Inventory.count({visible:false,isActive:true}, function(err, instance){
           var count =  instance           
           var inventoryData  = data.itemDetail;                 
             for(var i=0;i<inventoryData.length;i++)
             {        
               inventoryData[i].isActive  = true;
               inventoryData[i].visible = false;
               inventoryData[i].no = data.no;
               inventoryData[i].invId = billId;
               inventoryData[i].rgNo = count + i + 1;
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
     }); 
     }   
          if(data.role == 'O'){
       Inventory.count({visible:true,isActive:true}, function(err, instance){
           var count =  instance           
           var inventoryData  = data.manualLineItem;                 
             for(var i=0;i<inventoryData.length;i++)
             {        
               inventoryData[i].isActive  = true;
               inventoryData[i].visible = true;
               inventoryData[i].no = data.no;
               inventoryData[i].invId = billId;
               inventoryData[i].rgNo = count + i + 1;
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
     });
    }
 }
       // update Inventory
       function updateInventory(data){
         if(data.role == 'UO'){
            var visible = false;
         }
          if(data.role == 'O'){
            var visible = true;
         }

       Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');
       // Inventory.update({no:data.no,visible:visible,isActive:true},{isActive:false},function(err, instance){
           Inventory.remove({invId:new mongodb.ObjectId(data.billId),visible:visible,isActive:true},function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                     console.log("inventory updated")
                     createInventory(data,new mongodb.ObjectId(data.billId));
                  }         
      });
     });
       }  

                          
          



       
  

      // Bill update Function
       function updateBill(data){

          if(data.role == 'UO'){

         delete data.manualLineItem;
         delete data.totalWeight;
          delete data.amount;
         delete data.balance;
         console.log(data);
        }
         if(data.role == 'O'){

         delete data.itemDetail;
         delete data.adminAmount;
         delete data.adminBalance;
         console.log(data);
        }
        Transaction.update({id:data.billId},data, function(err, instance){
              if (err) {    
                     console.log(err)
                 }   
                  else  {
                   console.log(instance);
                     if(data.role == 'O'){
                     console.log(data.billId);
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];
                    for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:new mongodb.ObjectId(data.billId),isUo:false})
                        }  
                        ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.amount),voRefId:new mongodb.ObjectId(data.billId),isUo:false,visible:false,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:new mongodb.ObjectId(data.billId),isUo:false,visible:false,compCode:data.compCode}    

                           )
                        console.log(ledger);

                       accountEntry(ledger,false,new mongodb.ObjectId(data.billId));
                   
                       
                     }
                      if(data.role == 'UO'){
                     console.log(data.billId);
                     
                     
                      var ledger  = [];
                   for(var i=0;i<accountData.length;i++)
                        {        
                       ledger.push({accountName:accountData[i].accountId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",debit:Number(accountData[i].amount),voRefId:new mongodb.ObjectId(data.billId),isUo:true, visible:true,compCode:data.compCode})
                        }  
                        ledger.push({accountName:data.supliersId,date:data.date,particular:data.purchaseAccountId,refNo:data.no,voType:"Purchase Invoice",credit:Number(data.adminAmount),voRefId:new mongodb.ObjectId(data.billId),isUo:true,visible:true,compCode:data.compCode},
                                    {accountName:data.purchaseAccountId,date:data.date,particular:data.supliersId,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.purchaseAmount),voRefId:new mongodb.ObjectId(data.billId),isUo:true,visible:true,compCode:data.compCode}    

                           )
                        console.log(ledger);

                       accountEntry(ledger,true,new mongodb.ObjectId(data.billId));
                   
                       
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
//end of Account Entry
router.get('/chartOfAccount/:compCode',function (req, res){
var compCode = req.params.compCode  
Ledgers.getDataSource().connector.connect(function (err, db) {  
   var collection = db.collection('ledger'); 
   collection.aggregate(

    {$match:{compCode:compCode}},
     { $group:
         {
           _id: {accountName:"$accountName"},          
           credit: { $sum: "$credit" },
           debit: { $sum: "$debit" }
         }
    }
,   function (err, instance) { 
          var ledgerData = instance
        Accounts.find({where:{compCode:compCode}},function (err, instance) { 
              var accountData = instance 
            for(var i=0;i<accountData.length;i++){
               for(var j=0;j<ledgerData.length;j++){
              
               if(accountData[i].id == ledgerData[j]._id.accountName){
                accountData[i].credit =ledgerData[j].credit
             
                 accountData[i].debit =ledgerData[j].debit


               }
              }
              } 
               res.send(accountData);   
      });                               
});   
});
});



// custom Payement 

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

                     console.log(instance)
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
                

  
           

// create group 

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
                  console.log(instance)
                  console.log(instance[0].ancestor)
                  var ancestor = instance[0].ancestor
                  ancestor.push(groupData.type);
                 
                  groupData.ancestor = ancestor;
                  console.log(ancestor)
                  console.log(groupData)
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

// test 
   "get supplier count "
   router.get('/getSupplierCount/:compCode',function (req, res){ 
    var compCode = req.params.compCode 
     Accounts.find({where:{compCode:compCode,ancestor:'SUNDRY CREDITORS'}}, function (err, instance) { 
                 if(instance){ 
                    var count = instance.length; 
                    res.send({count:count});
                 };
           
 }); 
  });
  "get sundry creditor account"
router.get('/getSupplierAccount/:compCode',function (req, res){  
     var compCode = req.params.compCode 
     Accounts.find({where:{compCode:compCode,ancestor:'SUNDRY CREDITORS'}}, function (err, instance) { 
                 if(instance){  
                    res.send(instance);
                 };
           
 }); 
  });


  "get sundry debitor account"
router.get('/getPartytAccount/:compCode',function (req, res){  
     var compCode = req.params.compCode 
     Accounts.find({where:{compCode:compCode,ancestor: 'SUNDRY DEBTORS'}}, function (err, instance) { 

                 if(instance){   

                 //console.log(instance)             
                   res.send(instance);
                 };
           
 }); 
  });
router.get('/getPaymentAccount/:compCode',function (req, res){ 
  var compCode = req.params.compCode  
     Accounts.find({where:{compCode:compCode,or:[{ancestor: 'BANK ACCOUNTS'},{ancestor:'CASH-IN-HAND'}]}}, function (err, instance) { 

                 if(instance){                
                   res.send(instance);
                 };
           
 }); 
  }); 

  router.get('/getExpenseAccount/:compCode',function (req, res){ 
  var compCode = req.params.compCode  
     Accounts.find({where:{compCode:compCode,or:[{ancestor: 'DIRECT EXPENSES'},{ancestor:'INDIRECT EXPENSES'}]}}, function (err, instance) { 

                 if(instance){                
                   res.send(instance);
                 };
           
 }); 
  });     
     

     "Receive Payment"

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
          ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId, remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:instance.id,isUo:true,visible:true});
          accountEntry(ledger,true,instance.id);
                   }
                 else if(dataBadla.role == 'O'){

           ledger.push({accountName:dataBadla.vo_badla.badlaAccountId,compCode:dataBadla.compCode,date:dataBadla.date,particular:dataBadla.vo_badla.partyAccountId,remarks:" badla for Inv No("+dataBadla.vo_badla.billDetail[0].vochNo+")" ,refNo:dataBadla.vochNo,voType:"Badla",credit:Number(dataBadla.amount),voRefId:instance.id,isUo:false});
           accountEntry(ledger,false,instance.id); 
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
   
   "Receive Payment"
   router.post('/receivePayment',function (req, res){  
        var id = req.query.id
        var data = req.body;
        console.log(req.body);
        if (id != 'null' ) {
           var query = { id: id }
           updatePayment(req.body,id);
           res.send({status:'200'});
        }
        else {
           createPayment(data);
           res.send({status:'200'});
        }
   });     
       function updatePayment(data,id){
        console.log(id);
           voucherTransaction.update({_id:new mongodb.ObjectId(id)}, data, function (err, instance) { 
            if(err)
              console.log(err);
            else {
               var ledger = [];
                 if(data.role == 'UO'){
                     ledger.push({accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:id,isUo:true,visible:true}
                     )
                     accountEntry(ledger,true,instance.id);
                   }
                 else if(data.role == 'O'){

         ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:id,isUo:false}
                     )
                     accountEntry(ledger,false,new mongodb.ObjectId(id)); 
                   }
                   updatePaymentLog(data.vo_payment.billDetail,data.date,data.vochNo,new mongodb.ObjectId(id),data.role);  
                }  
           });
       }

        function createPayment(data){
          voucherTransaction.create(data, function (err, instance) { 
               if(err){
                console.log(err);
               }
                   var vochID  = instance.id                              
                   var ledger = [];
                 if(data.role == 'UO'){
           for(var m=0;m<data.vo_payment.billDetail.length;m++){
             var bill=data.vo_payment.billDetail[m];
             if(bill.interest)
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
                     ledger.push({accountName:data.vo_payment.partyAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true},
                     {accountName:data.vo_payment.bankAccountId,compCode:data.compCode,date:data.date,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:instance.id,isUo:true,visible:true}
                     )
           console.log(ledger);
                     accountEntry(ledger,true,instance.id);
                   }
                 else if(data.role == 'O'){
           for(var m=0;m<data.vo_payment.billDetail.length;m++){
             var bill=data.vo_payment.billDetail[m];
             if(bill.interest)
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

         ledger.push({accountName:data.vo_payment.partyAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.bankAccountId,refNo:data.vochNo,voType:"Receive Payment",credit:Number(data.amount),voRefId:instance.id,isUo:false},
                     {accountName:data.vo_payment.bankAccountId,date:data.date,compCode:data.compCode,particular:data.vo_payment.partyAccountId,refNo:data.vochNo,voType:"Receive Payment",debit:Number(data.amount),voRefId:instance.id,isUo:false}
                     )
           console.log(ledger);
                     accountEntry(ledger,false,instance.id); 
                   }    
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
      collection.update({vochNo:data[i].vochNo},query1,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }               
 });
     collection.update({vochNo:data[i].vochNo},query2, function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }
                
        });  
     }       
     
   });       
 }           

" payment voucherTransaction"
  router.post('/payment',function (req, res){  

    var data = req.body
    voucherTransaction.create( req.body, function (err, instance) { 
                 if(instance){   
                 var vochID  = instance.id             
                   res.send(instance);
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
                 };

 }); 
      function updateTransactions(data,date,vochNo,vochID,role){
       
      Transaction.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('transaction');        
        for(var i = 0;i<data.length;i++ ){
           if(role == 'UO'){
          var query1 =  {$set:{adminBalance:Number(data[i].balance)}}
          var query2 =  {$push:{'paymentLog':{id:vochID,date:date,vochNo:vochNo,amount:data[i].amountPaid,isUo:true}}}
        }
         if(role == 'O'){
          var query1 =  {$set:{balance:Number(data[i].balance)}}
          var query2 =  {$push:{'paymentLog':{id:vochID,date:date,vochNo:vochNo,amount:data[i].amountPaid,isUo:false}}}

         }
     collection.update({no:data[i].no},query1,function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }               
 });
  collection.update({no:data[i].no},query2, function (err, instance) { 
                 if(instance){     
                 console.log(instance.result);           
                 }
                
 });  
      }       
     
   });       
      }           
            });

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
        
        //console.log(objectId)
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

    //update weigths
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
                        //console.log("voucher Created");
                        //res.send("voucher Created");
                    }
                    else {
                        updateVoucher(data,id);
                        //console.log("voucher updated");
                        //res.send(foo);
                    }
                }
            });
        });
        // Bill create Function

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
       Inventory.getDataSource().connector.connect(function (err, db) {   
        var collection = db.collection('inventory');     
          for(var i = 0;i<data.length;i++)
            {  
                  var sum = 0 ;
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
    compCode:compCode
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
        Accounts.find({where:{compCode:compCode}},function (err, instance) { 
          var accountData = instance    
          ledgerData = ledgerDatalessThan            
            for(var i=0;i<accountData.length;i++){
               for(var j=0;j<ledgerData.length;j++){
               if(accountData[i].id == ledgerDatalessThan[j]._id.accountName){    
                   accountData[i].credit =ledgerDatalessThan[j].credit
                   accountData[i].debit = ledgerDatalessThan[j].debit 
                   accountData[i].openingBalance = (ledgerDatalessThan[j].credit - ledgerDatalessThan[j].debit) 
                                                   
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

console.log(fromDate);
console.log(toDate)

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
]).toArray(function(err, result) {;
                assert.equal(err, null);
                console.log(result);
                callback(result);
     });
}
      var getLedgerData = function(db, callback) {
        var ledger;
        var collection = db.collection('ledger');
             var cursor = collection.find({"accountName":accountName,compCode:compCode, date:{$gte:fromDate,$lte:toDate}}).toArray(function(err, result) {;
                assert.equal(err, null);
                console.log(result);
                callback(result);
        });                                        
     }
       Ledgers.getDataSource().connector.connect(function (err, db) {  
                var collection = db.collection('ledger');               
                openingBalnce(db, function(data) {
                  var ledgerOpeningBalnce = data[0].credit - data[0].debit
                  console.log(ledgerOpeningBalnce)
                   getLedgerData(db, function(data) {
                     res.send({openingBalance:ledgerOpeningBalnce,ledgerData:data})               
                });                
              });

    });                                
});   


       //create Expense and save Expense
router.post('/saveExpensetest/:expenseId',function (req, res){
   var data = req.body;
   console.log(data)

   var expenseId = req.params.expenseId;
   console.log(expenseId);
   var query;
   if(expenseId != 'null'){
        var query  = {_id:new mongodb.ObjectId(expenseId)}
       }
       else{
        query = {no:data.transactionData.no}
       }
       console.log(query)
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

       function createLedgerJson(data,id)
       {    
           console.log(data);
           console.log(data.accountTable)
            console.log(data.itemTable)
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
             var cursor = collection.remove({invId:new mongodb.ObjectId(billId),visible:visible,isActive:true}, function(err, result) {;
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
                {$project : 
                { type : "$type",
                  invoiceNo:"$no",
                  date:"$date",
                  amount:amount,
                  balance:balance,
                  supplier:"$transactionData.supliersId",
                  compCode:"$compCode",
                  id:"$_id"

                }} ,function(err, result) {;
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
                   //{$match:{balance:{$gt:0}}},
                   {$project :{
                      date: "$date",
                      duedate: "$duedate",
                      amount: "$amount",
                      vochNo: "$vochNo",
                      type: "$type",
                      balance:"$balance",
                      id:"$_id"                   
                   }
                 }
              ,function(err, result) {;
                  assert.equal(err, null);
                  callback(result);
        });
    }

   });

   "get all open bill of a particular supplier"

 
    
  server.use(router);
};
