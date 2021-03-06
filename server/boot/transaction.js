module.exports = function (server) {

  var mongodb = require('mongodb');
  var ObjectID = require('mongodb').ObjectID
  var router = server.loopback.Router();
  var master = server.models.master;
  var Inventory = server.models.inventory;
  var BankTransaction = server.models.BankTransaction;
  var voucherTransaction = server.models.voucherTransaction;
  var Accounts = server.models.account;
  var Ledgers = server.models.ledger;
  var groupMaster = server.models.groupMaster;
  var user = server.models.User;
  var userActivity = server.models.userActivity;
  var MongoClient = require('mongodb').MongoClient;
  var assert = require('assert');
  var mmongoose = require('mongoose');
  var colors = require('colors');
  var test = require('./voucherDelete');
  var utils = require('./utils');
   var cron = require('node-cron');
  var interestPayble = "59523facfcb0e939d4165108"
  var interestReceivable ="59522f85267e787c4836bf03"
  "rest Api Starts here"


       cron.schedule('1,2,4,5 * * * *', function(){
       console.log('running every minute 1, 2, 4 and 5');
    });
  router.post('/updateAccount', function (req, res) {
    var id = req.body.id;
    Accounts.getDataSource().connector.connect(function (err, db) {
      Accounts.update({ id: new mongodb.ObjectId(id) }, { isParent: true }, function (err, instance) {
        console.log(instance);
        console.log("account updated ");
      });
      res.send({ status: "200" });
    });
  });
  //get inventory count
  router.post('/getInventoryCount', function (req, res) {
    var name = req.body.name;
    var type = req.body.TYPE;
     var compCode = req.query.compCode;
    Accounts.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      collection.count({GODOWN:name,compCode:compCode,TYPE:type}, function (err, instance) {
        console.log(instance);
        console.log("account updated ");
        res.send({ count: instance });
      });
      
    });
  });
  "get expense data"
  router.post('/getExpense', function (req, res) {
    var refNo = req.query.refNo
    Transaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('transaction');
      Transaction.find({ where: { ordertype: "EXPENSE", refNo: refNo } }, function (err, instance) {
        res.send(instance);
      });
    });
  });
  "save inventory Item"
  router.post('/saveItem', function (req, res) {
    var DESCRIPTION = req.body
    master.count({ name: req.body.name }, function (err, instance) {
      if (instance) {
        if (instance > 0) {
          res.send("item exist")
        }
      }
      else {
        master.create(req.body, function (err, instance) {
          if (err) {
            console.log(err)
          }
          else {
            console.log("item Data Saved");
            res.send({ "status": "200" });
          }
        })

      }
    });
  });
  "Account Entry function"
  function accountEntry(data, isUo, voRefId) {
    var acData = data;
    console.log(isUo);
    console.log(voRefId)
    Ledgers.count({ voRefId: voRefId, isUo: isUo }, function (err, instance) {
      if (err) {
        console.log(err)
      }
      else {
        var count = instance;
        if (count > 0) {
          Ledgers.remove({ voRefId: voRefId, isUo: isUo }, function (err, instance) {
            console.log(instance)
            console.log("ledger removed in account Entry")
            Ledgers.create(data, function (err, instance) {
              if (err) {
                console.log(err)
              } else {
                console.log("ledger updated")
              }
            });
          })
        }
        else if (data != null) {
          Ledgers.create(data, function (err, instance) {
            if (err) {
              console.log(err)
            } else {
              console.log("ledger created in account entry")
            }
          });
        }
      }
    });
  }
  "custom Payement"
  router.post('/payement', function (req, res) {
    var data = req.body
    voucherTransaction.count({ type: "Payment" }, function (err, instance) {
      if (err) {
        console.log(err)
      }
      else
        data.no = instance + 1;
      var vochNo = instance + 1;
      console.log(data.paymentNo);
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        voucherTransaction.create(data, function (err, instance) {
          if (err) {
            console.log(err)
          }
          else {
            var customPaymentInfo = {
              status: "done",
              amount: data.data,
              paymentDate: data.date,
              bankAccount: data.vo_payment.bankAccountId,
              partyAccount: data.vo_payment.partyAccountId,
              voRefId: instance.id
            }
            voucherTransaction.update({ no: data.refNo }, { 'billData.customPaymentInfo': customPaymentInfo }, function (err, instance) {
              if (err) {
                console.log(err)
              }
              else {
                console.log(instance)
              }
            });
            var ledger = [];
            ledger.push({ accountName: data.vo_payment.partyAccountId, date: data.date, particular: data.vo_payment.bankAccountId, refNo: vochNo, voType: "Payment", debit: Number(data.amount), voRefId: instance.id, isUo: false },
              { accountName: data.vo_payment.bankAccountId, date: data.date, particular: data.vo_payment.partyAccountId, refNo: vochNo, voType: "Payment", credit: Number(data.amount), voRefId: instance.id, isUo: false }
            )
            accountEntry(ledger, false, instance.id);
            res.send({ status: '200' });
          }
        });
      });
    });
  });
  "create new Account"
  router.post('/createAccount', function (req, res) {
    var id = req.query.id
    var accountData = req.body
    groupMaster.find({ where: { name: accountData.Under } }, function (err, instance) {
      if (instance) {
        var ancestor = instance[0].ancestor
        accountData.ancestor = ancestor;
        ancestor.push(accountData.Under);

      }
      if (id != 'null') {
        Accounts.update({ id: id }, accountData, function (err, instance) {
          if (err) {
            console.log(err)
          }
          else {
            var activity = "Account" + " " + accountData.accountName +" "+ "Updated"
            activityLog(accountData.username,activity,' ',accountData.compCode)
            console.log("account updated")
            res.status(200).send({ id: id });
          }
        });
      }
      else {
        Accounts.create(accountData, function (err, instance) {
          if (err) {
            console.log(err)
          }
          else {
            console.log(instance)
              var activity = "Account" + " " +  accountData.accountName + " " + "created"
              activityLog(accountData.username,activity,' ',accountData.compCode)
            //res.send({"status":"Account created"})
            res.status(200).send({ id: instance.id });
          }
        });
      }
    });
  });
  "update account"
  router.post('/updateAccount/:id', function (req, res) {
    var id = req.params.id
    var accountData = req.body
    Accounts.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('account');
      collection.update({ _id: new mongodb.ObjectId(id) }, { $push: { 'compCode': accountData.compCode } }, function (err, instance) {
        if (instance) {
          console.log("account updated ");
          console.log(instance.result);
          res.send({ status: "200" });
        }
        else {
          console.log(err);
        }
      });
    });
  });
  "create group"
  router.post('/createGroup', function (req, res) {
    var groupData = req.body
    groupMaster.count({ accountName: groupData.name }, function (err, instance) {
      if (err) {
        console.log(err)
      }
      else {
        if (instance > 0) {
          console.log("group All Ready exist")
          res.send({ "messege": "group All Ready exist" })
        }
        else {
          groupMaster.find({ where: { name: groupData.type } }, function (err, instance) {
            if (instance) {
              var ancestor = [];
              var ancestor = instance[0].ancestor
              ancestor.push(groupData.type);
              groupData.ancestor = ancestor;
            }
            groupMaster.create(groupData, function (err, instance) {
              if (err) {
                console.log(err)
              }
              else {
                res.send({status: "group created" })
              }
            });
          });
        }
      }
    });
  });
  "get supplier count "
  router.get('/getSupplierCount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        var count = instance.length;
        res.send({ count: count });
      };

    });
  });
  "get sundry creditor account"
  router.get('/getSupplierAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
   "getSupplierList"
  router.get('/getSupplierList/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true,ancestor:"SUNDRY CREDITORS" } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  "get sales account"
  router.get('/getSaleAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  "get sundry debitor account"
  router.get('/getPartytAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } } , function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
   "get sundry debitor account"
  router.get('/getCustomer/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true ,ancestor:"SUNDRY DEBTORS"}} , function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  "get purchase Account "
  router.get('/getpurchaseAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  "get tax account "
  router.get('/getPaymentAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  "getExpenseAccount"
  router.get('/getExpenseAccount/:compCode', function (req, res) {
    var compCode = req.params.compCode
    Accounts.find({ where: {isActive: true } }, function (err, instance) {
      if (instance) {
        res.send(instance);
      };

    });
  });
  

  "delete sales invoice"
  router.post('/deleteSalesInvoice', function (req, res) {
    var id = req.query.id
    var data = req.body;
    voucherTransaction.findOne({ where: { type: req.type, _id: new mongodb.ObjectID(id) } }, { paymentLog: 1 }, function (err, instance) {
      if (err) {
        console.log(err);
      }
      else if (instance.paymentLog && instance.paymentLog.length > 0) {
        res.send({ err: "Receipt exists", status: 200 });
      } else {
        removeVoucherTransaction(id, data.role);
        res.send({ status: '200' });
      }
    })
    //check if there is any receipt for the invoice if exists return err message "Receipt Voucher exists".
  });
  "Delete Receipt"
  router.post('/deleteReceipt', function (req, res) {
    // check if any dependent exist then send err message 
    var id = req.query.id;
    var data = req.body;
    deleteReceipt(id, data, false, function (err) {
      if (err) res.send(err);
      else res.send({ status: '200' });
    });
  });
  function deleteReceipt(id, data, isMock, callback) {
    voucherTransaction.findOne({ where: { receiptId: typeof id == 'object' ? id : new mongodb.ObjectID(id), type: "Badla Voucher" } }, function (err, instance) {
      if (err) {
        console.log(err);
      }
      else if (instance) { //to check badla exists for receipts. 
        //else if (instance && instance.paymentLog && instance.paymentLog.length > 0) { //to check if there is any transaction on dependent badla voucher. 
        //res.send({ err: "Badla exists", status: 200 });
        if (callback) callback({ err: "Badla exists", status: 200 });
      } else {
        if (isMock) {
          if (callback) callback();
        } else {
          //remove badla..
          //removeBadlaVoucher(id, data.role, function () { //uncomment if want to check transaction on badla else comment.
            //remove receipt and ledger.

            // delete receipt voucher // send status issue
            removeVoucherTransaction(id, data.role);
            //update balance and payment log.
            updateBalanceAndTransactionLog(new mongodb.ObjectId(id), data.role);
            if (callback) callback();
          //})
        }
      }

    })
  }

  "Delete Payment"
  router.post('/deletePayment', function (req, res) {
    var id = req.query.id
    var data = req.body;
    deletePayment(id, data, function () {
      res.send({ status: '200' });
    });
  });
  function deletePayment(id, data, callback) {
    //remove payment and ledger.
    removeVoucherTransaction(id, data.role);
    //update balance and payment log.
    updateBalanceAndTransactionLog(new mongodb.ObjectId(id), data.role);
    if (callback) callback();
  }

  " create Interest Voucher Json "
 function createInterestVoucherJson(data,id,interestData,vochType) {
   voucherTransaction.remove({voucherId: id, type: "Interest" }, function (err, instance) {
    if (err) console.log(err);
    else{
       var json = [];
      for (var i = 0; i <interestData.length; i++) {
        if(interestData[i].interest != 0){
           var jsonData = {
                compCode: data.compCode,
                type: "Interest",
                refVochType:vochType,
                role: data.role,
                date: data.date,
                duedate: new Date(interestData[i].duedate),
                customerId:data.vo_payment.partyAccountId,
                amount: Math.abs(interestData[i].interest),
                balance:Math.abs(interestData[i].interest),
                vochNo: " Interest " + data.vochNo,
                refNo:data.vochNo,
                voucherId:id,
                state: "PAID",
                username: data.username,
                visible: data.visible,
                isUo: data.isUo
      }
         json.push(jsonData);
         console.log("interest voucher json created".magenta,jsonData)
   }
}         
          if(json.length>0){ 
          voucherTransaction.create(json, function (err, instance) {
            if(err){
              console.log(err)
            }else{
              console.log("interest voucher created sucesfully".magenta,json.length)
            }
          });
      }   
   }
  
});
     
};
  "Receipt"
  router.post('/receipt', function (req, res) {
    var id = req.query.id
    var data = req.body;
    console.log(data);
    var dataBadla;
    var badla;
    //var isBadla=false;
    if (data.vo_badla) {
      //badla payment
      dataBadla = data.vo_badla;
      
      delete data.vo_badla;
    }
    //if ( Array.isArray(req.body) && req.body.length>1 ) {
    console.log(data);
    console.log(dataBadla);
    if (id != 'null') {
      console.log(id);
      voucherTransaction.findOne({ where: { receiptId: ObjectID(id), type: "Badla Voucher" } }, function (err, instance) {
        if (err) {
          console.log(err);
        }
        else if (instance && instance.paymentLog && instance.paymentLog.length > 0) {
          res.send({ err: "Badla exists", status: 200 });
          return;
        } else {
          updateReceipt(data, id,dataBadla, function () {
             var activity = "Receipt Updated"
            activityLog(data.username,activity,data.vochNo,data.compCode)
             createInterestVoucherJson(data,id,data.vo_payment.billDetail,"Receipt");

            //find out if any badla voucher exists for receipt then delete badla voucher and ledger
            //and create new badla and ledger if there is badla object in the request.
            removeBadlaVoucher(id, data.role, function () {
              if (dataBadla) {
                dataBadla.receiptId = new mongodb.ObjectId(id);
                createBadlaVoucher(dataBadla, function () {
                  res.send({ status: '200' });
                });
              } else {
                res.send({ status: '200' });
              }
            });
          });
        }
      });

    }
    else {
      createReceipt(data, dataBadla,function (dataInstance) {
            var activity = "Receipt Created"
            activityLog(data.username,activity,data.vochNo,data.compCode)
            createInterestVoucherJson(data, dataInstance.id.toHexString(),data.vo_payment.billDetail,"Receipt");
        if (dataBadla) {
          dataBadla.receiptId = dataInstance.id;
          createBadlaVoucher(dataBadla, function () {
            res.send({ status: '200' });
          });
        } else {
          res.send({ status: '200' });
        }
      });


    }
  });
  function removeBadlaVoucher(id, role, callback) {
    voucherTransaction.findOne({ where: { receiptId: new mongodb.ObjectID(id), type: "Badla Voucher" } }, function (err, instance) {
      if (err) {
        console.log(err);
      } else {
        if (instance) {
          console.log(instance.id)
          if (role == 'UO') {
            accountEntry(null, true, new mongodb.ObjectID(instance.id));
          }
          else if (role == 'O') {
            accountEntry(null, false, new mongodb.ObjectID(instance.id));
          }
          voucherTransaction.remove({ receiptId: new mongodb.ObjectID(id), type: "Badla Voucher" }, function (err, instance) {
            if (err) console.log(err);
            else console.log(instance);

          });
        }
        if (callback) callback();
      }
    })
  }
  function removeVoucherTransaction(id, role) {
    if (role == 'UO') {
      accountEntry(null, true, new mongodb.ObjectID(id));
    }
    else if (role == 'O') {
      accountEntry(null, false, new mongodb.ObjectID(id));
    }
    //voucherTransaction.remove({ _id: new mongodb.ObjectID(id) }, function (err, instance) {
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
       collection.update({ _id: new mongodb.ObjectID(id) },{$set:{state:"DELETED",deleteDate:new Date()}}, function (err, instance) {
      if (err) console.log(err);
      else console.log(instance);
    });
   });
  }

  function createBadlaVoucher(dataBadla, callback) {
    voucherTransaction.count({ type: dataBadla.type }, function (err, instance) {
      if (err) console.log(err);
      else {
        dataBadla.vochNo = instance + 1;
        voucherTransaction.create(dataBadla, function (err, instance) {
          if (err) {
            console.log(err);
          } else {
            var vochID = instance.id
            var ledger = [];
            if (dataBadla.role == 'UO') {
              ledger.push({ accountName: dataBadla.vo_badla.badlaAccountId, compCode: dataBadla.compCode, date: dataBadla.date, particular: dataBadla.vo_badla.partyAccountId, remarks: dataBadla.vo_badla.billDetail.length ? " badla for Inv No(" + dataBadla.vo_badla.billDetail[0].vochNo + ")" : "", refNo: dataBadla.vochNo, voType: dataBadla.type, debit: Number(dataBadla.amount), voRefId: instance.id, isUo: true, visible: true });
              console.log(ledger);
              accountEntry(ledger, true, instance.id);
            }
            else if (dataBadla.role == 'O') {
              ledger.push({ accountName: dataBadla.vo_badla.badlaAccountId, compCode: dataBadla.compCode, date: dataBadla.date, particular: dataBadla.vo_badla.partyAccountId, remarks: dataBadla.vo_badla.billDetail.length ? " badla for Inv No(" + dataBadla.vo_badla.billDetail[0].vochNo + ")" : "", refNo: dataBadla.vochNo, voType: dataBadla.type, debit: Number(dataBadla.amount), voRefId: instance.id, isUo: false });
              console.log(ledger);
              accountEntry(ledger, false, instance.id);
            }
            if (callback) callback();
          }
        });
      }
    });
  }

  function updateReceipt(data, id,dataBadla, callback) {
    console.log(id);
    voucherTransaction.update({ _id: new mongodb.ObjectId(id) }, data, function (err, instance) {
      if (err)
        console.log(err);
      else {
        updateBalanceAndTransactionLog(new mongodb.ObjectId(id), data.role, function () {
          var ledger = [];
          if (data.role == 'UO') {
            for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
              var bill = data.vo_payment.billDetail[m];
              if (bill.interest) {
                if (bill.interest > 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestReceivable, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible },
                    { accountName: interestReceivable, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible });
                } else if (bill.interest < 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestPayble, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible },
                    { accountName: interestPayble, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible });
                }
              }

            }
             if(dataBadla){
                ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.amount), voRefId: instance.id, isUo: true, visible: data.visible });
        }else{
            ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.amount), voRefId: id, isUo: true, visible: data.visible },
              { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: id, isUo: true, visible: data.visible }
            )
        }
            console.log(ledger);
            accountEntry(ledger, true, new mongodb.ObjectId(id));
          }
          else if (data.role == 'O') {
            for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
              var bill = data.vo_payment.billDetail[m];
              if (bill.interest) {
                if (bill.interest > 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestReceivable, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible },
                    { accountName: interestReceivable, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible });
                } else if (bill.interest < 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestPayble, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible },
                    { accountName: interestPayble, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible });
                }
              }
            }
            ledger.push({ accountName: data.vo_payment.partyAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Receipt", credit: Number(data.amount), voRefId: id, isUo: false, visible: data.visible },
              { accountName: data.vo_payment.bankAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Receipt", debit: Number(data.amount), voRefId: id, isUo: false, visible: data.visible }
            )
            console.log(ledger);
            accountEntry(ledger, false, new mongodb.ObjectId(id));
          }
          updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, new mongodb.ObjectId(id), data.role);
          if (callback) callback(instance);
        });
      }
    });
  }

  function createReceipt(data,dataBadla,callback) {
    voucherTransaction.create(data, function (err, instance) {
      if (err) {
        console.log(err);
      }
      var vochID = instance.id
      var ledger = [];
      if (data.role == 'UO') {
        for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
          var bill = data.vo_payment.billDetail[m];
          if (bill.interest) {
            if (bill.interest > 0) {
              ledger.push(
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestReceivable, refNo: data.vochNo, voType: "Interest ", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: data.visible },
                { accountName: interestReceivable, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: data.visible });
            } else if (bill.interest < 0) {
              ledger.push(
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestPayble, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: data.visible },
                { accountName: interestPayble, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: data.visible });
            }
          }
        }
        if(dataBadla){
        ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.amount), voRefId: instance.id, isUo: true, visible: data.visible });
        }else{
           ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.amount), voRefId: instance.id, isUo: true, visible: data.visible },
          { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: instance.id, isUo: true, visible: data.visible }
        );
        }
        console.log(ledger);
        accountEntry(ledger, true, instance.id);
      }
      else if (data.role == 'O') {
        for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
          var bill = data.vo_payment.billDetail[m];
          if (bill.interest) {

            if (bill.interest > 0) {
              ledger.push(
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestReceivable, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible },
                { accountName: interestReceivable, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible });
            } else if (bill.interest < 0) {
              ledger.push(
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: interestPayble, refNo: data.vochNo, voType: "Interest", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible },
                { accountName: interestPayble, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false, visible: data.visible });
            }
          }
        }
        ledger.push({ accountName: data.vo_payment.partyAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.amount), voRefId: instance.id, isUo: false, visible: data.visible },
          { accountName: data.vo_payment.bankAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: instance.id, isUo: false, visible: data.visible }
        );
        console.log(ledger);
        accountEntry(ledger, false, instance.id);
      }
      updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, vochID, data.role);
      if (callback) callback(instance);

    });

  }
  "update payment log"
  function updatePaymentLog(data, date, vochNo, vochID, role) {
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
      for (var i = 0; i < data.length; i++) {
        collection.update(
          { vochNo: data[i].vochNo, "paymentLog.id": vochID },
          { $set: { "paymentLog.$.amount": data[i].amountPaid } }, function (err, instance) {
            if (instance) {
              console.log(instance.result);
            }

          });
      }
    });
  }

  function updateBalanceAndTransactionLog(vochID, role, callback) {
    //voucherTransaction.getDataSource().connector.connect(function (err, db) {
    // var collection = db.collection('voucherTransaction');
    console.log(vochID);
    voucherTransaction.find({ where: { "paymentLog.id": vochID } }, { amount: 1, balance: 1, paymentLog: 1 }, function (err, instance) {
      if (err) {
        console.log(err);
        if (callback) callback();
      } else {
        var data = instance;
        console.log(data);
        voucherTransaction.getDataSource().connector.connect(function (err, db) {
          var collection = db.collection('voucherTransaction');
          for (var i = 0; i < data.length; i++) {
            if (role == 'UO' && data[i].type == 'Purchase Invoice') {
              var paymentLogAmt = 0;
              for (var m = 0; m < data[i].paymentLog.length; m++) {
                if (data[i].paymentLog[m].id == vochID) {
                  paymentLogAmt += Number(data[i].paymentLog[m].amount);
                  //also call break as there is only one paymentLog for one voucherId.
                }

              }
              var query1 = { $set: { 'transactionData.adminBalance': Number(data[i].transactionData.balance) + paymentLogAmt ,'state':"OPEN" } }
              var query2 = { $pull: { 'paymentLog': { id: vochID } } }
            } else if (role == 'UO' && data[i].type == 'EXPENSE') {
              var query1 = { $set: { 'transactionData.adminBalance': Number(data[i].transactionData.balance) + paymentLogAmt, 'transactionData.balance': Number(data[i].transactionData.balance) + paymentLogAmt ,'state':"OPEN" } }
              var query2 = { $pull: { 'paymentLog': { id: vochID } } }
            }
            else {
              var paymentLogAmt = 0;
              for (var m = 0; m < data[i].paymentLog.length; m++) {
                console.log(data[i].paymentLog[m].id);
                console.log(vochID);
                if (data[i].paymentLog[m].id.equals(vochID)) {
                  paymentLogAmt += Number(data[i].paymentLog[m].amount);
                }
              }
              if (data[i].type == 'Sales Invoice' ||data[i].type == 'General Invoice' ) {
                 var query1 = { $set: { 'balance': Number(data[i].balance) + Number(paymentLogAmt) ,'state':"OPEN" } }
               
                 var query2 = { $pull: { 'paymentLog': { id: vochID } } }
              }else{
                 var query1 = { $set: { 'transactionData.balance': Number(data[i].balance) + Number(paymentLogAmt),'state':"OPEN"  } }
                 var query2 = { $pull: { 'paymentLog': { id: vochID } } }
              }

            }
            //update balance..
            //console.log(data[i].id);

            collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query1, function (err, instance) {
              if (instance) {
                console.log(instance.result);
              }
            });
            //pull paymentlog..
            collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query2, function (err, instance) {
              if (instance) {
                console.log(instance.result);
              }

            });
          }
          if (callback) callback();
        });
      }
    });
    //});
  }

  "update voucherTransaction"
  function updateTransactions(data, date, vochNo, vochID, role,custom) {
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
      for (var i = 0; i < data.length; i++) {
         if(custom == true){
         var query1 = { $set: { 'customBalance': Number(data[i].balance) } }
          var query2 = { $push: { 'customPaymentLog': { id: vochID, date: date, vochNo: vochNo, amount: data[i].amountPaid,interest:data[i].interest, isUo: false } } }
        }else{
        if (role == 'UO') {
          if (data[i].type == 'Purchase Invoice')
            var query1 = { $set: { 'transactionData.adminBalance': Number(data[i].balance),'transactionData.adminBalanceInDollar':  Number(data[i].balanceInDollar)} };
          else if (data[i].type == 'EXPENSE')
            var query1 = { $set: { 'transactionData.adminBalance': Number(data[i].balance), 'transactionData.balance': Number(data[i].balance) } };
          else
            var query1 = { $set: { balance: Number(data[i].balance) ,state:"PAID"} }
          var query2 = { $push: { 'paymentLog': { id: vochID, date: date, vochNo: vochNo, amount: data[i].amountPaid,interest:data[i].interest ,isUo: true } } }

          if(data[i].type == "Interest"){
            var query1 = { $set: { balance: Number(data[i].balance),state:"PAID" } }
          var query2 = { $push: { 'paymentLog': { id: vochID, date: date, vochNo: vochNo, amount: data[i].amountPaid ,isUo: true } } }
        }
        }
        
        else {
           if (data[i].type == 'Sales Invoice' || data[i].type == "General Invoice"){
                var query1 = { $set: { balance: Number(data[i].balance),state:"PAID" } }
                var query2 = { $push: { 'paymentLog': { id: vochID, date: date, vochNo: vochNo, amount: data[i].amountPaid ,isUo: false } } }
            }else{
                var query1 = { $set: { 'transactionData.balance': Number(data[i].balance) ,state:"PAID",'transactionData.balanceInDollar':  Number(data[i].balanceInDollar)} }
                var query2 = { $push: { 'paymentLog': { id: vochID, date: date, vochNo: vochNo, amount: data[i].amountPaid,interest:data[i].interest, isUo: false } } }
            }
          }
        }
       
        //_id: new mongodb.ObjectId(id)
        collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query1, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }
        });
        collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query2, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }

        });
      }

    });
  }
  "payment voucherTransaction"
  router.post('/payment', function (req, res) {
    var data = req.body;
    var custom = req.query.custom
    console.log(custom)
    console.log("payment voucher".green,data)
    //createPayment(data,true);
    var id = req.query.id
   
    //var data = req.body;
    //console.log(req.body);
    if (id != 'null') {
      //var query = { id: id }
      updatePayment(req.body, id, res,custom);
       var activity = "Payment Updated"
      activityLog(data.username,activity,data.vochNo,data.compCode)
      //res.send({status:'200'});
    }
    else {
      createPayment(data, res,custom);
      //res.send({status:'200'});
       var activity = "Payment Created"
      activityLog(data.username,activity,data.vochNo,data.compCode)
    }

  });
  function updatePayment(data, id, res,custom, callback) {
    console.log(id);
   var instanceId =  ObjectID(id)
    voucherTransaction.update({ _id: instanceId }, data, function (err, instance) {
      if (err)
        console.log(err);
      else {
        updateBalanceAndTransactionLog(instanceId, data.role, function () {
          var ledger = [];
          if (data.role == 'UO') {
            for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
              var bill = data.vo_payment.billDetail[m];
              if (bill.interest) {
                if (bill.interest > 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Receivable", debit: Math.abs(Number(bill.interest)), voRefId:id, isUo: true, visible: data.visible },
                    { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Receivable", credit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible });
                } else if (bill.interest < 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Payable", debit: Math.abs(Number(bill.interest)), voRefId: id, isUo: true, visible: data.visible },
                    { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Payable", credit: Math.abs(Number(bill.interest)), voRefId:id, isUo: true, visible: data.visible });
                }
              }
            }
            ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: id, isUo: true, visible: data.visible },
              { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.totalBankAmount), voRefId: id, isUo: true, visible: data.visible }
            )
            console.log(ledger);
            if(data.forexAmount && data.forexCredit == true){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: id, isUo: true, visible: data.visible },
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: id, isUo: true, visible: data.visible }
               )
            }
             if(data.forexAmount && data.forexCredit == false){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: id, isUo: true, visible: data.visible },
              { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: id, isUo: true, visible: data.visible }
            )
          }
            
           ledger.push(createBankChargesLedger(data,id));

            accountEntry(ledger, true, instanceId);
          }
          else if (data.role == 'O') {
            for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
              var bill = data.vo_payment.billDetail[m];
              if (bill.interest) {
                if (bill.interest > 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Receivable", debit: Math.abs(Number(bill.interest)), voRefId: id, isUo: false, visible: data.visible },
                    { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Receivable", credit: Math.abs(Number(bill.interest)), voRefId: id, isUo: false, visible: data.visible });
                } else if (bill.interest < 0) {
                  ledger.push(
                    { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Payable", debit: Math.abs(Number(bill.interest)), voRefId: id, isUo: false, visible: data.visible },
                    { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Payable", credit: Math.abs(Number(bill.interest)), voRefId: id, isUo: false, visible: data.visible });
                }
              }
            }
            ledger.push({ accountName: data.vo_payment.partyAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: id, isUo: false, visible: data.visible },
              { accountName: data.vo_payment.bankAccountId, date: data.date, compCode: data.compCode, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.totalBankAmount), voRefId: id, isUo: false, visible: data.visible }
            )
             
              ledger.push(createBankChargesLedger(data,id));
              accountEntry(ledger, false, instanceId);
              console.log(ledger);
               if(data.forexAmount && data.forexCredit == true){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: id, isUo: false, visible: data.visible },
                { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: id, isUo: false, visible: data.visible }
            )
               }
             if(data.forexAmount && data.forexCredit == false){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: id, isUo: false, visible: data.visible },
              { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: id, isUo: false, visible: data.visible }
            )
          }
            

          }
          if(custom == "true"){
          updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, new mongodb.ObjectId(id), data.role,true);
        }
        else{
         updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, new mongodb.ObjectId(id), data.role);
        }
          if (res) res.send(instance);
          if (callback) callback();
        });
      }

    });
  }
  function createPayment(data, res,custom, callback) {
    voucherTransaction.create(data,  function (err, instance) {
      if (instance) {
       
        console.log(custom)
        var vochID = instance.id
        var instanceId =  ObjectID(instance.id)
        //res.send(instance);
        var ledger = [];
        if (data.role == 'UO') {
          for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
            var bill = data.vo_payment.billDetail[m];
            if (bill.interest) {
              if (bill.interest > 0) {
                ledger.push(
                  { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Receivable", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: true },
                  { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Receivable", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: true });
              } else if (bill.interest < 0) {
                ledger.push(
                  { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Payable", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: true },
                  { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Payable", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: true, visible: true });
              }
            }
          }
          ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: instance.id, isUo: true, visible: true },
            { accountName: data.vo_payment.bankAccountId,  compCode: data.compCode,date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.totalBankAmount), voRefId: instance.id, isUo: true, visible: true }
          )
         ledger.push(createBankChargesLedger(data,instance.id));
          accountEntry(ledger, true, instanceId);
           if(data.forexAmount && data.forexCredit == true){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: instance.id, isUo: true, visible: true },
               { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: instance.id, isUo: true, visible: true }
            )
           }
             if(data.forexAmount && data.forexCredit == false){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: instance.id, isUo: true, visible: true },
                 { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: instance.id, isUo: true, visible: true }
            )
          }
            
        }
        if (data.role == 'O') {
          for (var m = 0; m < data.vo_payment.billDetail.length; m++) {
            var bill = data.vo_payment.billDetail[m];
            if (bill.interest) {
              if (bill.interest > 0) {
                ledger.push(
                  { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Receivable", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false },
                  { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Receivable", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false });
              } else if (bill.interest < 0) {
                ledger.push(
                  { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Interest Payable", debit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false },
                  { accountName: data.vo_payment.bankAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: "Interest Payable", credit: Math.abs(Number(bill.interest)), voRefId: instance.id, isUo: false });
              }
            }
          }
          ledger.push({ accountName: data.vo_payment.partyAccountId, compCode: data.compCode,date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: instance.id, isUo: false },
            { accountName: data.vo_payment.bankAccountId,compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.totalBankAmount), voRefId: instance.id, isUo: false }
          )
           ledger.push(createBankChargesLedger(data,instance.id));
          accountEntry(ledger, false, instanceId);
           if(data.forexAmount && data.forexCredit == true){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: instance.id, isUo: false},
               { accountName: data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.amount), voRefId: instance.id, isUo: false}
            )

           }
             if(data.forexAmount && data.forexCredit == false){
               ledger.push({ accountName: data.vo_payment.forexAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.partyAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.forexAmount), voRefId: instance.id, isUo: false },
               { accountName:data.vo_payment.partyAccountId, compCode: data.compCode, date: data.date, particular: data.vo_payment.forexAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.forexAmount), voRefId: instance.id, isUo: false }
            )
          }
            

        }
         if(custom == "true"){
          updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, new mongodb.ObjectId(instance.id), data.role,true);
        }else{
         updateTransactions(data.vo_payment.billDetail, data.date, data.vochNo, new mongodb.ObjectId(instance.id), data.role);
        }
        if (res) res.send(instance);
        if (callback) callback();
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
          console.log("\n" + entry);
          if (err)
            console.log(err);
          else {
            var logs = [];
            if (entry.statusTransaction)
              logs = entry.statusTransaction;
            logs.push(log);
            console.log(logs);
            collection.update({ _id: objectId }, { $set: { currentStatus: data.status, statusTransaction: logs } }, { upsert: true }, function (err, instance) {
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

  //change sale inventory status
   router.post('/changeStatus', function (req, res) {
    var data = req.body
    Inventory.getDataSource().connector.connect(function (err, db) {
      var salesTransaction = data.salesTransaction
      var arrayIndex = data.arrayIndex
        salesTransaction.id = new mongodb.ObjectId(data.salesTransaction.id)
       var query = { $pull: { 'salesTransaction': { id: new mongodb.ObjectId(data.ids) } } }
        var collection = db.collection('inventory');
        collection.update({ _id: new mongodb.ObjectId(data.id) }, query, function (err, instance) {
          if (instance) {
            console.log(instance.result);
             collection.update({ _id: new mongodb.ObjectId(data.id)}, { $push: {'salesTransaction': salesTransaction } }, function (err, instance) {
              if (err)
                console.log(err)
              else {
                console.log("remark added");
                console.log(instance.result);
              }
         });
          }
        });
    });
    res.send({ status: '200' });
  });


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
    var compCode = req.query.compCode;
    var columns = req.query.columns;
    var group = req.query.group;
   // console.log(group);

    Inventory.getDataSource().connector.connect(function (err, db) {
      if (err) console.log(err);
      else {
        var collection = db.collection('inventory');
        collection.aggregate({ $match: { visible: visible == 'true',compCode:compCode } }, { "$group": { "_id": JSON.parse(group) } }, function (err, instance) {
          if (err) console.log(err);
          else {
            //console.log(instance);
           // console.log(instance.length);
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
        collection.aggregate({ $match: { visible: visible == 'false' } }, { "$group": { "_id": JSON.parse(group) } }, function (err, instance) {
          if (err) console.log(err);
          else {
           // console.log(instance);
            res.send(instance);
          }
        });
      }
    });
  });

  function validateAvailableQtyOnCreate(data, res, callback) {
    var aggLineItems = data.aggLineItems;
    var obj_ids = aggLineItems.map(function (item) { return ObjectID(item.id) });
    console.log(obj_ids);
    Inventory.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      collection.find({ "_id": { "$in": obj_ids }, "BALANCE": { $gt: 0 } }).toArray(function (err, result) {
        console.log(result);
        if (aggLineItems.length > result.length) {
          //return error.....
          console.log("balance low");
          res.send({ err: "low balance", status: 200 });
          return;
        } else {
          for (var i = 0; i < aggLineItems.length; i++) {
            var match = utils.getItembyId(result, aggLineItems[i].id);
            if (match) {
              //var match= getItembyId(aggLineItems[i].id, result);
              if (match.BALANCE < aggLineItems[i].sum) {
                //return err and break for loop
                res.send({ err: "low balance", status: 200 });
                return;
              }
            }
          }
          if (callback) callback();
        }
      });

    });
  }
  function validateAvailableQtyOnUpdate(data, id, res, callback) {
    var aggLineItems = data.aggLineItems;
    var obj_ids = aggLineItems.map(function (item) { return ObjectID(item.id) });
    console.log(obj_ids);
    Inventory.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      collection.find({ "_id": { "$in": obj_ids } }).toArray(function (err, result) {
        console.log("inv Data".green,result);
        voucherTransaction.findOne({ "where": { "_id": ObjectID(id) } }, { invoiceData: 1 }, function (err, resultOld) {
          if (err) {

            console.log(err);
          } else {
            if(data.role == "O"){
                var oldbillData = resultOld.invoiceData.billData;
            }
            else{
                var oldbillData = resultOld.invoiceData.billDataUo
                if(oldbillData == undefined){
                  oldbillData = []

                }
            }
           if(oldbillData.length == 0){
                if (callback) callback(oldbillData);
            }else{
           
            for (var m = 0; m < result.length; m++) {
              var match = utils.getItembyId2(oldbillData, result[m]._id);
              if (match) {
                result[m].BALANCE = result[m].BALANCE + Number(match.itemQty);
              }
            }
            if (aggLineItems.length > result.length) {
              //return error.....
              console.log("balance low");
              res.send({ err: "low balance", status: 200 });
              return;
            } else {
              for (var i = 0; i < aggLineItems.length; i++) {
                var match = utils.getItembyId(result, aggLineItems[i].id);
                if (match) {
                  //var match= getItembyId(aggLineItems[i].id, result);
                  if (match.BALANCE < aggLineItems[i].sum) {
                    //return err and break for loop
                    res.send({ err: "low balance", status: 200 });
                    break;
                  }
                }
              }

            }
            //if (res.headersSent) return;
            if (callback) callback(oldbillData);
            }
          }
        });
      });

    });
  }
    "Save General Invoice"
  router.post('/generalInvoiceVoucher', function (req, res) {
    var data = req.body
    var id = req.query.id;
    if (id == 'null') {
      validateAvailableQtyOnCreate(data, res, function () {
        createGeneralInvoiceVoucher(data, res);
      });
    } else {
      voucherTransaction.findOne({ "where": { type: data.type, id: id } }, function (err, instance, count) {
        if (err) {
          console.log(err)
        }
        else {
          console.log(instance)
          if (instance) {
            //also check is there any receipt against this invoice then send err message invoice has some receipts.
            if (instance.paymentLog && instance.paymentLog.length > 0) {
              res.send({ err: "Receipt exists", status: 200 });
              return;
            } else {
              validateAvailableQtyOnUpdate(data, id, res, function (result) {
                updateGeneralInvoiceVoucher(data, id, result, res);
              });
              //updateVoucher(data, id);
            }
          }
        }
      });
    }
  });

  "create voucher"
  function createGeneralInvoiceVoucher(data, res) {
    delete data.aggLineItems;
    voucherTransaction.create(data, function (err, instance) {
      if (err) {
        console.log(err);
      }
      else {
        console.log("voucher created")
        console.log(instance)
        if (data.role == 'UO') { //Sales Invoice can be created by Un Official
          var invData = data.invoiceData.billData;
          var vochNo = data.vochNo
          var date = data.date
          var id = instance.id
          var accountData = data.invoiceData.accountlineItem;
          var ledger = [];
          if (accountData) {
            for (var i = 0; i < accountData.length; i++) {
              ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: instance.id, isUo: false,visible: true })
            }
          }
          ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: false, visible: true, compCode: data.compCode },
            { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: false, visible: true, compCode: data.compCode }

          )
          accountEntry(ledger, false, instance.id);
          updateInventoryValueOnCreate(invData, id, date, vochNo);
        }
        console.log({ "message": "voucher Created", "id": instance.id });
        res.send({ "message": "voucher Created", "id": instance.id });
      }

    });
  }
  "update voucherTransaction"
  function updateGeneralInvoiceVoucher(data, id, dataOld, res) {
    if (id) {
      var query = { id: id }
    }
    else {
      query = { vochNo: data.vochNo }
    }
    //update inventory and balance and pull transactionLog.....
    reversingSalesTransactionLogOfCreate(ObjectID(id), dataOld, function () {
      delete data.aggLineItems;
      voucherTransaction.update(query, data, function (err, instance) {
        if (err) {
          console.log(err)
        }
        else {
          console.log(instance);
          if (data.role == 'UO') {
            var invDataSales = data.invoiceData.billData;
            var vochNo = data.vochNo
            var date = data.date
            var accountData = data.invoiceData.accountlineItem;
            var accountData = data.invoiceData.accountlineItem;
            var objectId = new mongodb.ObjectId(id)
            var ledger = [];
            if (accountData) {
              for (var i = 0; i < accountData.length; i++) {
                ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(accountData[i].amount), voRefId: objectId, isUo: false, visible: true, compCode: data.compCode })
              }
            }
            ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: false, visible: true, compCode: data.compCode },
              { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: false, visible: true, compCode: data.compCode }

            )
            console.log(ledger);
            accountEntry(ledger, false, objectId);
            updateInventoryValueOnCreate(invDataSales, ObjectID(id), date, vochNo);

          }
          console.log({ "message": "voucher Updated", "id": id });
          res.send({ "message": "voucher Updated", "id": id });
        }
      });
    });

  }
  "save voucherTransaction"
  router.post('/salesInvoiceVoucher', function (req, res) {
    var data = req.body
    var id = req.query.id;
    // if (id) {
    //   var query = {type:data.type, id: "6913f4be1402843c38fceb1e" }
    // }
    // else {
    //   query = { type:data.type,vochNo: data.vochNo }
    // }

    if (id == 'null') {
      validateAvailableQtyOnCreate(data, res, function () {
        createSalesInvoiceVoucher(data, res);
          var activity = "Sales Invoice Created"
            activityLog(data.username,activity,data.vochNo,data.compCode)
      });
    } else {
      voucherTransaction.findOne({ "where": { type: data.type, id: id } }, function (err, instance, count) {
        if (err) {
          console.log(err)
        }
        else {
          //count = instance;
          console.log(instance)
          if (instance) {
            //res.send({ err: "update failed", status: 200 });
            //also check is there any receipt against this invoice then send err message invoice has some receipts.
            if (instance.paymentLog && instance.paymentLog.length > 0) {
              res.send({ err: "Receipt exists", status: 200 });
              return;
            } else {
              validateAvailableQtyOnUpdate(data, id, res, function (result) {
                updateSalesInvoiceVoucher(data, id, result, res);
                 var activity = "Sales Invoice Updated"
                    activityLog(data.username,activity,data.vochNo,data.compCode)
              });
              //updateVoucher(data, id);
            }
          }
        }
      });
    }
  });

  "create voucher"
  function createSalesInvoiceVoucher(data, res) {
    delete data.aggLineItems;
    voucherTransaction.create(data, function (err, instance) {
      if (err) {
        console.log(err);
      }
      else {
        var roundOffId = "5937a9728f7bac6f9a4d6d96"
        console.log("voucher created")
        console.log(instance)
        if (data.role == 'O') { //Sales Invoice can be created by Official
          var invData = data.invoiceData.billData;
          var vochNo = data.vochNo
          var date = data.date
          var id = instance.id
          var accountData = data.invoiceData.accountlineItem;
          var ledger = [];
        if(Number(data.roundOff) != 0){
            console.log("roundOff".magenta , data.roundOff)
            if(data.roundOff<0){
              var roundoff = Math.abs(data.roundOff);
               ledger.push({ accountName: roundOffId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, debit: Number(roundoff), voRefId: instance.id, isUo: false, visible: false, compCode: data.compCode })
            }else{
              var roundoff = Math.abs(data.roundOff);
                ledger.push({ accountName: roundOffId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(roundoff), voRefId: instance.id, isUo: false, visible: false, compCode: data.compCode })
            }

          }
          if (accountData.length>0) {
            for (var i = 0; i < accountData.length; i++) {
              ledger.push({ accountName: accountData[i].account.id, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: instance.id, isUo: false,compCode:data.compCode })
            }
          }
          ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.salesledgerAmount), voRefId: instance.id, isUo: false, visible: false, compCode: data.compCode },
            { accountName: data.invoiceData.consigneeAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: false, visible: false, compCode: data.compCode }

          )
          accountEntry(ledger, false, instance.id);
          updateInventoryValueOnCreate(invData, id, date, vochNo);
        }
        //uo

         if (data.role == 'UO') { //Sales Invoice can be created by Un Official
          var invData = data.invoiceData.billDataUo;
          var vochNo = data.vochNo
          var date = data.date
          var id = instance.id
          var accountData = data.invoiceData.accountlineItem;
          var ledger = [];
          if (accountData.length>0) {
            for (var i = 0; i < accountData.length; i++) {
              ledger.push({ accountName: accountData[i].account.id, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: instance.id, isUo: true,visible: true })
            }
          }
          ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.salesledgerAmount), voRefId: instance.id, isUo: true, visible: true, compCode: data.compCode },
            { accountName: data.invoiceData.consigneeAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: instance.id, isUo: true, visible: true, compCode: data.compCode }

          )
           accountEntry(ledger, true, instance.id);
          updateInventoryValueOnCreate(invData, id, date, vochNo);
         }
       

        console.log({ "message": "voucher Created", "id": instance.id });
        res.send({ "message": "voucher Created", "id": instance.id });
      }

    });
  }
  "update voucherTransaction"
  function updateSalesInvoiceVoucher(data, id, dataOld, res) {
    if (id) {
      var query = { id: id }
    }
    else {
      query = { vochNo: data.vochNo }
    }
    //update inventory and balance and pull transactionLog.....
    reversingSalesTransactionLogOfCreate(ObjectID(id), dataOld, function () {
      delete data.aggLineItems;
      voucherTransaction.update(query, data, function (err, instance) {
        if (err) {
          console.log(err)
        }
        else {
           var roundOffId = "5937a9728f7bac6f9a4d6d96"
          console.log(instance);
          if (data.role == 'O') {
            var invDataSales = data.invoiceData.billData;
            var vochNo = data.vochNo
            var date = data.date
            var accountData = data.invoiceData.accountlineItem;
          //  var accountData = data.invoiceData.accountlineItem;
            var objectId = new mongodb.ObjectId(id)
            var ledger = [];
            if(Number(data.roundOff) != 0){
            if(data.roundOff<0){
              var roundoff = Math.abs(data.roundOff);
               ledger.push({ accountName: roundOffId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, debit: Number(roundoff), voRefId: objectId, isUo: false, visible: false, compCode: data.compCode })
            }else{
              var roundoff = Math.abs(data.roundOff);
                ledger.push({ accountName: roundOffId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(roundoff), voRefId: objectId, isUo: false, visible: false, compCode: data.compCode })
            }

          }
            if (accountData.length>0) {
              for (var i = 0; i < accountData.length; i++) {
                ledger.push({ accountName: accountData[i].account.id, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: objectId, isUo: false, visible: false, compCode: data.compCode })
              }
            }
            ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.salesledgerAmount), voRefId: objectId, isUo: false, visible: false, compCode: data.compCode },
              { accountName: data.invoiceData.consigneeAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: false, visible: false, compCode: data.compCode }

            )
            console.log(ledger);
            accountEntry(ledger, false, objectId);
            updateInventoryValueOnCreate(invDataSales, ObjectID(id), date, vochNo);

          }
             if (data.role == 'UO') { //Sales Invoice can be created by Un Official
          var invDataSales = data.invoiceData.billDataUo;
           var vochNo = data.vochNo
            var date = data.date
            var accountData = data.invoiceData.accountlineItem;
           // var accountData = data.invoiceData.accountlineItem;
            var objectId = new mongodb.ObjectId(id)
            var ledger = [];
          if (accountData.length>0) {
            for (var i = 0; i < accountData.length; i++) {
              ledger.push({ accountName: accountData[i].account.id, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(accountData[i].amount), voRefId: objectId, isUo: true,visible: true ,compCode: data.compCode})
            }
          }
          ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.consigneeAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.salesledgerAmount), voRefId: objectId, isUo: true, visible: true, compCode: data.compCode },
            { accountName: data.invoiceData.consigneeAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: true, visible: true, compCode: data.compCode }

          )
           accountEntry(ledger, true, objectId);
            updateInventoryValueOnCreate(invDataSales, ObjectID(id), date, vochNo);
             }
          // if (data.role == 'UO') {
          //   var invDataSales = data.invoiceData.billData;
          //   var vochNo = data.vochNo
          //   var date = data.date
          //   var accountData = data.invoiceData.accountlineItem;
          //   var objectId = new mongodb.ObjectId(id)
          //   var ledger = [];
          //   if (accountData) {
          //     for (var i = 0; i < accountData.length; i++) {
          //       ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(accountData[i].amount), voRefId: objectId, isUo: true, visible: true, compCode: data.compCode })
          //     }
          //   }
          //   ledger.push({ accountName: data.invoiceData.ledgerAccountId, date: data.date, particular: data.invoiceData.customerAccountId, refNo: data.vochNo, voType: data.type, credit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: true, visible: true, compCode: data.compCode },
          //     { accountName: data.invoiceData.customerAccountId, date: data.date, particular: data.invoiceData.ledgerAccountId, refNo: data.vochNo, voType: data.type, debit: Number(data.invoiceData.saleAmount), voRefId: objectId, isUo: true, visible: true, compCode: data.compCode }

          //   )
          //   accountEntry(ledger, true, objectId);
          //   updateInventorySales(invDataSales, id, date, vochNo);
          // }
          console.log({ "message": "voucher Updated", "id": id });
          //if (res.headersSent) return;

          res.send({ "message": "voucher Updated", "id": id });
        }
      });
    });

  }

  "update inventory balance"
  function reversingSalesTransactionLogOfCreate(vochID, dataOld, callback) {
    if(dataOld.length == 0){
      if (callback) callback();
    }else{
    console.log(vochID);
    Inventory.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      for (var i = 0; i < dataOld.length; i++) {
        var query = { $pull: { 'salesTransaction': { id: vochID } } }
       var query1 = { $inc: { BALANCE: Number(dataOld[i].itemQty) } };
        collection.update({ _id: new mongodb.ObjectId(dataOld[i].id) }, query1, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }
        });
        collection.update({ _id: new mongodb.ObjectId(dataOld[i].id) }, query, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }
        });
      }
      if (callback) callback();
    });
    }
  }
  "update inventory balance"
  function updateInventoryValueOnCreate(data, id, date, vochNo) {
    Inventory.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      for (var i = 0; i < data.length; i++) {
        var query = { $push: { 'salesTransaction': { id: id, date: date, vochNo: vochNo, saleQty: data[i].itemQty,itemRate:data[i].itemRate } } }
        var query1 = { $inc: {BALANCE: -Number(data[i].itemQty) } };
        collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query1, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }
        });
        collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query, function (err, instance) {
          if (instance) {
            console.log(instance.result);
          }
        });
      }
    });
  }

  "update salesTransaction data in Inventory"
  function updateInventorySales(data, id, date, vochNo) {
    console.log(data);
    Inventory.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('inventory');
      for (var i = 0; i < data.length; i++) {
        var sum = 0;
        console.log(i);
        console.log(data[i]);
        if (data[i].salesTransaction) {
          for (var j = 0; j < data[i].salesTransaction.length; j++) {
            if (data[i].salesTransaction[j].id != id) {
              var sum = sum + Number(data[i].salesTransaction[j].saleQty)
            }
          }
          var invBalance = sum + Number(data[i].itemQty);
          collection.update(
            { _id: new mongodb.ObjectId(data[i].id), "salesTransaction.id": new mongodb.ObjectId(id) },
            { $set: { "salesTransaction.$.saleQty": data[i].itemQty, "BALANCE": invBalance } }

            , function (err, instance) {
              if (instance) {
                console.log(instance.result);
              }

            });
        } else {
          var invBalance = data[i].itemQty;
          var query = { $push: { 'salesTransaction': { id: id, date: date, vochNo: vochNo, saleQty: data[i].itemQty,itemRate:data[i].itemRate,isUo: true } } }
          var query1 = { $set: { "BALANCE": invBalance } }
          collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query1, function (err, instance) {
            if (instance) {
              console.log(instance.result);
            }
          });
          collection.update({ _id: new mongodb.ObjectId(data[i].id) }, query, function (err, instance) {
            if (instance) {
              console.log(instance.result);
            }
          });

        }
      }

    });
  }

  "Get outstanding voucher detail by customer name "
  router.get('/getVoucherData', function (req, res) {
    var customerId = req.query.customerId;
    //var usertype=req.query.usertype;
    //var type=req.query.type;  
    console.log(customerId);
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
      collection.aggregate(
        { $match: { customerId: customerId } },
        { $match: { balance: { $gt: 0 } } },
        {
          $project: {
            date: "$date",
            duedate: "$duedate",
            amount: "$amount",
            vochNo: "$vochNo",
            type: "$type",
            balance: "$balance",
            invoiceData: "$invoiceData",
            vo_badla: "$vo_badla",
            id: "$_id"
          }
        }
        , function (err, instance) {
          if (instance) {
            res.send(instance)
          }
          else
            console.log(err);
        });
    });
  });
  "Get outstanding voucher for payment by accountId "
  router.get('/getVouchersforPayment', function (req, res) {
    var supliersId = req.query.customerId;
    var usertype = req.query.role;
    var compCode = req.query.compCode
    console.log(supliersId);
    if (usertype == 'UO') {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { 'transactionData.supliersId': supliersId } },
          { $match: { 'transactionData.adminBalance': { $gt: 0 } } },
           { $match: { compCode: compCode }},
          { $match: { type: { $in: ["Purchase Invoice", "EXPENSE"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$transactionData.billDueDate",
              amount: "$transactionData.adminAmount",
              amountInDollar: "$transactionData.adminAmountInDollar",
              balanceInDollar: "$transactionData.adminBalanceInDollar", 
              vochNo: "$vochNo",
              type: "$type",
              balance: "$transactionData.adminBalance",
              exchangeRate:"$ExchangeRate",
              invoiceType: "$transactionData.invoiceType",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    } else {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { 'transactionData.supliersId': supliersId } },
          { $match: { 'transactionData.balance': { $gt: 0 } } },
           { $match: { compCode: compCode }},
          { $match: { type: { $in: ["Purchase Invoice", "EXPENSE"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$transactionData.billDueDate",
              amount: "$transactionData.amount",
              amountInDollar: "$transactionData.amountInDollar",
              balanceInDollar: "$transactionData.balanceInDollar", 
              vochNo: "$vochNo",
              type: "$type",
              balance: "$transactionData.balance",
              exchangeRate:"$transactionData.ExchangeRate",
              invoiceType: "$transactionData.invoiceType",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    }
  });

   "Get outstanding custom for payment by accountId "
  router.get('/getVouchersforCustomPayment', function (req, res) {
    var supliersId = req.query.customerId;
    var usertype = req.query.role;
    var compCode = req.query.compCode
    console.log(supliersId);
    if (usertype == 'O') {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
         
          { $match: { customBalance: { $gt: 0 } } },
           { $match: { compCode: compCode }},
          { $match: { type: "Purchase Invoice" } },
          {
            $project: {
              date: "$date",
              duedate: "$transactionData.billDueDate",
              amount: "$customAmount",
              vochNo: "$vochNo",
              type: "$type",
              custom:"$transactionData.invoiceType",
              balance: "$customBalance",
              invoiceType: "$transactionData.invoiceType",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    } 
  });
  "Get outstanding voucher for recipt by accountId "
  router.get('/getVouchersforReceipt', function (req, res) {
    var customerId = req.query.customerId;
    var usertype = req.query.role;
    var compCode = req.query.compCode
    console.log(customerId);
    if (usertype == 'UO') {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { customerId: customerId } },
          { $match: { balance: { $gt: 0 } } },
           { $match: { compCode: compCode} },
          { $match: { type: { $in: ["General Invoice", "Badla Voucher","Interest"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$duedate",
              amount: "$amount",
              vochNo: "$vochNo",
              type: "$type",
              balance: "$balance",
              invoiceData: "$invoiceData",
              vo_badla: "$vo_badla",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    } else {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { customerId: customerId } },
          { $match: { balance: { $gt: 0 } } },
           { $match: { compCode: compCode} },
          { $match: { type: { $in: ["Sales Invoice","Interest"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$duedate",
              amount: "$amount",
              vochNo: "$vochNo",
              type: "$type",
              balance: "$balance",
              invoiceData: "$invoiceData",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    }
  });

  "Get outstanding voucher for recipt by invoice no and account Id "
  router.get('/getVouchersforReceiptByNo', function (req, res) {
    var customerId = req.query.customerId;
    var usertype = req.query.role;
    var compCode = req.query.compCode
     var vochNo = req.query.vochNo
    console.log(customerId);
    if (usertype == 'UO') {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { customerId: customerId } },
          { $match: { balance: { $gt: 0 } } },
           { $match: { compCode: compCode} },
           { $match: { vochNo: vochNo} },
          { $match: { type: { $in: ["General Invoice", "Badla Voucher","Interest"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$duedate",
              amount: "$amount",
              vochNo: "$vochNo",
              type: "$type",
              balance: "$balance",
              invoiceData: "$invoiceData",
              vo_badla: "$vo_badla",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    } else {
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.aggregate(
          { $match: { customerId: customerId } },
          { $match: { balance: { $gt: 0 } } },
           { $match: { compCode: compCode} },
            { $match: { vochNo: vochNo} },
          { $match: { type: { $in: ["Sales Invoice","Interest"] } } },
          {
            $project: {
              date: "$date",
              duedate: "$duedate",
              amount: "$amount",
              vochNo: "$vochNo",
              type: "$type",
              balance: "$balance",
              invoiceData: "$invoiceData",
              id: "$_id"
            }
          }
          , function (err, instance) {
            if (instance) {
              res.send(instance)
            }
            else
              console.log(err);
          });
      });
    }
  });


  "get key value pair of account"
  router.get('/getAccountNameById', function (req, res) {
    Accounts.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('account');
      collection.aggregate(
        {
          $project: {
            accountName: "$accountName",
          }
        }
        , function (err, instance) {
          if (instance) {
            res.send(instance)
          }
          else
            console.log(err);
        });
    });
  })

  "get starting openingBalance of an account"
  router.get('/getStartingBalance/:accountName', function (req, res) {
    var compCode = req.query.compCode
    var accountName = req.params.accountName
    console.log(compCode, accountName)
    Accounts.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('account');
      Accounts.find({ where: { accountName: accountName } }, function (err, instance) {
        if (instance) {
          console.log("accountData", instance)
          res.send(instance);
        }
      });
    });
  });
  "get openingBalance of a particular account"
  router.post('/getOpeningBalnceByAccountName/:compCode', function (req, res) {
    var compCode = req.body
    var accountName = req.query.accountName
    var toDate = new Date(req.query.date);
    var role = req.query.role;
    console.log(toDate)
    Ledgers.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('ledger');
      if (role == 'UO') {
        collection.aggregate(
          { $match: { date: { $lte: toDate }, compCode: { $in: compCode }, visible: true, accountName: accountName } },
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          },
          function (err, instance) {
            if (instance.length > 0) {
              var openingBalance = { credit: instance[0].credit, debit: instance[0].debit }
              res.send({ openingBalance: openingBalance });
            }
            else {
              res.send("no data");
            }
          });
      }
      if (role == 'O') {
        collection.aggregate(
          { $match: { date: { $lte: toDate }, compCode: { $in: compCode }, isUo: false, accountName: accountName } },
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          },
          function (err, instance) {
            if (instance.length > 0) {
              console.log("closing balance".green, instance)
              var openingBalance = { credit: instance[0].credit, debit: instance[0].debit }
              res.send({ openingBalance: openingBalance });
            }
            else {
              res.send("no data");
            }
          });

      }
    });
  });

  // get opening balance
  router.post('/getOpeningBalnce/:accountName', function (req, res) {
    var compCode = req.body
    var fromDate = new Date(req.query.date)
    var toDate = new Date(req.query.todate)
    var accountName = req.params.accountName
    var role = req.query.role
    console.log(compCode)
    var openingBalnce = function (db, role, compCode, callback) {
      if (role == 'UO') {
        var collection = db.collection('ledger');
        var cursor = collection.aggregate([
          {
            $match: {
              date: { $lte: fromDate },
              accountName: accountName,
              compCode: { $in: compCode },
              visible: true,
              accountName: accountName
            }
          },
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          }
        ]).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }

      if (role == 'O') {
        var collection = db.collection('ledger');
        var cursor = collection.aggregate([
          {
            $match: {
              date: { $lte: fromDate },
              accountName: accountName,
              compCode: { $in: compCode },
              isUo: false,
              accountName: accountName
            }
             
          },
         
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          }
        ]).toArray(function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
      }
    }
      fromDate.setDate(fromDate.getDate()-1);
    var getLedgerData = function (db, role, callback) {
      var ledger;
      if (role == 'UO') {
        var collection = db.collection('ledger');
        var cursor = collection.find({ "accountName": accountName, compCode: { $in: compCode }, date: { $gte: fromDate, $lte: toDate },  visible: true }).sort( { date: -1 } ).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }
      if (role == 'O') {
        var collection = db.collection('ledger');
        var cursor = collection.find({ "accountName": accountName, compCode: { $in: compCode }, date: { $gte: fromDate, $lte: toDate }, isUo: false }).sort( { date: -1 } ).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }
    }
    Ledgers.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('ledger');
     
      openingBalnce(db, role, compCode, function (data) {
        var ledgerOpeningBalnce = {};
        if (data.length > 0) {
          console.log(data)
          ledgerOpeningBalnce = { credit: data[0].credit, debit: data[0].debit }
          console.log("opening balance".green, ledgerOpeningBalnce)
        }
        else {
          ledgerOpeningBalnce =  ledgerOpeningBalnce = { credit: 0, debit: 0 }
        }
        getLedgerData(db, role, function (data) {
          res.send({ openingBalance: ledgerOpeningBalnce, ledgerData: data })
        });
      });
    });
  });

  // getLedgerBybankDate
  router.post('/getLedgerBybankDate/:accountName', function (req, res) {
    var compCode = req.body
    var fromDate = new Date(req.query.date)
    var toDate = new Date(req.query.todate)
    var accountName = req.params.accountName
    var role = req.query.role
    var openingBalnce = function (db, role, compCode, callback) {
      if (role == 'UO') {
        var collection = db.collection('ledger');
        var cursor = collection.aggregate([
          {
            $match: {
              date: { $lte: fromDate },
              accountName: accountName,
              compCode: { $in: compCode },
              visible: true,
              accountName: accountName,
              bankDate: { $exists: false}
            }
          },
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          }
        ]).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }

      if (role == 'O') {
        var collection = db.collection('ledger');
        var cursor = collection.aggregate([
          {
            $match: {
              date: { $lte: fromDate },
              accountName: accountName,
              compCode: { $in: compCode },
              isUo: false,
              accountName: accountName,
               bankDate: { $exists: false}
            }
             
          },
         
          {
            $group:
            {
              _id: { accountName: "$accountName" },
              credit: { $sum: "$credit" },
              debit: { $sum: "$debit" }
            }
          }
        ]).toArray(function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
      }
    }
      fromDate.setDate(fromDate.getDate()-1);
    var getLedgerData = function (db, role, callback) {
      var ledger;
      if (role == 'UO') {
        var collection = db.collection('ledger');
        var cursor = collection.find({ "accountName": accountName, compCode: { $in: compCode }, bankDate: { $exists: false}, date: { $gte: fromDate, $lte: toDate },  visible: true }).sort( { date: -1 } ).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }
      if (role == 'O') {
        var collection = db.collection('ledger');
        var cursor = collection.find({ "accountName": accountName, bankDate: { $exists: false} ,compCode: { $in: compCode }, date: { $gte: fromDate, $lte: toDate }, isUo: false }).sort( { date: -1 } ).toArray(function (err, result) {
          assert.equal(err, null);
          console.log(result);
          callback(result);
        });
      }
    }
    Ledgers.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('ledger');
     
      openingBalnce(db, role, compCode, function (data) {
        var ledgerOpeningBalnce = {};
        if (data.length > 0) {
          console.log(data)
          ledgerOpeningBalnce = { credit: data[0].credit, debit: data[0].debit }
          console.log("opening balance".green, ledgerOpeningBalnce)
        }
        else {
          ledgerOpeningBalnce =  ledgerOpeningBalnce = { credit: 0, debit: 0 }
        }
        getLedgerData(db, role, function (data) {
          res.send({ openingBalance: ledgerOpeningBalnce, ledgerData: data })
        });
      });
    });
  });
 router.post('/ledgerlastentry', function (req, res) {
    var compCode = req.body
    var accountName = req.query.accountName
    var role = req.query.role
    var l;
   var getLastDate = function(db,callback){
       //items.find.sort( [['_id', -1]] ) // get all items desc by created date.
       var collection = db.collection('ledger');
       if (role == 'UO') {
        var cursor = collection.find({compCode: { $in: compCode },voType: { $nin: [ "Balance" ] },accountName:accountName,visible: true},{date:true}).sort( [['date', -1]]).limit(1).toArray(function (err, result) {
          assert.equal(err, null);
          console.log("last Date".red ,result);
          callback(result);
        });
      }
      
       if (role == 'O') {
        var cursor = collection.find({compCode: { $in: compCode }, voType: { $nin: [ "Balance" ] },"accountName":accountName,isUo: false},{date:true}).sort( [['date', -1]]).limit(1).toArray(function (err, result) {
          assert.equal(err, null);
          console.log("last Date".red ,result);
          callback(result);

        });
    }
  }
   voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('ledger');
       getLastDate(db, function (data) {
          if(data.length>0){
               var lastDate = data[0].date
               console.log("lastDate".green ,lastDate)
               res.send({lastDate:lastDate,days:lastDate.getDate()});
          }else{
              var d = new Date()
             res.send({lastDate:new Date(),days:d.getDate()});
          }
      });
   });
 });
  "create Expense and save Expense"
  router.post('/saveExpensetest/:expenseId/:uoVisible', function (req, res) {
    var data = req.body;
    var expenseId = req.params.expenseId;
    var uoVisible = req.params.uoVisible;
    var query;
    if (expenseId != 'null') {
      query = { _id: new mongodb.ObjectId(expenseId) }
    }
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
      if (expenseId != 'null') {
        updateExpence(db, data, function (result) {
          if (result) {
            var isUo
            var activity = "Expense Updated"
             activityLog(data.username,activity,data.vochNo,data.compCode)
            console.log("Expense Updated")
            if (data.role == 'O') {
              isUo = false
            }
            if (data.role == 'UO') {
              isUo = true
            }
            var ledger = createLedgerJsonExpense(data.transactionData, expenseId,uoVisible);
            accountEntry(ledger, isUo, new mongodb.ObjectId(expenseId));
            res.status(200).send(expenseId);
          }
        });
      }
      else {
        createExpence(db, data, function (result) {
          console.log(result.id);
          if (result) {
            if (data.role == 'O') {
              isUo = false
            }
            if (data.role == 'UO') {
              isUo = true
            }
            var activity = "Expense Created"
             activityLog(data.username,activity,data.vochNo,data.compCode)
            console.log("Expense Created")
            var ledger = createLedgerJsonExpense(data.transactionData, result.id);
            accountEntry(ledger, isUo, new mongodb.ObjectId(result.id));
            res.status(200).send(result.id);
          }
        });
      }

    });
    var updateExpence = function (db, expenseData, callback) {
      var collection = db.collection('voucherTransaction');
     voucherTransaction.update(query, expenseData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var createExpence = function (db, expenseData, callback) {
      var collection = db.collection('voucherTransaction');
      voucherTransaction.create(expenseData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }

  });
  "createLedgerJson for expense"
  function createLedgerJsonExpense(data, id,uoVisible) {
    var accountTable = data.accountTable
    var itemTable = data.itemTable
    console.log()
    var ledger = [];
    console.log(uoVisible)
    if (data.role == 'O' && uoVisible == 'false' ) {
      if (data.itemTable.length > 0) {
        ledger.push({ accountName: data.supliersId, date: data.date, particular: itemTable[0].accountId, refNo: data.no, voType: "Expense", credit: data.amount, voRefId: id, isUo: false, visible: false, compCode: data.compCode })
      }
      if (data.tdsAccountId) {
        ledger.push({ accountName: data.tdsAccountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", credit: data.tdsamount, voRefId: id, isUo: false, visible: false, compCode: data.compCode })
      }
      if (data.itemTable.length > 0) {
        for (var i = 0; i < itemTable.length; i++) {
          ledger.push({ accountName: itemTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(itemTable[i].amount), voRefId: id, isUo: false, visible: false, compCode: data.compCode })
        }
      }
      if (data.accountTable.length > 0) {
        for (var i = 0; i < accountTable.length; i++) {
          ledger.push({ accountName: accountTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(accountTable[i].amount), voRefId: id, isUo: false, visible: false, compCode: data.compCode })
        }
      }
       return ledger;
    }
    if (data.role == 'O' ) {
      if (data.itemTable.length > 0) {
        ledger.push({ accountName: data.supliersId, date: data.date, particular: itemTable[0].accountId, refNo: data.no, voType: "Expense", credit: data.amount, voRefId: id, isUo: false, visible: true, compCode: data.compCode })
      }
      if (data.tdsAccountId) {
        ledger.push({ accountName: data.tdsAccountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", credit: data.tdsamount, voRefId: id, isUo: false, visible: true, compCode: data.compCode })
      }
      if (data.itemTable.length > 0) {
        for (var i = 0; i < itemTable.length; i++) {
          ledger.push({ accountName: itemTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(itemTable[i].amount), voRefId: id, isUo: false, visible: true, compCode: data.compCode })
        }
      }
      if (data.accountTable.length > 0) {
        for (var i = 0; i < accountTable.length; i++) {
          ledger.push({ accountName: accountTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(accountTable[i].amount), voRefId: id, isUo: false, visible: true, compCode: data.compCode })
        }
      }
       return ledger;
    }
    if (data.role == 'UO') {
      if (data.itemTable.length > 0) {
        ledger.push({ accountName: data.supliersId, date: data.date, particular: itemTable[0].accountId, refNo: data.no, voType: "Expense", credit: data.amount, voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      }
      if (data.tdsAccountName) {
        ledger.push({ accountName: data.tdsAccountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", credit: data.tdsamount, voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      }
      if (data.itemTable.length > 0) {
        for (var i = 0; i < itemTable.length; i++) {
          ledger.push({ accountName: itemTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(itemTable[i].amount), voRefId: id, isUo: true, visible: true, isUo: true, visible: true, compCode: data.compCode })
        }
      }
      if (data.accountTable.length > 0) {
        for (var i = 0; i < accountTable.length; i++) {
          ledger.push({ accountName: accountTable[i].accountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Expense", debit: Number(accountTable[i].amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
        }
      }
         return ledger;
    }

    
  }
  "save bill new"
  router.post('/saveBillTest/:billId', function (req, res) {
    var data = req.body;
    var compCode = data.compCode
    var billId = req.params.billId;
    var query;
    if (billId != 'null') {
      query = { _id: new mongodb.ObjectId(billId) }
    }
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('voucherTransaction');
      // isBillExist(db, function (result) {
      if (billId != 'null') {
        // if (result > 0) {
        updateBill(db, data, function (result) {
          if (result) {
            console.log("Bill Updated", result)
            var activity = "Purchase Invoice Updated"
            activityLog(data.username,activity,data.vochNo,compCode);
            var lineItem;
            var visible;
            var isUo;
            if (data.role == 'O') {
              lineItem = data.transactionData.manualLineItem
              visible = true;
              isUo = false

            }
            if (data.role == 'UO') {
              lineItem = data.transactionData.itemDetail
              visible = false;
              isUo = true
            }
            var ledger = createLedgerJson(data.transactionData, billId);
            accountEntry(ledger, isUo, billId);
            updateInventory(db, visible, function (result) {
              if (result) {
                console.log("inventory removed")
                isInventoryExist(db, function (result) {
                  console.log("checking inventory ...")
                  if (result > 0) {
                    console.log("inventory Count", result);
                    var inventoryData = createInventoryData(lineItem, visible, data.no, billId, result, compCode);
                    //console.log("inventory data", inventoryData)
                  }
                  else {
                    var inventoryData = createInventoryData(lineItem, visible, data.no, billId, 0, compCode);
                  }
                  createInventory(db, inventoryData, function (result) {
                    if (result) {
                      //console.log("inventory created", result)
                      res.status(200).send(billId);
                    }
                  });
                });
              }
            });
          }
        });
      }

      else {
        createBill(db, data, function (result) {
          if (result) {
            console.log("Bill Created", result)
             var activity = "Purchase Invoice Created"
            activityLog(data.username,activity,data.vochNo,compCode)
            var ledger = createLedgerJson(data.transactionData, result.id);
            accountEntry(ledger, false, new mongodb.ObjectId(result.id));
            var billId = result.id.toHexString();
            var lineItem;
            if (data.role == 'O') {
               visible = true;
              lineItem = data.transactionData.manualLineItem
            }
            if (data.role == 'UO') {
               visible = false;
              lineItem = data.transactionData.itemDetail
            }

            isInventoryExist(db, function (result) {
              console.log("checking inventory ...")
              if (result > 0) {
                console.log(result);
                var inventoryData = createInventoryData(lineItem, visible, data.no, billId, result, compCode);
                console.log("inventory data", inventoryData)
              }
              else {
                var inventoryData = createInventoryData(lineItem, visible, data.no, billId, 0, compCode);
              }

              createInventory(db, inventoryData, function (result) {
                if (result) {
                  console.log("inventory created", result)
                  res.status(200).send(billId);

                }
              });

            });
          }
        });
      }

    });

    "check if bill exist or not"
    var isBillExist = function (db, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.count(query, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    "get inventory count of visible item"
    var isInventoryExist = function (db, callback) {
      var collection = db.collection('inventory');
      var cursor = collection.count({ visible: true }, function (err, result) {
        assert.equal(err, null);
        console.log("inventory count",result)
        callback(result);
      });
    }
    "update bill"
    var updateBill = function (db, billData, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.findOne(query, function (err, instance) {
        assert.equal(err, null);
        if (instance) {
          var tdata = generateTransaction(billData, instance, billData.role)
        }
        voucherTransaction.update(query, tdata, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
      });
    }
    "create bill"
    var createBill = function (db, billData, callback) {
      var collection = db.collection('voucherTransaction');
      voucherTransaction.create(billData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    "create inventory"
    var createInventory = function (db, inventoryData, callback) {
      var collection = db.collection('inventory');
      var cursor = collection.insert(inventoryData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    "update inventory"
    var updateInventory = function (db, visible, callback) {
      var collection = db.collection('inventory');
      var cursor = collection.remove({ invId: billId, visible: visible, isActive: true }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }

  });
  " create Inventory data "
  function createInventoryData(data, visible, no, id, count, compCode) {
    for (var i = 0; i < data.length; i++) {
      data[i].isActive = true;
      data[i].visible = visible;
      data[i].no = no;
      data[i].invId = id;
      data[i].rgNo = count + i + 1;
      data[i].compCode = compCode;
    }
    return data;
  }
  function generateTransaction(data, data1, role) {
    if (role == 'O') {
      data.transactionData.adminAmount = data1.transactionData.adminAmount
      data.transactionData.adminBalance = data1.transactionData.adminBalance
      data.transactionData.itemDetail = data1.transactionData.itemDetail
    }
    if (role == 'UO') {
      data.transactionData.amount = data1.transactionData.amount
      data.transactionData.balance = data1.transactionData.balance
      data.transactionData.balance2 = data1.transactionData.balance
      data.transactionData.manualLineItem = data1.transactionData.manualLineItem
    }

    return data;
  }
  "create ledger json"
  function createLedgerJson(data, id) {
    console.log("ledger", data);
    var ledger = [];
    var roundOffId = "58df8f7af5448d2e2c3c0fb6"
    if (data.role == 'O') {
      var accountData = data.accountlineItem;
      if(data.roundOff){
            if(Math.abs(data.roundOff)>=0.5){
              var roundoff = Math.abs(data.roundOff);
               ledger.push({ accountName: roundOffId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Purchase Invoice", credit: Number(roundoff), voRefId: id, isUo: false, visible: false, compCode: data.compCode })
            }else{
              var roundoff = Math.abs(data.roundOff);
                ledger.push({ accountName: roundOffId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Purchase Invoice", debit: Number(roundoff), voRefId: id, isUo: false, visible: false, compCode: data.compCode })
            }

          }
      for (var i = 0; i < accountData.length; i++) {
        ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.purchaseAccountId, refNo: data.no, voType: "Purchase Invoice", debit: Number(accountData[i].amount), voRefId: id, isUo: false, compCode: data.compCode })
      }
      ledger.push({ accountName: data.supliersId, date: data.date, particular: data.purchaseAccountId, refNo: data.no, voType: "Purchase Invoice", credit: Number(data.amount), voRefId: id, isUo: false, visible: false, compCode: data.compCode },
        { accountName: data.purchaseAccountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Purchase Invoice", debit: Number(data.purchaseAmount), voRefId: id, isUo: false, visible: false, compCode: data.compCode })
    }
    if (data.role == 'UO') {
      var accountData = data.accountlineItem;
      for (var i = 0; i < accountData.length; i++) {
        ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.purchaseAccountId, refNo: data.no, voType: "Purchase Invoice", debit: Number(accountData[i].amount), voRefId: id, isUo: false, visible: true, compCode: data.compCode })
      }
      ledger.push({ accountName: data.supliersId, date: data.date, particular: data.purchaseAccountId, refNo: data.no, voType: "Purchase Invoice", credit: Number(data.adminAmount), voRefId: id, isUo: true, visible: true, compCode: data.compCode },
        { accountName: data.purchaseAccountId, date: data.date, particular: data.supliersId, refNo: data.no, voType: "Purchase Invoice", debit: Number(data.purchaseAmount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })



    }
    console.log(ledger)
    return ledger;
  }

  "get Sales invoice transaction data"
  router.get('/getInvoiceData/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var dueDate = new Date(req.query.dueDate)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
       if(role == "UO"){
      getDataUo(db, role,dueDate, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    }
     if(role == "O"){
         getDataO(db, role,dueDate, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
     }
    });
 var getDataUo= function (db, role,dueDate, callback) {
      var collection = db.collection('voucherTransaction');

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
      
       
         { $match: { type:{$in:["General Invoice","Sales Invoice" ]}} },
           { $match: { isUO:true } },
             { $match: { duedate:{$gt:dueDate}}},
              { $match: { balance:{$gt:0}}},
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountUo",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

    var getDataO = function (db, role,dueDate, callback) {
      var collection = db.collection('voucherTransaction');

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type:"Sales Invoice" } }, 
          { $match: { duedate:{$gt:dueDate}}}, 
          { $match: { balance:{$gt:0}}},
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountO",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }
});


"get overdue sales invoice"

 router.get('/getInvoiceDataOverDue/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var dueDate = new Date(req.query.dueDate);
    console.log(dueDate)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
       if(role == "UO"){
      getDataUo(db, role,dueDate, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    }
     if(role == "O"){
         getDataO(db, role, dueDate,function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
     }
    });
 var getDataUo= function (db, role,dueDate, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
         { $match: { type:{$in:["General Invoice","Sales Invoice" ]}} },
           { $match: { isUO:true } },
           { $match: { duedate:{$lt:dueDate}}},
            { $match: { state:{$ne:"PAID"}}},
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountUo",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

    var getDataO = function (db, role,dueDate, callback) {
      var collection = db.collection('voucherTransaction');

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type:"Sales Invoice" } },
         { $match: { duedate:{$lt:dueDate}}},  
          { $match: { state:{$ne:"PAID"}}},
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountO",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }
});
  

  "get paid invoice"

  router.get('/getPaidInvoice/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
       if(role == "UO"){
      getDataUo(db, role, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    }
     if(role == "O"){
         getDataO(db, role,function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
     }
    });
 var getDataUo= function (db, role, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
         { $match: { type:{$in:["General Invoice","Sales Invoice" ]}} },
           { $match: { isUO:true ,state:"PAID"} },
           
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountUo",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

    var getDataO = function (db, role, callback) {
      var collection = db.collection('voucherTransaction');

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type:"Sales Invoice" } },
          { $match: {state:"PAID"} },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            duedate: "$duedate",
            amount: "$amountO",
            balance: "$balance",
            customer: "$customerId",
            customerId: "$customerId",
            compCode: "$compCode",
            id: "$_id"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }
});
  "get transaction data"
  router.get('/getTransactionData/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var type = req.query.type;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getData(db, role, type, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });

    var getData = function (db, role, type, callback) {
      var collection = db.collection('voucherTransaction');
      var invoiceType = type;
      if (role == 'O') {
         var amount = "$transactionData.amount"
         var balance = "$transactionData.balance"
         var bal =  { $match: {"transactionData.balance": {$gt:0}} }
      }
     
      if (role == 'UO') {
        var amount = "$transactionData.adminAmount"
        var balance = "$transactionData.adminBalance"
         var bal =  { $match: {"transactionData.adminBalance": {$gt:0}} }
      }

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type: invoiceType } },
         bal,
        { $sort : { date : 1 } },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
            supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

  });


   "get paid purchase invoice data"
   router.get('/getPaidInvoiceData/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var type = req.query.type;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getData(db, role, type, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });

    var getData = function (db, role, type, callback) {
      var collection = db.collection('voucherTransaction');
      var invoiceType = type;
      if (role == 'O') {
        var amount = "$transactionData.amount"
        var balance = "$transactionData.balance"
      }
     
      if (role == 'UO') {
        var amount = "$transactionData.adminAmount"
        var balance = "$transactionData.adminBalance"
      }

      var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type: invoiceType } },
        { $match: { "transactionData.balance": {$eq:0} } },
        { $sort : { date : 1 } },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
            supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

  });

//get transaction data of expense
  router.get('/getTransactionDataExpense/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var type = req.query.type;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getData(db, role, type, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });

    var getData = function (db, role, type, callback) {
      var collection = db.collection('voucherTransaction');
      var invoiceType = type;
      if (role == 'O') {
        var amount = "$transactionData.amount"
        var balance = "$transactionData.balance"
        
           var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type: invoiceType} },
         { $match: { "transactionData.balance": {$gt:0}} },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
             supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

      
     
      if (role == 'UO') {
         var amount = "$transactionData.balance"
         var balance = "$transactionData.balance"
         var uoVisible = [true]
         var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
         { $match: { "transactionData.balance": {$gt:0}} },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
             supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
      } 
    }
  });

  "get paid expense data"
  router.get('/getPaidExpense/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    var role = req.query.role;
    var type = req.query.type;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getData(db, role, type, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });

    var getData = function (db, role, type, callback) {
      var collection = db.collection('voucherTransaction');
      var invoiceType = type;
      if (role == 'O') {
        var amount = "$transactionData.amount"
        var balance = "$transactionData.balance"
        
           var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
        { $match: { type: invoiceType} },
         { $match: { "transactionData.balance": {$eq:0}} },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
             supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

      
     
      if (role == 'UO') {
         var amount = "$transactionData.balance"
         var balance = "$transactionData.balance"
         var uoVisible = [true]
         var cursor = collection.aggregate(
        { $match: { compCode: compCode } },
         { $match: { "transactionData.balance": {$eq:0}} },
        {
          $project:
          {
            type: "$type",
            invoiceNo: "$vochNo",
            date: "$date",
            amount: amount,
            balance: balance,
            supplier: "$transactionData.supliersId",
             supplierId: "$transactionData.supliersId",
            email: "$transactionData.email",
            compCode: "$compCode",
            id: "$_id",
            refNo:"$refNo"

          }
        }, function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
      } 
    }
  });

  "get all transaction of a particular supplier"
  router.get('/getAllTransaction/:supliersId', function (req, res) {
    var supliersId = req.params.supliersId;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getData(db, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });

    var getData = function (db, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.aggregate(
        { $match: { 'transactionData.supliersId': supliersId } },
        { $match: { 'transactionData.balance': { $gt: 0 } } },
        {
          $project: {
            date: "$date",
            duedate: "$transactionData.billDueDate",
            amount: "$amount",
            vochNo: "$vochNo",
            type: "$type",
            balance: "$transactionData.balance",
            invoiceType: "$transactionData.invoiceType",
            id: "$_id"
          }
        }
        , function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }

  });

  "get opening balance ledger entry"
  router.get('/openingBalanceLedgerEntrynew/:compCode', function (req, res) {
    var compCode = req.params.compCode;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getAccount(db, function (result) {
        if (result.length > 0) {
          console.log('total ', result.length, 'account found'.red);
          var accountData = result
          console.log('creating ledger json'.white);
          var data = createJsonData(accountData, compCode)
          console.log('ledger json '.green, data);
          ledgerEntry(db, data, function (result) {
            if (result) {
              console.log('ledger entry done sucessfully'.green);
              res.status(200).send(result);
            }

          })
        }
      });
    });

    var getAccount = function (db, callback) {
      var collection = db.collection('account');
      console.log('geting account data...'.green);
      var cursor = collection.find({}).toArray(function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    function createJsonData(data, compCode) {
      var ledger = [];
      var currentDate = new Date("02/02/2017")
      for (var i = 0; i < data.length; i++) {
        if (data[i].balanceType == 'credit' && data[i].openingBalance) {
          ledger.push({ accountName: data[i]._id.toHexString(), date: currentDate, particular: data[i]._id.toHexString(), refNo: '', voType: "Balance", credit: Number(data[i].openingBalance), voRefId: '', isUo: false, visible: true, compCode: compCode })
        }
        if (data[i].balanceType == 'debit' && data[i].openingBalance) {
          ledger.push({ accountName: data[i]._id.toHexString(), date: currentDate, particular: data[i]._id.toHexString(), refNo: '', voType: "Balance", debit: Number(data[i].openingBalance), voRefId: '', isUo: false, visible: true, compCode: compCode })
        }
      }
      return ledger;
    }
  });
  var ledgerEntry = function (db, data, callback) {
    console.log(data)
    var collection = db.collection('ledger');
    var cursor = collection.insertMany(data, function (err, result) {
      assert.equal(err, null);
      callback(result);
    });
  }
  var updateledgerEntry = function (db, data, isUo, role,balanceVisible,callback) {
    var collection = db.collection('ledger');
    var credit;
    var query;
    if(role == 'UO'){
     var visible = true
     if(balanceVisible == 'true'){
      var isUo = false
      if (data[0].credit >=0) {
      credit = data[0].credit
      console.log("new balance is".yellow, credit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",visible:visible}, { $set: { credit: credit,isUo:isUo } }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
      var cursor = collection.remove({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",isUo:isUo,visible:false}, function (err, result) {
        assert.equal(err, null);
       
      });
    }
    else {
      debit = data[0].debit
      console.log("new balance is".yellow, debit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",visible:visible }, { $set: { debit: debit, isUo:isUo} }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
       var cursor = collection.remove({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",isUo:isUo,visible:false}, function (err, result) {
        assert.equal(err, null);
       
      });
    }
     }
     if(balanceVisible == 'false'){
       var isUo = true;
       if (data[0].credit>=0) {
      credit = data[0].credit
      console.log("new balance is".yellow, credit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",visible:visible }, { $set: { credit: credit ,isUo:isUo} }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    else {
      debit = data[0].debit
      console.log("new balance is".yellow, debit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",visible:visible }, { $set: { debit: debit,isUo:isUo } }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
     }
    }
     if(role == 'O'){
       var isUO = false
      if (data[0].credit) {
      credit = data[0].credit
      console.log("new balance is".yellow, credit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",isUo:isUo }, { $set: { credit: credit } }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    else {
      debit = data[0].debit
      console.log("new balance is".yellow, debit)
      var cursor = collection.update({ accountName: data[0].accountName, compCode: data[0].compCode, voType: "Balance",isUo:isUo }, { $set: { debit: debit } }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }


     }
    }
    

  

  var checkOpeningLedger = function (db, accountId, compCode, isUo,role, callback) {
    var collection = db.collection('ledger');
     if (role == 'O') {
      var isUo = false
     var  visible = false
       console.log('checking data with query'.red, accountId, compCode)
       var cursor = collection.count({ accountName: accountId, compCode: compCode, voType: "Balance",isUo:isUo }, function (err, result) {
      assert.equal(err, null);
      callback(result);
    });
  }
   if (role == 'UO') {
      var isUo = true
     var  visible = true
       console.log('checking data with query'.red, accountId, compCode)
       var cursor = collection.count({ accountName: accountId, compCode: compCode, voType: "Balance",visible:visible }, function (err, result) {
      assert.equal(err, null);
      callback(result);
    });
    
   
  }
  }
  function createJson(data, compCode, accountId, role,balanceVisible) {
    console.log("Role is".green, role)
    var ledger = [];
    var isUo;
    var visible;
    if (role == 'UO' && balanceVisible == 'false') {
      isUo = true
      visible = true
    }else if(role == 'UO' && balanceVisible == 'true'){
       isUo = false
       visible = true
    }
    if (role == 'O') {
      isUo = false
      visible = false
    }
    var currentDate = new Date("02/02/2016")
    for (var i = 0; i < data.length; i++) {
      if (data[i].obType == 'credit' && data[i].openingBalance >=0) {
        ledger.push({ accountName: accountId, date: currentDate, particular: accountId, refNo: '', voType: "Balance", credit: Number(data[i].openingBalance), voRefId: '', isUo: isUo, visible: visible, compCode: compCode })
      }
      if (data[i].obType == 'debit' && data[i].openingBalance>=0) {
        ledger.push({ accountName: accountId, date: currentDate, particular: accountId, refNo: '', voType: "Balance", debit: Number(data[i].openingBalance), voRefId: '', isUo: isUo, visible: visible, compCode: compCode })
      }
    }
    return ledger;
  }
  var getAccount = function (db, accountId, callback) {
    var collection = db.collection('account');
    var cursor = collection.find({ _id: new mongodb.ObjectId(accountId) }).toArray(function (err, result) {
      assert.equal(err, null);
      callback(result);
    });
  }
  // ledger entry of opening balance when account is created
  router.post('/openingBalanceLedgerEntry/:compCode', function (req, res) {
    var accountData = req.body;
    var compCode = req.params.compCode;
    var accountId = req.query.accountId;
     var balanceVisible = req.query.visible;
    var role = req.query.role;
     if (role == 'UO') {
      isUo = true
    }
    if (role == 'O') {
      isUo = false  
    }
    console.log('>request processing...'.yellow)
    console.log("Role is", req.query)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getAccount(db, accountId, function (result) {
        var openingLedger = result;
        console.log('Account Info '.green, result);
        checkOpeningLedger(db, accountId, compCode,isUo,role, function (result) {
          var exist = result
          console.log("is exist".green, result)
          var data = createJson(openingLedger, compCode, accountId, role,balanceVisible)
          console.log("data for ledgerEntry".red, data)
          if (exist > 0) {
            console.log('opening Balance ledger exist'.green);
            console.log('updating existing ledger...'.yellow);
            if (data.length > 0) {
              updateledgerEntry(db, data,isUo,role,balanceVisible, function (result) {
                if (result) {
                  console.log('ledger entry done sucessfully'.green, result.result);
                  res.status(200).send(result);
                }
              })

            }
          }
            if (exist == 0) {
              console.log('opening Balance ledger does not exist'.red);
              console.log('creating opening balance ledger...'.green);
               if (data.length > 0) {
              ledgerEntry(db, data, function (result) {
                if (result) {
                  console.log('ledger entry done sucessfully'.green);
                  res.status(200).send(result);
                }
              })
               }else{
                 res.status(200).send();
               }

            }
          
        });

      })
    });


  })
//bank charges entry ledger json
function createBankChargesLedger(data, id) {
     var ledger = [];
     var accountData = data.vo_payment.accountlineItem
     if(data.vo_payment.accountlineItem.length>0){
      if(data.role == "UO"){
         var isUo = true
         var visible = true
         for (var i = 0; i < accountData.length; i++) {
           ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Payment", credit: Number(accountData[i].amount), voRefId: id, isUo: isUo, visible: visible, compCode: data.compCode })
        } 
      }
       if(data.role == "O"){
         var isUo = false
         var visible = true
         for (var i = 0; i < accountData.length; i++) {
           ledger.push({ accountName: accountData[i].accountId, date: data.date, particular: data.vo_payment.bankAccountId, refNo: data.vochNo, voType: "Payment", credit: Number(accountData[i].amount), voRefId: id, isUo: isUo, visible: visible, compCode: data.compCode })
         }      
      }
       return ledger;
    }
  }





  "rosemate"
  router.post('/deleteRosemate', function (req, res) {
    var id = req.query.id
    var data = req.body;
    deleteRosemate(data, id, true, function (err) {
        if (err)
          res.send(err);
        else
          res.send({ status: '200' });
    });
  });
  router.post('/saveRosemate', function (req, res) {
    var id = req.query.id
    var data = req.body;
    //console.log(req.body);
    if (id != 'null') {
      //var query = { id: id }
      deleteRosemate(data, id, false, function (err) {
        if (err)
          res.send(err);
        else {
          createRosemate(data, id, function () {
            res.send({ status: '200' });
          });
        }

      })
      // updateRosemate(req.body, id, function () {
      //   res.send({ status: '200' });
      // });

    }
    else {
      createRosemate(data, id, function () {
        res.send({ status: '200' });
      });

    }
  });
  function createRosemate(data, id, callback) {
    var receipts = data.vo_rosemate.receipts;
    var payments = data.vo_rosemate.payments;
    //var newReceipts=
    function processReceipts(i) {
      if (i < receipts.length) {
        var id = receipts[i].id;
        voucherTransaction.count({ type: 'Receipt' }, function (err, instance) {
          var cVouchNo = instance + 1;
          receipts[i].vochNo = cVouchNo;
          receipts[i].id = mmongoose.Types.ObjectId();
          console.log("creating receipt with vouchNo: " + cVouchNo);
          var dataBadla;
          //var isBadla=false;
          if (receipts[i].vo_badla) {
            //badla payment
            dataBadla = receipts[i].vo_badla;
            delete receipts[i].vo_badla;
          }
          createReceipt(receipts[i],dataBadla, function (dataInstance) {
            if (dataBadla) {
              dataBadla.receiptId = dataInstance.id;
              createBadlaVoucher(dataBadla, function () {
                processReceipts(i + 1);
              });
            } else {
              processReceipts(i + 1);
            }

          });
        });

      } else {//if(callback1)
        processPayments(0);
      }

    }
    processReceipts(0);
    function processPayments(i) {
      if (i < payments.length) {
        voucherTransaction.count({ type: 'Payment' }, function (err, instance) {
          console.log(instance);
          var cVouchNo = instance + 1;
          payments[i].vochNo = cVouchNo;
          payments[i].id = mmongoose.Types.ObjectId();
          //console.log(payments[i]);
          console.log("creating payment with vouchNo: " + cVouchNo);
          createPayment(payments[i], null,null, function () {
            processPayments(i + 1);
          });

        });
      } else {
        createRosemateEntry(id);
      }
    }
    //}
    //var newReceipts=



    function createRosemateEntry(id) {
      if (id != 'null') {
        //update entry...
        voucherTransaction.update({ _id: new mongodb.ObjectId(id) }, data, function (err, instance) {
          if (err) {
            console.log(err);
          }
          else {
            if (callback) callback();
          }
        });
      } else {
        //create entry.
        console.log("Inside Create Rosemate");
        voucherTransaction.count({ type: 'Rosemate' }, function (err, instance) {
          console.log(data);
          data.vochNo = instance + 1;
          voucherTransaction.create(data, function (err, instance) {
            if (err) {
              console.log(err);
            }
            else {
              console.log("Returning Result");
              if (callback) callback();
            }
          });
        });
      }

    }
  }
  function validateRosemate(receiptsOld, callback) {
    deleteReceiptOld(0);
    function deleteReceiptOld(i) {
      if (i < receiptsOld.length) {
        deleteReceipt(receiptsOld[i].id.toString(), receiptsOld[i], true, function (err) {
          if (err) {
            callback(err);
            return;
          } else
            deleteReceiptOld(i + 1);
        })
      } else {
        callback();
      }
    }
  }

  function deleteRosemate(data, id, deleteVoucher, callback) {
    //get previous rosemate entry and delete all receipt,payments and their respective ledgers.
    voucherTransaction.findOne({ "where": { "_id": ObjectID(id) } }, function (err, resultOld) {
      if (err) {
        console.log(err);
      } else {
        /////
        //validate is there any badla with receipt on it exists... 
        var receiptsOld = resultOld.vo_rosemate.receipts;
        var paymentsOld = resultOld.vo_rosemate.payments;
        validateRosemate(receiptsOld, function (err) {
          if (err) {
            if (callback)
              callback(err);
            return;
          } else {
            deleteReceiptOld(0);
            function deleteReceiptOld(i) {
              if (i < receiptsOld.length) {
                deleteReceipt(receiptsOld[i].id.toString(), receiptsOld[i], true, function (err) {
                  if (err) {
                    if (callback)
                      callback(err);
                    return;
                  } else
                    deleteReceiptOld(i + 1);
                })
              } else {
                deletePaymentOld(0);
              }
            }
            function deletePaymentOld(i) {
              if (i < paymentsOld.length) {
                deletePayment(paymentsOld[i].id.toString(), paymentsOld[i], function () {
                  deletePaymentOld(i + 1);
                })
              } else {
                if (deleteVoucher)
                  removeVoucherTransaction(id, data.role);
                if (callback) callback();
              }
            }
          }
        });
      }
    });
  }

  // function updateRosemate(data, id, callback) {
  //   //get previous rosemate entry and delete all receipt,payments and their respective ledgers.
  //   //get all receipts and check if has id
  //   //then update receipts and update related ledger and logs
  //   //if not then create new receipts and create ledger entries.
  //   //
  //   //function createReceiptEntries(callback1){
  //   var receipts = data.vo_rosemate.receipts;
  //   var payments = data.vo_rosemate.payments;
  //   //var newReceipts=

  //   function processReceipts(i) {
  //     if (i < receipts.length) {
  //       var id = receipts[i].id;
  //       if (id) {
  //         //console.log(receipts[i]+"updating");
  //         updateReceipt(receipts[i], receipts[i].id, function () {
  //           receipts[i].id = mmongoose.Types.ObjectId(id);
  //           processReceipts(i + 1);
  //         });

  //       }
  //       else {
  //         voucherTransaction.count({ type: 'Receipt' }, function (err, instance) {
  //           //console.log(instance);
  //           var cVouchNo = instance + 1;
  //           receipts[i].vochNo = cVouchNo;
  //           receipts[i].id = mmongoose.Types.ObjectId();
  //           console.log(receipts[i] + " creating");
  //           createReceipt(receipts[i], function () {
  //             processReceipts(i + 1);
  //           });


  //         });
  //       }
  //     } else {//if(callback1)
  //       processPayments(0);
  //     }

  //   }
  //   processReceipts(0);
  //   function processPayments(i) {
  //     if (i < payments.length) {
  //       if (payments[i].id) {
  //         updatePayment(payments[i], payments[i].id, null, function () {
  //           payments[i].id = mmongoose.Types.ObjectId(id);
  //           processPayments(i + 1);
  //         });

  //       }
  //       else {
  //         voucherTransaction.count({ type: 'Payment' }, function (err, instance) {
  //           //console.log(instance);
  //           var cVouchNo = instance + 1;
  //           payments[i].vochNo = cVouchNo;
  //           payments[i].id = mmongoose.Types.ObjectId();
  //           //console.log(payments[i]);
  //           console.log(payments[i] + " creating");
  //           createPayment(payments[i], null, function () {
  //             processPayments(i + 1);
  //           });
  //         });
  //       }
  //     } else {
  //       createRosemateEntry();
  //     }
  //   }
  //   function createRosemateEntry() {
  //     voucherTransaction.update({ _id: new mongodb.ObjectId(id) }, data, function (err, instance) {
  //       if (err) {
  //         console.log(err);
  //       }
  //       else {
  //         if (callback) callback();
  //       }
  //     });
  //   }
  // }
  "getAccountOpeningBalnce"
  router.get('/getAccountOpeningBalnce/:compCode', function (req, res) {
    var compCode = req.params.compCode
    var accountId = req.query.accountId
    var role = req.query.role
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getBalance(db, compCode, role, accountId, function (result) {
        if (result.length > 0) {
          var balance;
          var type;
          if (result[0].credit) {
            balance = result[0].credit
            type = 'credit'

          }
          else {
            balance = result[0].debit
             type = 'debit'
          }
          console.log('balance is'.green, balance);
          res.status(200).send({ 'balance': balance ,type:type});
        }
        else {
          res.status(200).send({ 'balance': 0});
        }

      })
    })
    var getBalance = function (db, compCode, role, accountId, callback) {
      var collection = db.collection('ledger');
      var isUo
      var visible
      if (role == 'UO') {
        isUo = true;
        visible = true;
        var cursor = collection.find({ accountName: accountId, compCode: compCode, visible: visible, voType: "Balance" }).toArray(function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
      }
      if (role == 'O') {
        isUo = false
         var cursor = collection.find({ accountName: accountId, compCode: compCode, isUo: isUo, voType: "Balance" }).toArray(function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
      }
     
    }
  });
  "account delete"
  router.post('/deleteAccount/:accountId', function (req, res) {
    var accountId = req.params.accountId
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      deleteAccount(db, accountId, function (result) {
        if (result) {
          console.log("account is deleted Id".red, accountId)
          res.status(200).send({ 'status': "success" });
        }

      });
    });

    var deleteAccount = function (db, accountId, callback) {
      var collection = db.collection('account');
      var cursor = collection.update({ _id: new mongodb.ObjectId(accountId) }, { $set: { isActive: false } }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }

  });
  "purchase voucher delete"
  router.post('/deleteVoucher/:voucherId', function (req, res) {
    var accountId = req.params.accountId
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      deleteVoucher(db, voucherId, function (result) {
        if (result) {
          console.log("voucher is deleted Id".red, voucherId)
          deleteLedger(db, accountId, function (result) {
            if (result)
              console.log("All ledger of accountId".yellow, voucherId, "is deleted sucessfully")
            res.status(200).send({ 'status': "success" });
          });
        }

      });
    });
    var deleteVoucher = function (db, accountId, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.remove({ _id: new mongodb.ObjectId(accountId) }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var deleteLedger = function (db, accountId, callback) {
      var collection = db.collection('ledger');
      var cursor = collection.remove({ accountName: accountId }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var deleteInventory = function (db, accountId, callback) {
      var collection = db.collection('Inventory');
      var cursor = collection.remove({ accountName: accountId }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }

  });

  "get invoice for purchase Settelment"
  router.get('/getInvoiceSett', function (req, res) {
    var invoiceNo = req.query.invoiceNo;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getInvoice(db, invoiceNo, function (result) {
        if (result.length > 0) {
          res.status(200).send(result);
        }
        else {
          res.status(200).send({ 'status': "Not Found" });
        }
      });
    });
    var getInvoice = function (db, invoiceNo, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.aggregate(
        { $match: { vochNo: invoiceNo } },
        {
          $project: {
            supplier: "$transactionData.supliersId",
            date: "$date",
            totalLineItemData: "$transactionData.manualLineItem",
            totalAmount: "$transactionData.amount",
            accountData: "$transactionData.accountlineItem"
          }
        }

        , function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }
  });

  "get invoice for sales settelment"
  router.get('/getSalesInvoice', function (req, res) {
    var invoiceNo = req.query.invoiceNo;
     var compCode = req.query.compCode
     console.log(" geting invoice ".green + invoiceNo + " in company ".red + compCode)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getInvoice(db, invoiceNo,compCode, function (result) {
        if (result.length > 0) {
          console.log(" Invoice id ".yellow + result[0]._id)
          res.status(200).send(result);
        }
        else {
          res.status(200).send({ 'status': "Not Found" });
        }
      });
    });
    var getInvoice = function (db, invoiceNo,compCode, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.aggregate(
        { $match: { vochNo: invoiceNo } },
        { $match: { compCode: compCode } },
        {
          $project: {
            customer: "$invoiceData.consigneeAccountId",
            date: "$date",
            totalLineItemData: "$invoiceData.billData",
            totalAmount: "$amount",
            accountData: "$invoiceData.accountlineItem",
            id:"$_id"
          }
        }
        , function (err, result) {
          assert.equal(err, null);
          callback(result);
        });
    }
  });
  // purchaseSettelment count
  router.post('/voucherTransactionsExist', function (req, res) {
   // var refNo = req.params.refNo
     var refNo = req.body.refNo
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      isExist(db, refNo, function (result) {
        if (result > 0) {
          var count = result
          getId(db, refNo, function (result) {
            if (result) {
              res.status(200).send({ count: count, id: result[0]._id });
            }
          });
        }
        else {
          res.status(200).send({ count: 0 });
        }
      })
    })
    var getId = function (db, refNo, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.find({ invoiceNo: refNo }).toArray(function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var isExist = function (db, refNo, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.count({ invoiceNo: refNo }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
  });
  router.get('/getVoucherTransactionCount/:compCode', function (req, res) {
    var type = req.query.type
     var compCode = req.params.compCode
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      getCount(db, type,compCode, function (result) {
        res.status(200).send({ count: result + 1 });
      });
    });
    var getCount = function (db, type,compCode, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.count({ type: type,compCode:compCode}, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
  });
  // purchaseSettelment api
  router.post('/purchaseSettelment/:id', function (req, res) {
    var id = req.params.id
    var type = req.query.type
    var settelmentData = req.body
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      if (id != "null") {
        updatePurchaseSettelment(db, settelmentData, new mongodb.ObjectId(id), function (result) {
          if (result) {
            ledger = ledgerCreation(settelmentData, id, type);
            accountEntry(ledger, true, id);
            res.status(200).send({ id: id });
          }
        });
      }
      else {
        savePurchaseSettelment(db, settelmentData, id, function (result) {
          var ledger;
          if (result) {
            console.log(result.ops[0]._id)
            ledger = ledgerCreation(settelmentData, result.ops[0]._id,type);
            accountEntry(ledger, false, result.ops[0]._id);
            res.status(200).send({ id: result.ops[0]._id });
          }
        });
      }
    });
    function ledgerCreation(data, id,type) {
      var firstLedger = data.ledgerDataFirst
      var secondLedger = data.ledgerDataSecond
      var thirdLedger = data.ledgerDataThird
      var ledger = [];
      if(type == 'purchase'){
      var paritcular = "Purchase Settelment" + data.invoiceNo
      ledger.push({ accountName: firstLedger.accountId, date: data.date, particular: secondLedger.accountId, particular1: thirdLedger.accountId,amount1:secondLedger.amount,amount2:thirdLedger.amount, refNo: data.voRefNo, voType: "Purchase Settelment", credit: Number(firstLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      ledger.push({ accountName: secondLedger.accountId, date: data.date, particular: firstLedger.accountId, refNo: data.voRefNo, voType: "Purchase Settelment", debit: Number(secondLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      ledger.push({ accountName: thirdLedger.accountId, date: data.date, particular: firstLedger.accountId, refNo: data.voRefNo, voType: "Purchase Settelment", debit: Number(thirdLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      return ledger;
    }
     if(type == 'sales'){
        var paritcular = "Sales Settelment" + data.invoiceNo
      ledger.push({ accountName: firstLedger.accountId, date: data.date, particular: secondLedger.accountId, particular1: thirdLedger.accountId,amount1:secondLedger.amount,amount2:thirdLedger.amount, refNo: data.voRefNo, voType: "Sales Settelment", debit: Number(firstLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      ledger.push({ accountName: secondLedger.accountId, date: data.date, particular: firstLedger.accountId, refNo: data.voRefNo, voType: "Sales Settelment", credit: Number(secondLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      ledger.push({ accountName: thirdLedger.accountId, date: data.date, particular: firstLedger.accountId, refNo: data.voRefNo, voType: "Sales Settelment", credit: Number(thirdLedger.amount), voRefId: id, isUo: true, visible: true, compCode: data.compCode })
      return ledger;
     }
    }
    var savePurchaseSettelment = function (db, settelmentData, id, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.insert(settelmentData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var updatePurchaseSettelment = function (db, settelmentData, id, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.update({ _id: id }, settelmentData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
  });
  router.post('/userActivityLog', function (req, res) {
    var data = req.body;
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      createLog(db, data, function (result) {
        if (result) {
          res.status(200).send(result);
        }
      });
    });


    var createLog = function (db, userLog, callback) {
      var collection = db.collection('userActivity');
      var cursor = collection.insert(userLog, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
  });
  router.post('/assignCompany', function (req, res) {
    var data = req.body;
    var role = data.role;
    user.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('User');
      if (role == 'O') {
        collection.update({ companies: { $ne: data.compCode } }, { $push: { companies: data.compCode } }, { multi: true }, function (err, instance) {
          if (err) console.log(err);
          else {
            console.log("company assigned");
            res.status(200).send(instance);
          }
        })
      } else if (role == 'UO') {
        collection.update({ role: { $ne: 2 }, companies: { $ne: data.compCode } }, { $push: { companies: data.compCode } }, { multi: true }, function (err, instance) {
          if (err) console.log(err);
          else {
            console.log("company assigned");
            res.status(200).send(instance);
          }
        })
      }
    });
  });
  router.post('/editCompany', function (req, res) {
    var data = req.body;
    delete data._id;
    user.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('CompanyMaster');
      collection.update({ CompanyId: data.CompanyId }, data, function (err, instance) {
        if (err) console.log(err);
        else {
          console.log("company assigned");
          res.status(200).send(instance);

        }
      });
    });
  });
  router.get('/getUserCompanies/:id', function (req, res) {
    var id = req.params.id;
    user.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('User');
      collection.findOne({ _id: mongodb.ObjectId(id) }, function (err, instance) {
        if (err)
          console.log(err);
        else {
          var userComp = instance.companies;
          console.log(userComp);
          var companies = db.collection('CompanyMaster');
          var qry = { IsActive: 1, CompanyId: { $in: userComp } };
          //console.log(qry);
          companies.find(qry).toArray(function (err, data) {
            if (err) {
              console.log(err);
            } else {
              res.status(200).send(data);
            }
          });
        }
      });
    });
  });
  // save jouranal 
  router.post('/savejournal/:id', function (req, res) {
    var voId = req.params.id
    var journalData = req.body
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      if (voId != 'null') {
        updateJournal(db, journalData, voId, function (result) {
          if (result) {
            ledger = ledgerCreationforjournal(journalData, voId);
            accountEntry(ledger, false, new mongodb.ObjectId(voId));
            res.status(200).send({ id: voId });
          }
        });
      } else {
        createJournal(db, journalData, function (result) {
          if (result) {
            ledger = ledgerCreationforjournal(journalData, result.ops[0]._id);
            accountEntry(ledger, false, new mongodb.ObjectId(result.ops[0]._id));
            res.status(200).send({ id: result.ops[0]._id });
          }
        });

      }
    });
    var createJournal = function (db, journalData, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.insert(journalData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }
    var updateJournal = function (db, journalData, id, callback) {
      var collection = db.collection('voucherTransaction');
      var cursor = collection.update({ _id: new mongodb.ObjectId(id) }, journalData, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }

    function ledgerCreationforjournal(data, id) {
      var ledgerData = data.journalData
      var ledger = [];
      for (var i = 0; i < ledgerData.length; i++) {
        ledger.push({ accountName: ledgerData[i].accountId, date: data.date, particular: "Journal", refNo: data.no, voType: "Journal Entry", credit: ledgerData[i].credit, debit: ledgerData[i].debit, voRefId: id, isUo: false, visible: true, compCode: data.compCode })
      }
      return ledger;
    }


    // check  Inventory if sales invoice created or not

  });

  router.get('/checkSalesInventory/:invId', function (req, res) {
    var invId = req.params.invId
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
      checkInventory(db, invId, function (result) {
        console.log(result)
        if (result) {
          if (result.salesTransaction) {
            res.status(200).send({ status: "can not update" });
          }


          else {
            res.status(200).send({ status: "sales transaction does not exist" });
          }
        }
        else {
          res.status(200).send({ status: "invalid invoice Id" });
        }
      });
    });
    var checkInventory = function (db, invId, callback) {
      var collection = db.collection('inventory');
      collection.findOne({ invId: invId }, function (err, result) {
        assert.equal(err, null);
        callback(result);
      });
    }


  });
   router.post('/uploadInventory', function (req, res) {
      Inventory.create(req.body, function (err, result) {
        if(result){
           res.send("uploaded successfully")
        }else{
          res.send("some internal problem")
        }
        
      });
   })
   router.get('/getSalesInvoiceNo', function (req, res) {
     var compCode = req.query.compCode
     var type = req.query.type
     console.log(compCode)
      voucherTransaction.getDataSource().connector.connect(function (err, db) {
         var collection = db.collection('voucherTransaction');
       collection.count({type:type,compCode:compCode}, function (err, result) {
         console.log(result)
             res.send({count:result})
           });
     });
   });
 router.get('/getInventory', function (req, res) {
   var compCode = req.query.compCode
   var visible = req.query.visible
   if(visible == 'true'){
     visible = true
   }else{
     visible = false
   }
  console.log(compCode)
  console.log(visible)
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('inventory');
         Inventory.find(
      {where: {visible:visible,compCode:compCode,BALANCE:{gt:0}}},function (err, result) {
           console.log(result)
             res.send(result)
          });
          
    });
    
 });


 "get sales inventrory"

 router.get('/getSalesInventory', function (req, res) {
   var compCode = req.query.compCode
   var visible = req.query.visible
   if(visible == 'true'){
     visible = true
   }else{
     visible = false
   }
  console.log("Geting inventory of compCode".bgCyan, compCode)
  console.log("Visible".bgMagenta,visible)
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('inventory');
        var collection1 = db.collection('voucherTransaction');
         collection.aggregate(
            {$match:{visible:visible}},
            {$match:{compCode:compCode}},
            {$unwind: {path:"$salesTransaction",includeArrayIndex: "arrayIndex"}},
            {salesTransaction: { $exists: true}}
         ).toArray(function (err, result) {
             if(result.length>0){
               collection1.find({compCode:compCode,type:"Sales Invoice"}
                  ).toArray(function (err, instance) {
                     if(instance.length>0){
                      // console.log("Invoice Data".bgMagenta,instance)
                       for(var i=0;i<result.length;i++){
                         for(var j=0;j<instance.length;j++){
                            if(result[i].salesTransaction.id == instance[j]._id.toHexString()){
                               console.log("true")
                               result[i].customerId = instance[j].invoiceData.consigneeAccountId
                            }

                         }
                       }
                        console.log("Total Item ".blue,result.length)
                        console.log(" Item ".bgGreen,result)
                        res.send(result)
                     }
                  });
               
             }else{
                console.log(" NO DATA ".bgGreen)
                res.send("no data");
             }
          });
          
    });
    
 });


 router.post('/getSalesInventoryAgg', function (req, res) {
   console.log(req.body)
   var compCode = req.query.compCode
   var queryData = req.body;
   var visible = req.query.visible
   if(visible == 'true'){
     visible = true
   }else{
     visible = false
   }
  console.log("Geting inventory of compCode".bgCyan, compCode)
  console.log("Visible".bgMagenta,visible)
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('inventory');
        var collection1 = db.collection('voucherTransaction');
         collection.aggregate(

           {$match:queryData},
           {$unwind: {path:"$salesTransaction",includeArrayIndex: "arrayIndex"}},
            {salesTransaction: { $exists: true}}
         ).toArray(function (err, result) {
             if(result.length>0){
               collection1.find({compCode:compCode,type:"Sales Invoice"}
                  ).toArray(function (err, instance) {
                     if(instance.length>0){
                      // console.log("Invoice Data".bgMagenta,instance)
                       for(var i=0;i<result.length;i++){
                         for(var j=0;j<instance.length;j++){
                            if(result[i].salesTransaction.id == instance[j]._id.toHexString()){
                               console.log("true")
                               result[i].customerId = instance[j].invoiceData.consigneeAccountId
                            }

                         }
                       }
                        console.log("Total Item ".blue,result.length)
                        console.log(" Item ".bgGreen,result)
                        res.send(result)
                     }
                  });
               
             }else{
                console.log(" NO DATA ".bgGreen)
                res.send("no data");
             }
          });
          
    });
    
 });
  " inventory filter"
   router.post('/inventoryFilter', function (req, res) {
      var data = req.body
      var queryData = {}
      var qry = [
           {WIDTH:{$in:data[0].WIDTH}},
           {COILSHEETNO:{$in:data[1].COILSHEETNO}},
           {INCOMINGDATE:{$in:data[2].INCOMINGDATE}},
           {LotWeight:{$in:data[3].LotWeight}},
           {LOCATION:{$in:data[4].LOCATION}},
           {GRADE:{$in:data[5].GRADE}},
           {FINISH:{$in:data[6].FINISH}},
           {THICKNESS:{$in:data[7].THICKNESS}},
           {NETWEIGHT:{$in:data[8].NETWEIGHT}},
           {GROSSWT:{$in:data[9].GROSSWT}},
           {LENGTH:{$in:data[10].LENGTH}},
           {SUBCATEGORY:{$in:data[11].SUBCATEGORY}},
  ]
        function checkProperties(data) {
         for (var i = 0; i< data.length;i++) {
           for (var key in data[i]) {
             if (data[i][key].length >0){
               queryData[key] = qry[i][key]   
             } 
           }     
        }
    return queryData;
  }
    var queryData = checkProperties(data)
    console.log("Please wait searching invebtory".green + " with query " , queryData)
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('inventory');
         collection.find(queryData).toArray(function (err, result) {
           if(result){
             for(var i=0;i<result.length;i++){
                result[i].id = result[i]._id;
             }
             res.send(result)
             console.log(result)
           }
          });
    });
 });

// activity log
function activityLog(username,activity,vochNo,compCode) {
      var d = new Date()
      var logData = {
                      username: username,
                      date: new Date(),
                      hours:d.getHours() + ':' + d.getMinutes() ,
                      activityType:activity,
                      vochNo:vochNo,
                      compCode:compCode
                   }

     voucherTransaction.getDataSource().connector.connect(function (err, db) {
      var collection = db.collection('userActivity');
       userActivity.create(logData,function (err, result) {
          if(err){
            console.log(err)
          }else{
            console.log("Activity Recorded".green)
          }
      });
  });
};

router.get('/getreport', function (req, res) {
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
         collection.aggregate( 
           {
       $group:
         {
            _id: { accountName: "$type" },
              total: { $sum: "$amount" },
         }
     }

      ,function (err, result) {
           console.log(result)
             res.send(result)
          });
          
    });
    
 });
 router.get('/getreport2', function (req, res) {
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
         collection.aggregate( 
           
      { $match: {type:"Sales Invoice"} },
       {$group:
         {
            _id: { accountName: "$date" },
              total: { $sum: "$amount" },
         }
     }

      ,function (err, result) {
           //console.log(result)
             res.send(result)
          });
          
    });
    
 });
 router.get('/getreport3', function (req, res) {
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
         collection.aggregate( 
           
      { $match: {type:"Purchase Invoice"} },
       {$group:
         {
            _id: { accountName: "$date" },
              total: { $sum: "$transactionData.amount" },
         }
     }

      ,function (err, result) {
          // console.log(result)
             res.send(result)
          });
          
    });
    
 });
 router.get('/getreport4', function (req, res) {
    Inventory.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
         collection.aggregate( 
       {$group:
         {
            _id: { accountName: "$type" },
              total: { $sum: 1 }
         }
     }

      ,function (err, result) {
           console.log(result)
             res.send(result)
          });
          
    });
    
 });


"voucher count"
  router.get('/voucherTransactions/count', function (req, res) {
    var type = req.query.type
    var compCode = req.query.compCode
    var isUo = JSON.parse(req.query.isUo)
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
          collection.count({isUo:isUo,type:type,compCode:compCode},function (err, result) {
           console.log({count:result})
             res.send({count:result})
       });      
    });  
 });
   "get voucherTransaction"
  router.post('/voucherTransactions/', function (req, res) {
    var type = req.body
    var fromDate = new Date(req.query.fromDate)
    var lastDate = new Date(req.query.lastDate)
    var compCode = req.query.compCode
    var role = req.query.role
    if(role == "O"){
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
          collection.find({"type":{$nin:type},isUo:false,compCode:compCode,date: { $gte: fromDate , $lte: lastDate } }).sort( [['_id', -1]]).toArray(function (err, result) {
            console.log("voucher",result)
            if(result.length>0){
             console.log(result)
             res.send(result)
            }else{
              res.send(result)
            }
       });      
    });  
  }
   if(role == "UO"){
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
          collection.find({"type":{$nin:type},visible:true,compCode:compCode,date: { $gte: fromDate , $lte: lastDate }}).sort( [['_id', -1]]).toArray(function (err, result) {
            console.log("voucher",result)
            if(result.length>0){
             console.log(result)
             res.send(result)
            }else{
              res.send(result)
            }

       });      
    });  
  }
 });


   "get voucher by type"
   router.get('/voucherTransactionsByType/', function (req, res) {
    var type = req.query.type
    console.log(type)
    var fromDate = new Date(req.query.fromDate)
    var lastDate = new Date(req.query.lastDate)
    var compCode = req.query.compCode
    var role = req.query.role
    if(role == "O"){
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
          collection.find({type:type,isUo:false,compCode:compCode,date: { $gte: fromDate , $lte: lastDate } }).sort( [['_id', -1]]).toArray(function (err, result) {
            console.log("voucher",result)
            if(result.length>0){
             console.log(result)
             res.send(result)
            }else{
              res.send(result)
            }
       });      
    });  
  }
   if(role == "UO"){
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
          collection.find({"type":type,visible:true,compCode:compCode,date: { $gte: fromDate , $lte: lastDate }}).sort( [['_id', -1]]).toArray(function (err, result) {
            console.log("voucher",result)
            if(result.length>0){
             console.log(result)
             res.send(result)
            }else{
              res.send(result)
            }

       });      
    });  
  }
 });


    "check sale transaction in inventory"
     "get voucherTransaction"
  router.get('/checkSalesTransaction/', function (req, res) {
    var invId = req.query.invId
    voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('inventory');
          collection.find({invId:invId, salesTransaction: { $exists: true}}).toArray(function (err, result) {
            console.log(result)
            if(result.length>0){
              var length = result.length
              var status;
              for(var i=0;i<length;i++){
                if(result[i].salesTransaction.length>0){
                  status = 'can not update'
                }
              }
             res.send({status:status})
            }else{
              res.send({status:'ok'});
            }
       });      
    });  
  });
   
 

"get bank and cash account"
  router.get('/getBankAndCashAccount', function (req, res) {
    var compCode = req.params.compCode
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('account');
           collection.find({isActive: true ,ancestor:"BANK ACCOUNTS"}).toArray(function (err, instance) {
      if (instance) {
        console.log(instance)
        res.send(instance);
      };
      });
    });
  });


"set bank date"
  router.get('/setBankDate', function (req, res) {
    var id = req.query.id
    console.log(req.query.bankDate);
    var bankDate = new Date(req.query.bankDate)
    console.log(bankDate);
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('ledger');
        if(bankDate != "Invalid Date"){
           collection.update({_id: new mongodb.ObjectId(id)},{$set:{bankDate:bankDate}},function (err, instance) {
            if (instance) {
               console.log(instance)
              res.send(instance);
          };
      });
     }
     if(bankDate == "Invalid Date"){
        collection.update({_id: new mongodb.ObjectId(id)},{$unset:{bankDate:""}},function (err, instance) {
            if (instance) {
               console.log(instance)
              res.send(instance);
            };  
         });
       }
   });
  });


  "get all account"
 router.get('/getAllType', function (req, res) {
   var isUo = req.query.isU
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
           collection.distinct("type"
            ,function (err, instance) {
             if (instance) {
               res.send(instance);
          };
       });
     });
  });

router.get('/getAllAccount', function (req, res) {
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('account');
           collection.find({isActive: true}).toArray(function (err, instance) {
             if (instance) {
               res.send(instance);
          };
       });
     });
  });

   /*
     change voucher state
     @param : voucherId
     @query:  satatus
     @res: "ok" if updated successfully
   */
  router.post('/changeVoucherStatus/:id', function (req, res) {
    var id  = req.params.id
    var state = req.query.state
     voucherTransaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('voucherTransaction');
        collection.find({_id: new mongodb.ObjectId(id)}).toArray(function (err, instance) {
           if(instance[0].stateLog){
              if(instance[0].stateLog.prev_state){
               var stateLog = instance[0].stateLog
               var newStateLog = {
                 prev_state:stateLog.curr_state,
                 prev_state_date:stateLog.prev_state_date,
                 curr_state:state,
                 curr_state_date:new Date()
               }
              }
           }
            else{
              var newStateLog = {
                 prev_state:state,
                 prev_state_date:new Date(),
                 curr_state:state,
                 curr_state_date:new Date()
               }
            }
               collection.update({_id: new mongodb.ObjectId(id)},{$set:{stateLog:newStateLog}},function (err, instance) {
                 if (instance) {
                    if(instance.result.nModified == 1){
                      res.send("ok");
                    }else{
                      res.send("some internal problem");
                    }         
               };
            });
         
        });
     });
  });
  server.use(router);
};

