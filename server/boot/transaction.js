module.exports = function(server) {
 // Install a `/` route that returns server status
    
    var mongodb = require('mongodb');
    var router = server.loopback.Router();
    var Transaction = server.models.transaction;
     var inventoryStock = server.models.inventoryStock;  
     var master = server.models.master;  
     var Inventory = server.models.Inventory;  
     var BankTransaction = server.models.BankTransaction;  
      var voucherTransaction = server.models.voucherTransaction;
    var Accounts = server.models.account;  
     var Ledgers = server.models.ledger;  
    var supplier = server.models.suppliers;
    var customer = server.models.customer;

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
                      for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountName,date:data.date,particular:data.supliersName,refNo:data.no,voType:"Expense",debit:0,credit:Number(itemTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:false})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountName,date:data.date,particular:data.supliersName,refNo:data.no,voType:"Expense",debit:0,credit:Number(accountTable[i].amount),voRefId:mongodb.ObjectId(id),isUo:false})
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
                      for(var i=0;i<itemTable.length;i++)
                        {        
                       ledger.push({accountName:itemTable[i].accountName,date:data.date,particular:data.supliersName,refNo:data.no,voType:"Expense",debit:0,credit:Number(itemTable[i].amount),voRefId:instance.id,isUo:false})
                        } 
                    for(var i=0;i<accountTable.length;i++)
                        {        
                       ledger.push({accountName:accountTable[i].accountName,date:data.date,particular:data.supliersName,refNo:data.no,voType:"Expense",debit:0,credit:Number(accountTable[i].amount),voRefId:instance.id,isUo:false})
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
         console.log(data.date);
      // data.date  = new Date(data.date);
     //  data.billDueDate  = new Date(data.billDueDate);
       console.log(data.date);
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

                     if(data.role == 3){
                      var accountData =  data.accountlineItem;
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];                                       
                        ledger.push({accountName:data.supliersName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(data.adminAmount),voRefId:instance.id,isUo:true},
                                    {accountName:'Inventory',date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.adminAmount),credit:0,voRefId:instance.id,isUo:true}    

                           )
                       accountEntry(ledger,true,instance.id);
                     }
                  }         
      });
       }
    
    // create Inventory
       function createInventory(data){         
         if(data.role == 3){     
         var inventoryData  = data.itemDetail;      
           Inventory.count({visible:false,isActive:true}, function(err, instance){
           var count =  instance           
           var inventoryData  = data.itemDetail;                 
             for(var i=0;i<inventoryData.length;i++)
             {        
               inventoryData[i].isActive  = true;
               inventoryData[i].visible = false;
               inventoryData[i].no = data.no;
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
          if(data.role == 2){
       Inventory.count({visible:true,isActive:true}, function(err, instance){
           var count =  instance           
           var inventoryData  = data.manualLineItem;                 
             for(var i=0;i<inventoryData.length;i++)
             {        
               inventoryData[i].isActive  = true;
               inventoryData[i].visible = true;
               inventoryData[i].no = data.no;
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
                      if(data.role == 3){
                     console.log(data.billId);
                     
                      var purchaseAccount = 'Purchase Account' ;
                      var ledger  = [];
                   
                        ledger.push({accountName:data.supliersName,date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:0,credit:Number(data.adminAmount),voRefId:new mongodb.ObjectId(data.billId),isUo:true},
                                    {accountName:'Inventory',date:data.date,particular:purchaseAccount,refNo:data.no,voType:"Purchase Invoice",debit:Number(data.adminAmount),credit:0,voRefId:new mongodb.ObjectId(data.billId),isUo:true}    

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
            for(var i=0;i<accountData.length;i++){
               for(var j=0;j<ledgerData.length;j++){

               if(accountData[i].accountName == ledgerData[j]._id.accountName){
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
                          bankAccount:data.vo_payment.bankAccount,
                          partyAccount:data.vo_payment.partyAccount,
                          voRefId:instance.id
                      }  
                     Transaction.update({no:data.refNo},{customPaymentInfo:customPaymentInfo} ,function (err, instance) {
                         if (err) {    
                       console.log(err)
                        } 
                 else{
                           console.log(instance)
                        }
                     });
         var ledger = [];
         ledger.push({accountName:data.vo_payment.partyAccount,date:data.date,particular:data.vo_payment.bankAccount,refNo:vochNo,voType:"Payment",debit:Number(data.amount),credit:0,voRefId:instance.id,isUo:false},
                     {accountName:data.vo_payment.bankAccount,date:data.date,particular:data.vo_payment.partyAccount,refNo:vochNo,voType:"Payment",debit:0,credit:Number(data.amount),voRefId:instance.id,isUo:false}
                     )

                   accountEntry(ledger,false,instance.id); 

                   res.send({status:'200'});
        }
                              
});   
});
});
});




  server.use(router);
};
