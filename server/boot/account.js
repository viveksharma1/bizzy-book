
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

var data = [
	{
		"code": "01",
		"state": "Jammu & Kashmir",
	},
	{
		"code": "02",
		"state": "Himachal Pradesh",
	},
	{
		"code": "03",
		"state": "Punjab",
	},
	{
		"code": "04",
		"state": "Chandigarh",
	},
	{
		"code": "05",
		"state": "Uttranchal",
	},
	{
		"code": "06",
		"state": "Haryana",
	},
	{
		"code": "07",
		"state": "Delhi",
	},
	{
		"code": "08",
		"state": "Rajasthan",
		
	},
	{
		"code": "09",
		"state": "Uttar Pradesh",
	
	},
	{
		"code": "10",
		"state": "Bihar",
		
	},
	{
		"code": "11",
		"state": "Sikkim",
		
	},
	{
		"code": "12",
		"state": "Arunachal Pradesh",
	
	},
	{
		"code": "13",
		"state": "Nagaland",
		
	},
	{
		"code": "14",
		"state": "Manipur",
		
	},
	{
		"code": "15",
		"state": "Mizoram",
		
	},
	{
		"code": "16",
		"state": "Tripura",
		
	},
	{
		"code": "17",
		"state": "Meghalaya",
	
	},
	{
		"code": "18",
		"state": "Assam",
		
	},
	{
		"code": "19",
		"state": "West Bengal",
		
	},
	{
		"code": "20",
		"state": "Jharkhand",
		
	},
	{
		"code": "21",
		"state": "Orissa",
	
	},
	{
		"code": "22",
		"state": "Chhattisgarh",
	
	},
	{
		"code": "23",
		"state": "Madhya Pradesh",
	
	},
	{
		"code": "24",
		"state": "Gujarat",
	
	},
	{
		"code": "25",
		"state": "Daman & Diu",
	
	},
	{
		"code": "26",
		"state": "Dadra & Nagar Haveli",
		
	},
	{
		"code": "27",
		"state": "Maharashtra",
		
	},
	{
		"code": "28",
		"state": "Andhra Pradesh",
		
	},
	{
		"code": "29",
		"state": "Karnataka",
		"": ""
	},
	{
		"code": "30",
		"state": "Goa",
	
	},
	{
		"code": "31",
		"state": "Lakshdweep",
	
	},
	{
		"code": "32",
		"state": "Kerala",
	
	},
	{
		"code": "33",
		"state": "Tamil Nadu",
	
	},
	{
		"code": "34",
		"state": "Pondicherry",
	
	},
	{
		"code": "35",
		"state": "Andaman & Nicobar Islands",
		
	}
	
]

var gst = [
	{
		"HSN": "303",
		" Description of Goods": "Fish; frozen; excluding fish fillets and other fish meat of heading 0304",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "304",
		" Description of Goods": "Fish fillets and other fish meat (whether or not minced); frozen",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "305",
		" Description of Goods": "Fish; dried; salted or in brine; smoked fish; whether or not cooked before or during the smoking process; flours; meals and pellets of fish; fit for human consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "306",
		" Description of Goods": "Crustaceans; whether in shell or not; frozen; dried; salted or in brine; crustaceans; in shell; cooked by steaming or by boiling in water; frozen; dried; salted or in brine; flours; meals and pellets of crustaceans; fit for human consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "307",
		" Description of Goods": "Molluscs; whether in shell or not; frozen; dried; salted or in brine; aquatic invertebrates other than crustaceans and molluscs; frozen; dried; salted or in brine; flours; meals and pellets of aquatic invertebra other than crustaceans; fit for human consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "308",
		" Description of Goods": "Aquatic invertebrates other than crustaceans and molluscs; frozen; dried; salted or in brine; smoked aquatic invertebrates other than crustaceans and molluscs; whether or not cooked before or during the smoking process: flours; meals and pellets of aquatic invertebrates other than crustaceans and molluscs; fit for human consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "401",
		" Description of Goods": "Ultra High Temperature (UHT) milk",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "402",
		" Description of Goods": "Milk and cream; concentrated or containing added sugar or other sweetening matter; including skimmed milk powder; milk food for babies [other than condensed milk]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "403",
		" Description of Goods": "Cream; yogurt; kephir and other fermented or acidified milk and cream; whether or not concentrated or containing added sugar or other sweetening matter or flavoured or containing added fruit; nuts or cocoa",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "404",
		" Description of Goods": "Whey; whether or not concentrated or containing added sugar or other sweetening matter; products consisting of natural milk constituents; whether or not containing added sugar or other sweetening matter; not elsewhere specified or included",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "406",
		" Description of Goods": "Chena or paneer put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "408",
		" Description of Goods": "Birds' eggs; not in shell; and egg yolks; fresh; dried; cooked by steaming or by boiling in water; moulded; frozen or otherwise preserved; whether or not containing added sugar or other sweetening matter.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "409",
		" Description of Goods": "Natural honey; put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "410",
		" Description of Goods": "Edible products of animal origin; not elsewhere specified or included",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "502",
		" Description of Goods": "Pigs'; hogs' or boars' bristles and hair; badger hair and other brush making hair; waste of such bristles or hair.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "504",
		" Description of Goods": "Guts; bladders and stomachs of animals (other than fish); whole and pieces thereof; fresh; chilled; frozen; salted; in brine; dried or smoked.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "505",
		" Description of Goods": "Skins and other parts of birds; with their feathers or down; feathers and parts of feathers (whether or not with trimmed edges) and down; not further worked than cleaned; disinfected or treated for preservation; powder and waste of feathers or parts of feathers",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "0507 [Except 050790]",
		" Description of Goods": "Ivory; tortoise-shell; whalebone and whalebone hair; horns; unworked or simply prepared but not cut to shape; powder and waste of these products.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "508",
		" Description of Goods": "Coral and similar materials; unworked or simply prepared but not otherwise worked; shells of molluscs; crustaceans or echinoderms and cuttle-bone; unworked or simply prepared but not cut to shape; powder and waste thereof.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "510",
		" Description of Goods": "Ambergris; castoreum; civet and musk; cantharides; bile; whether or not dried; glands and other animal products used in the preparation of pharmaceutical products; fresh; chilled; frozen or otherwise provisionally preserved.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "511",
		" Description of Goods": "Animal products not elsewhere specified or included; dead animals of Chapter 1 or 3; unfit for human consumption; other than semen including frozen semen.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "7",
		" Description of Goods": "Herb; bark; dry plant; dry root; commonly known as jaribooti and dry flower",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "710",
		" Description of Goods": "Vegetables (uncooked or cooked by steaming or boiling in water); frozen",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "711",
		" Description of Goods": "Vegetables provisionally preserved (for example; by sulphur dioxide gas; in brine; in sulphur water or in other preservative solutions); but unsuitable in that state for immediate consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "713",
		" Description of Goods": "Dried leguminous vegetables; shelled; whether or not skinned or split [put up in unit container and bearing a registered brand name]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "714",
		" Description of Goods": "Manioc; arrowroot; salep; Jerusalem artichokes; sweet potatoes and similar roots and tubers with high starch or inulin content; frozen or dried; whether or not sliced or in the form of pellets",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "801",
		" Description of Goods": "Cashew nuts; whether or not shelled or peeled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "802",
		" Description of Goods": "Dried areca nuts; whether or not shelled or peeled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "802",
		" Description of Goods": "Dried chestnuts (singhada); whether or not shelled or peeled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8",
		" Description of Goods": "Dried makhana; whether or not shelled or peeled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "806",
		" Description of Goods": "Grapes; dried; and raisins",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "811",
		" Description of Goods": "Fruit and nuts; uncooked or cooked by steaming or boiling in water; frozen; whether or not containing added sugar or other sweetening matter",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "812",
		" Description of Goods": "Fruit and nuts; provisionally preserved (for example; by sulphur dioxide gas; in brine; in sulphur water or in other preservative solutions); but unsuitable in that state for immediate consumption",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "814",
		" Description of Goods": "Peel of citrus fruit or melons (including watermelons); frozen; dried or provisionally preserved in brine; in sulphur water or in other preservative solutions",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "901",
		" Description of Goods": "Coffee; whether or not roasted or decaffeinated; coffee husks and skins; coffee substitutes containing coffee in any proportion [other than coffee beans not roasted]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "902",
		" Description of Goods": "Tea; whether or not flavoured [other than unprocessed green leaves of tea]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "903",
		" Description of Goods": "Maté",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "904",
		" Description of Goods": "Pepper of the genus Piper; dried or crushed or ground fruits of the genus Capsicum or of the genus Pimenta",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "905",
		" Description of Goods": "Vanilla",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "906",
		" Description of Goods": "Cinnamon and cinnamon-tree flowers",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "907",
		" Description of Goods": "Cloves (whole fruit; cloves and stems)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "908",
		" Description of Goods": "Nutmeg; mace and cardamoms",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "909",
		" Description of Goods": "Seeds of anise; badian; fennel; coriander; cumin or caraway; juniper berries [other than of seed quality]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "0910 [other than 0910 11 10; 0910 30 10]",
		" Description of Goods": "Ginger other than fresh ginger; saffron; turmeric (curcuma) other than fresh turmeric; thyme; bay leaves; curry and other spices",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "10",
		" Description of Goods": "All goods i.e. cereals; put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1001",
		" Description of Goods": "Wheat and meslin put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1002",
		" Description of Goods": "Rye put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1003",
		" Description of Goods": "Barley put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1004",
		" Description of Goods": "Oats put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1005",
		" Description of Goods": "Maize (corn) put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1006",
		" Description of Goods": "Rice put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1007",
		" Description of Goods": "Grain sorghum put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1008",
		" Description of Goods": "Buckwheat; millet and canary seed; other cereals such as Jawar; Bajra; Ragi] put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1101",
		" Description of Goods": "Wheat or meslin flour put up in unit container and bearing a registered brand name.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1102",
		" Description of Goods": "Cereal flours other than of wheat or meslin i.e. maize (corn) flour; Rye flour; etc. put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1103",
		" Description of Goods": "Cereal groats; meal and pellets; including suji and dalia; put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1104",
		" Description of Goods": "Cereal grains otherwise worked (for example; rolled; flaked; pearled; sliced or kibbled); except rice of heading 1006; germ of cereals; whole; rolled; flaked or ground [other than hulled cereal grains]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1105",
		" Description of Goods": "Meal; powder; flakes; granules and pellets of potatoes put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1106",
		" Description of Goods": "Meal and powder of the dried leguminous vegetables of heading 0713 (pulses) [other than guar meal 1106 10 10 and guar gum refined split 1106 10 90]; of sago or of roots or tubers of heading 0714 or of the products of Chapter 8; put up in unit container and bearing a registered brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1106 10 10",
		" Description of Goods": "Guar meal",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1106 10 90",
		" Description of Goods": "Guar gum refined split",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1109 00 00",
		" Description of Goods": "Wheat gluten; whether or not dried",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "12",
		" Description of Goods": "All goods other than of seed quality",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1201",
		" Description of Goods": "Soya beans; whether or not broken other than of seed quality.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1202",
		" Description of Goods": "Ground-nuts; not roasted or otherwise cooked; whether or not shelled or broken other than of seed quality.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1203   ",
		" Description of Goods": "Copra other than of seed quality",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1204",
		" Description of Goods": "Linseed; whether or not broken other than of seed quality.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1205",
		" Description of Goods": "Rape or colza seeds; whether or not broken other than of seed quality.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1206",
		" Description of Goods": "Sunflower seeds; whether or not broken other than of seed quality",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1207",
		" Description of Goods": "Other oil seeds and oleaginous fruits (i.e. Palm nuts and kernels; cotton seeds; Castor oil seeds; Sesamum seeds; Mustard seeds; Saffower (Carthamustinctorius) seeds; Melon seeds; Poppy seeds; Ajams; Mango kernel; Niger seed; Kokam) whether or not broken; other than of seed quality",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1208",
		" Description of Goods": "Flour and meals of oil seeds or oleaginous fruits; other than those of mustard",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1210",
		" Description of Goods": "Hop cones; dried; whether or not ground; powdered or in the form of pellets; lupulin",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1211",
		" Description of Goods": "Plants and parts of plants (including  seeds and fruits); of a kind used primarily in perfumery; in pharmacy or for insecticidal; fungicidal or similar purpose; frozen or dried; whether or not cut; crushed or powdered",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1212",
		" Description of Goods": "Locust beans; seaweeds and other algae; sugar beet and sugar cane; frozen or dried; whether or not ground; fruit stones and kernels and other vegetable products (including unroasted chicory roots of the variety Cichoriumintybussativum) of a kind used primarily for human consumption; not elsewhere specified or included",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1301",
		" Description of Goods": "Natural gums; resins; gum-resins and oleoresins (for example; balsams) [other than lac and shellac]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1301",
		" Description of Goods": "Compounded asafoetida commonly known as heeng",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1401",
		" Description of Goods": "Vegetable materials of a kind used primarily for plaiting (for example; bamboos; rattans; reeds; rushes; osier; raffia; cleaned; bleached or dyed cereal straw; and lime bark)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1404 [other than 1404 90 10; 1404 90 40; 1404 90 50]",
		" Description of Goods": "Vegetable products not elsewhere specified or included such as cotton linters; Cotton linters; Soap nuts; Hard seeds; pips; hulls and nuts; of a kind used primarily for carving; coconut shell; unworked; Rudraksha seeds [other than bidi wrapper leaves (tendu); betel leaves; Indian katha]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1507",
		" Description of Goods": "Soya-bean oil and its fractions; whether or not refined; but not chemically modified",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1508",
		" Description of Goods": "Ground-nut oil and its fractions; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1509",
		" Description of Goods": "Olive oil and its fractions; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1510",
		" Description of Goods": "Other oils and their fractions; obtained solely from olives; whether or not refined; but not chemically modified; including blends of these oils or fractions with oils or fractions of heading 1509",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1511",
		" Description of Goods": "Palm oil and its fractions; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1512",
		" Description of Goods": "Sunflower-seed; safflower or cotton-seed oil and fractions thereof; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1513",
		" Description of Goods": "Coconut (copra); palm kernel or babassu oil and fractions thereof; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1514",
		" Description of Goods": "Rape; colza or mustard oil and fractions thereof; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1515",
		" Description of Goods": "Other fixed vegetable fats and oils (including jojoba oil) and their fractions; whether or not refined; but not chemically modified.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1516",
		" Description of Goods": "Vegetable fats and oils and their fractions; partly or wholly hydrogenated; inter-esterified; re-esterified or elaidinised; whether or not refined; but not further prepared.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1517",
		" Description of Goods": "Edible mixtures or preparations of  vegetable fats or vegetable oils or of fractions of different vegetable fats or vegetable oils of this Chapter; other than edible fats or oils or their fractions of heading 1516",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1518",
		" Description of Goods": "Vegetable fats and oils and their fractions; boiled; oxidised; dehydrated; sulphurised; blown; polymerised by heat in vacuum or in inert gas or otherwise chemically modified; excluding those of heading 1516",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1701",
		" Description of Goods": "Beet sugar; cane sugar; khandsari sugar",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1702",
		" Description of Goods": "Palmyra sugar",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1801",
		" Description of Goods": "Cocoa beans whole or broken; raw or roasted",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1802",
		" Description of Goods": "Cocoa shells; husks; skins and other cocoa waste",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1803",
		" Description of Goods": "Cocoa paste whether or not de-fatted",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1901 20 00",
		" Description of Goods": "Mixes and doughs for the preparation of bread; pastry and other baker's wares",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1902",
		" Description of Goods": "Seviyan (vermicelli)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1903",
		" Description of Goods": "Tapioca and substitutes therefor prepared from starch; in the form of flakes; grains; pearls; siftings or in similar forms. (sabudana)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1905",
		" Description of Goods": "Pizza bread",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "1905 40 00",
		" Description of Goods": "Rusks; toasted bread and similar toasted products",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2106 90",
		" Description of Goods": "Sweetmeats",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2201 90 10",
		" Description of Goods": "Ice and snow",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2301",
		" Description of Goods": "Flours; meals and pellets; of meat or meat offal; of fish or of crustaceans; molluscs or other aquatic invertebrates; unfit for human consumption; greaves",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2303",
		" Description of Goods": "Residues of starch manufacture and similar residues; beet-pulp; bagasse and other waste of sugar manufacture; brewing or distilling dregs and waste; whether or not in the form of pellets",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2304",
		" Description of Goods": "Oil-cake and other solid residues; whether or not ground or in the form of pellets; resulting from the extraction of soyabean oil [other than aquatic feed including shrimp feed and prawn feed; poultry feed & cattle feed; including grass; hay & straw; supplement & husk of pulses; concentrates & additives; wheat bran & de-oiled cake]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2305",
		" Description of Goods": "Oil-cake and other solid residues; whether or not ground or in the form of pellets; resulting from the extraction of ground-nut oil[other than aquatic feed including shrimp feed and prawn feed; poultry feed & cattle feed; including grass; hay & straw; supplement & husk of pulses; concentrates & additives; wheat bran & de-oiled cake]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2306",
		" Description of Goods": "Oil-cake and other solid residues; whether or not ground or in the form of pellets; resulting from the extraction of vegetable fats or oils; other than those of heading 2304 or 2305[other than aquatic feed including shrimp feed and prawn feed; poultry feed & cattle feed; including grass; hay & straw; supplement & husk of pulses; concentrates & additives; wheat bran & de-oiled cake]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2307",
		" Description of Goods": "Wine lees; argol",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2401",
		" Description of Goods": "Tobacco leaves",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2502",
		" Description of Goods": "Unroasted iron pyrites.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2503[except 2503 00 10]",
		" Description of Goods": "Sulphur of all kinds; other than sublimed sulphur; precipitated sulphur and colloidal sulphur [other than sulphur recovered as by-product in refining of crude oil]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2504",
		" Description of Goods": "Natural graphite.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2505",
		" Description of Goods": "Natural sands of all kinds; whether or not coloured; other than metal bearing sands of Chapter 26.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2506",
		" Description of Goods": "Quartz (other than natural sands); quartzite; whether or not roughly trimmed or merely cut; by sawing or otherwise; into blocks or slabs of a rectangular (including square) shape.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2507",
		" Description of Goods": "Kaolin and other kaolinic clays; whether or not calcined.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2508",
		" Description of Goods": "Other clays (not including expanded clays of heading 6806); andalusite; kyanite and sillimanite; whether or not calcined; mullite; chamotte or dinas earths.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2509",
		" Description of Goods": "Chalk.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2510",
		" Description of Goods": "Natural calcium phosphates; natural aluminium calcium phosphates and phosphatic chalk.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2511",
		" Description of Goods": "Natural barium sulphate (barytes); natural barium carbonate (witherite); whether or not calcined; other than barium oxide of heading 2816.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2512",
		" Description of Goods": "Siliceous fossil meals (for example; kieselguhr; tripolite and diatomite) and similar siliceous earths; whether or not calcined; of an apparent specific gravity of 1 or less.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2513",
		" Description of Goods": "Pumice stone; emery; natural corundum; natural garnet and other natural abrasives; whether or not heat-treated.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2514",
		" Description of Goods": "Slate; whether or not roughly trimmed or merely cut; by sawing or otherwise; into blocks or slabs of a rectangular (including square) shape.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2515 [Except 2515 12 10; 2515 12 20; 2515 12 90]",
		" Description of Goods": "Ecaussine and other calcareous monumental or building stone; alabaster [other than marble and travertine]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2516 [Except 2516 11 00; 2516 12 00]",
		" Description of Goods": "Porphyry; basalt; sandstone and other monumental or building stone; whether or not roughly trimmed or merely cut; by sawing or otherwise; into blocks or slabs of a rectangular (including square) shape.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2516 11 00",
		" Description of Goods": "Granite crude or roughly trimmed",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2517",
		" Description of Goods": "Pebbles; gravel; broken or crushed stone; of a kind commonly used for concrete aggregates; for road metalling or for railway or other ballast; shingle and flint; whether or not heat-treated; macadam of slag; dross or similar industrial waste; whether or not incorporating the materials cited in the first part of the heading; tarred macadam; grenules cheeping and powder of stones heading 2515 or 2516 whether or not heat treated.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2518",
		" Description of Goods": "Dolomite; whether or not calcined or sintered; including dolomite roughly trimmed or merely cut; by sawing or otherwise; into blocks or slabs of a rectangular (including square) shape; dolomite ramming mix. 2518 10 dolomite; Not calcined or sintered",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2519",
		" Description of Goods": "Natural magnesium carbonate (magnesite); fused magnesia; dead-burned (sintered) magnesia; whether or not containing small quantities of other oxides added before sintering; other magnesium oxide; whether or not pure.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2520",
		" Description of Goods": "Gypsum; anhydrite; plasters (consisting of calcined gypsum or calcium sulphate) whether or not coloured; with or without small quantities of accelerators or retarders.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2521",
		" Description of Goods": "Limestone flux; limestone and other calcareous stone; of a kind used for the manufacture of lime or cement.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2522",
		" Description of Goods": "Quicklime; slaked lime and hydraulic lime; other than calcium oxide and hydroxide of heading 2825.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2524  ",
		" Description of Goods": "Asbestos",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2525",
		" Description of Goods": "Mica; including splitting; mica waste.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2526",
		" Description of Goods": "Natural steatite; whether or not roughly trimmed or merely cut; by sawing or otherwise; into blocks or slabs of a rectangular (including square) shape; talc.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2528",
		" Description of Goods": "Natural borates and concentrates thereof (whether or not calcined); but not including borates separated from natural brine; natural boric acid containing not more than 85% of H3BO3",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2529",
		" Description of Goods": "Feldspar; leucite; nepheline and nepheline syenite; fluorspar.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2530",
		" Description of Goods": "Mineral substances not elsewhere specified or included.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "26 [other than 2619; 2620; 2621]",
		" Description of Goods": "All ores and concentrates [other than slag; dross (other than granulated slag); scalings and other waste from the manufacture of iron or steel; slag; ash and residues (other than from the manufacture of iron or steel) containing metals; arsenic or their compounds; other slag and ash; including seaweed ash (kelp); ash and residues from the incineration of municipal waste]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2601",
		" Description of Goods": "Iron ores and concentrates; including roasted iron pyrites",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2602",
		" Description of Goods": "Manganese ores and concentrates; including ferruginous manganese ores and concentrates with a manganese content of 20% or more; calculated on the dry weight.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2603",
		" Description of Goods": "Copper ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2604",
		" Description of Goods": "Nickel ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2605",
		" Description of Goods": "Cobalt ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2606",
		" Description of Goods": "Aluminium ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2607",
		" Description of Goods": "Lead ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2608",
		" Description of Goods": "Zinc ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2609",
		" Description of Goods": "Tin ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2610",
		" Description of Goods": "Chromium ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2611",
		" Description of Goods": "Tungsten ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2612",
		" Description of Goods": "Uranium or thorium ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2613",
		" Description of Goods": "Molybdenum ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2614",
		" Description of Goods": "Titanium ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2615",
		" Description of Goods": "Niobium; tantalum; vanadium or zirconium ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2616",
		" Description of Goods": "Precious metal ores and concentrates.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2617",
		" Description of Goods": "Other ores and concentrates",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2618",
		" Description of Goods": "Granulated slag (slag sand) from the manufacture of iron or steel",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "27",
		" Description of Goods": "Bio-gas",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2701",
		" Description of Goods": "Coal; briquettes; ovoids and similar solid fuels manufactured from coal",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2702",
		" Description of Goods": "Lignite; whether or not agglomerated; excluding jet",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2703",
		" Description of Goods": "Peat (including peat litter); whether or not agglomerated",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2704",
		" Description of Goods": "Coke and semi coke of coal; of lignite or of peat; whether or not agglomerated; retort carbon",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2705",
		" Description of Goods": "Coal gas; water gas; producer gas and similar gases; other than petroleum gases and other gaseous hydrocarbons",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2706",
		" Description of Goods": "Tar distilled from coal; from lignite or from peat",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2710",
		" Description of Goods": "Kerosene PDS",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2711 12 00; 2711 13 00; 2710 19 00",
		" Description of Goods": "Liquefied Propane and Butane mixture; Liquefied Propane; Liquefied Butane and Liquefied Petroleum Gases (LPG) for supply to household domestic consumers or to non-domestic exempted category (NDEC) customers by the Indian Oil Corporation Limited; Hindustan petroleum Corporation Limited or Bharat Petroleum Corporation Limited.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "28",
		" Description of Goods": "Thorium oxalate",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "28",
		" Description of Goods": "Enriched KBF4 (enriched potassium fluroborate)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "28",
		" Description of Goods": "Enriched elemental boron",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "28",
		" Description of Goods": "Nuclear fuel",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2805 11",
		" Description of Goods": "Nuclear grade sodium",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2845",
		" Description of Goods": "Heavy water and other nuclear fuels",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "2853",
		" Description of Goods": "Compressed air",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Insulin",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3002; 3006",
		" Description of Goods": "Animal or Human Blood Vaccines",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Diagnostic kits for detection of all types of hepatitis",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Desferrioxamine injection or deferiprone",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Cyclosporin",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Medicaments (including veterinary medicaments) used in bio-chemic systems and not bearing a brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Oral re-hydration salts",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30 or any chapter",
		" Description of Goods": "Drugs or medicines including their salts and esters and diagnostic test kits; specified in List 1 appended to this Schedule",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "30",
		" Description of Goods": "Formulations manufactured from the bulk drugs specified in List 2 appended to this Schedule",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3101",
		" Description of Goods": "All goods i.e. animal or vegetable fertilisersor organic fertilisers put up in unit containers and bearing a brand name",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "32",
		" Description of Goods": "Wattle extract; quebracho extract; chestnut extract",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3202",
		" Description of Goods": "Enzymatic preparations for pre-tanning",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3307 41 00",
		" Description of Goods": "Agarbatti",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3402",
		" Description of Goods": "Sulphonated castor oil; fish oil or sperm oil",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "3605 00 10",
		" Description of Goods": "Handmade safety matches Explanation.– For the purposes of this entry; handmade matches mean matches; in or in relation to the manufacture of which; none of the following processes is ordinarily carried on with the aid of power; namely: - (i)        frame filling; (ii)     dipping of splints in the composition for match heads; (iii)   filling of boxes with matches; (iv)    pasting of labels on match boxes; veneers or cardboards; (v)      packaging",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4001",
		" Description of Goods": "Natural rubber; balata; gutta-percha; guayule; chicle and similar natural gums; in primary forms or in plates; sheets or strip",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4016",
		" Description of Goods": "Toy balloons made of natural rubber latex",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4011; 4013",
		" Description of Goods": "Pneumatic tyres or inner tubes; of rubber; of a kind used on / in bicycles; cycle -rickshaws and three wheeled powered cycle rickshaws",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4016",
		" Description of Goods": "Erasers",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4101",
		" Description of Goods": "Raw hides and skins of bovine (including buffalo) or equine animals (fresh; or salted; dried; limed; pickled or otherwise preserved; but not tanned; parchment-dressed or further prepared); whether or not dehaired or split",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4102",
		" Description of Goods": "Raw skins of sheep or lambs (fresh; or salted; dried; limed; pickled or otherwise preserved; but not tanned; parchment-dressed or further prepared); whether or not with wool on or split",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4103",
		" Description of Goods": "Other raw hides and skins (fresh; or salted; dried; limed; pickled or otherwise preserved; but not tanned; parchment-dressed or further prepared); whether or not dehaired or split",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4104",
		" Description of Goods": "Tanned or crust hides and skins of bovine (including buffalo) or equine animals; without hair on; whether or not split; but not further prepared",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4105",
		" Description of Goods": "Tanned or crust skins of sheep or lambs; without wool on; whether or not split; but not further prepared",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4106",
		" Description of Goods": "Tanned or crust hides and skins of other animals; without wool or hair on; whether or not split; but not further prepared",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4401",
		" Description of Goods": "Wood in chips or particles; sawdust and wood waste and scrap; whether or not agglomerated in logs; briquettes; pellets or similar forms",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4801",
		" Description of Goods": "Newsprint; in rolls or sheets",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4823",
		" Description of Goods": "Kites",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "4901",
		" Description of Goods": "Brochures; leaflets and similar printed matter; whether or not in single sheets",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5004 to 5006",
		" Description of Goods": "Silk yarn",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5007",
		" Description of Goods": "Woven fabrics of silk or of silk waste",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5104",
		" Description of Goods": "Garneted stock of wool or of fine or coarse animal hair; shoddy wool",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5105",
		" Description of Goods": "Wool and fine or coarse animal hair; carded or combed",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5106 to 5110",
		" Description of Goods": "Yarn of wool or of animal hair",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5111 to 5113",
		" Description of Goods": "Woven fabrics of wool or of animal hair",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5201 to 5203",
		" Description of Goods": "Cotton and Cotton waste",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5204",
		" Description of Goods": "Cotton sewing thread; whether or not put up for retail sale",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5205 to 5207",
		" Description of Goods": "Cotton yarn [other than khadi yarn]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5208 to 5212",
		" Description of Goods": "Woven fabrics of cotton",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5301",
		" Description of Goods": "All goods i.e. flax; raw or processed but not spun; flax tow and waste (including yarn waste and garneted stock)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5302",
		" Description of Goods": "True hemp (Cannabis sativa L); raw or processed but not spun; tow and waste of true hemp (including yarn waste and garneted stock)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5303",
		" Description of Goods": "All goods i.e. textile bast fibres [other than jute fibres; raw or processed but not spun]; tow and waste of these fibres (including yarn waste and garneted stock)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5305 to 5308",
		" Description of Goods": "All goods [other than coconut coir fibre] including yarn of flax; jute; other textile bast fibres; other vegetable textile fibres; paper yarn",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5309 to 5311",
		" Description of Goods": "Woven fabrics of other vegetable textile fibres; paper yarn",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5407; 5408",
		" Description of Goods": "Woven fabrics of manmade textile materials",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5512 to 5516",
		" Description of Goods": "Woven fabrics of manmade staple fibres",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5705",
		" Description of Goods": "Coir mats; matting and floor covering",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "5809; 5810",
		" Description of Goods": "Embroidery or zari articles; that is to say;- imi; zari; kasab; saima; dabka; chumki; gotasitara; naqsi; kora; glass beads; badla; glzal",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "60",
		" Description of Goods": "Knitted or crocheted fabrics [All goods]",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "61  ",
		" Description of Goods": "Articles of apparel and clothing accessories; knitted or crocheted; of sale value not exceeding Rs. 1000 per piece",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": " 62",
		" Description of Goods": "Articles of apparel and clothing accessories; not knitted or crocheted; of sale value not exceeding Rs. 1000 per piece",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "63  ",
		" Description of Goods": "Other made up textile articles; sets; worn clothing and worn textile articles and rags; of sale value not exceeding Rs. 1000 per piece",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "64",
		" Description of Goods": "Footwear having a retail sale price not exceeding Rs.500 per pair; provided that such retail sale price is indelibly marked or embossed on the footwear itself.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "6901 00 10",
		" Description of Goods": "Bricks of fossil meals or similar siliceous earths",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "6904 10 00",
		" Description of Goods": "Building bricks",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "6905 10 00",
		" Description of Goods": "Earthen or roofing tiles",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "7018",
		" Description of Goods": "Glass beads.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "84",
		" Description of Goods": "Pawan Chakki that is Air Based Atta Chakki",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8413; 8413 91",
		" Description of Goods": "Hand pumps and parts thereof",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8419 19",
		" Description of Goods": "Solar water heater and system",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8437",
		" Description of Goods": "Machines for cleaning; sorting or grading; seed; grain or dried leguminous vegetables; machinery used in milling industry or for the working of cereals or dried leguminous vegetables other than farm type machinery and parts thereof",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "84 or 85",
		" Description of Goods": "Following renewable energy devices & parts for their manufacture (a)   Bio-gas plant (b)   Solar power based devices (c)   Solar power generating system (d)   Wind mills; Wind Operated Electricity Generator (WOEG) (e)   Waste to energy plants / devices (f)    Solar lantern / solar lamp (g)   Ocean waves/tidal waves energy devices/plants",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8601",
		" Description of Goods": "Rail locomotives powered from an external source of electricity or by electric accumulators",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8602",
		" Description of Goods": "Other rail locomotives; locomotive tenders; such as Diesel-electric locomotives; Steam locomotives and tenders thereof",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8603",
		" Description of Goods": "Self-propelled railway or tramway coaches; vans and trucks; other than those of heading 8604",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8604",
		" Description of Goods": "Railway or tramway maintenance or service vehicles; whether or not self-propelled (for example; workshops; cranes; ballast tampers; trackliners; testing coaches and track inspection vehicles)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8605",
		" Description of Goods": "Railway or tramway passenger coaches; not self-propelled; luggage vans; post office coaches and other special purpose railway or tramway coaches; not self-propelled (excluding those of heading 8604)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8606",
		" Description of Goods": "Railway or tramway goods vans and wagons; not self-propelled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8607",
		" Description of Goods": "Parts of railway or tramway locomotives or rolling-stock; such as Bogies; bissel-bogies; axles and wheels; and parts thereof",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8608",
		" Description of Goods": "Railway or tramway track fixtures and fittings; mechanical (including electro-mechanical) signalling; safety or traffic control equipment for railways; tramways; roads; inland waterways; parking facilities; port installations or airfields; parts of the foregoing",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8713",
		" Description of Goods": "Carriages for disabled persons; whether or not motorised or otherwise mechanically propelled",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8802",
		" Description of Goods": "Other aircraft (for example; helicopters; aeroplanes); other than those for personal use.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8803",
		" Description of Goods": "Parts of goods of heading 8802",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8901",
		" Description of Goods": "Cruise ships; excursion boats; ferry-boats; cargo ships; barges and similar vessels for the transport of persons or goods",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8902",
		" Description of Goods": "Fishing vessels; factory ships and other vessels for processing or preserving fishery products",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8904",
		" Description of Goods": "Tugs and pusher craft",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8905",
		" Description of Goods": "Light-vessels; fire-floats; dredgers; floating cranes and other vessels the navigability of which is subsidiary to their main function; floating docks; floating or submersible drilling or production platforms",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8906",
		" Description of Goods": "Other vessels; including warships and lifeboats other than rowing boats",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "8907",
		" Description of Goods": "Other floating structures (for example; rafts; tanks; coffer-dams; landing-stages; buoys and beacons)",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "Any chapter",
		" Description of Goods": "Parts of goods of headings 8901; 8902; 8904; 8905; 8906; 8907",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "90",
		" Description of Goods": "Coronary stents and coronary stent systems for use with cardiac catheters",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "90 or any other Chapter",
		" Description of Goods": "Artificial kidney",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "90 or 84",
		" Description of Goods": "Disposable sterilized dialyzer or micro barrier of artificial kidney",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "90 or any other Chapter",
		" Description of Goods": "Parts of the following goods; namely:- (i)                 Crutches; (ii)              Wheel chairs; (iii)            Walking frames; (iv)             Tricycles; (v)               Braillers; and (vi)             Artificial limbs",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "90 or any other Chapter",
		" Description of Goods": "Assistive devices; rehabilitation aids and other goods for disabled; specified in List 3 appended to this Schedule",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9405 50 31",
		" Description of Goods": "Kerosene pressure lantern",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9405 91 00; 9405 92 00 or 9405 99 00",
		" Description of Goods": "Parts of kerosene pressure lanterns including gas mantles",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9603 10 00",
		" Description of Goods": "Broomsticks",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9704",
		" Description of Goods": "Postage or revenue stamps; stamp-postmarks; first-day covers; postal stationery (stamped paper); and the like; used or unused; other than those of heading 4907",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9705",
		" Description of Goods": "Numismatic coins",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "9804",
		" Description of Goods": "Drugs or medicines including their salts and esters and diagnostic test kits specified at S.No.180 above and Formulations specified at S.No.181 above; intended for personal use.",
		"CGST": "2.5",
		"SGST": "2.5",
		"IGST": "5"
	},
	{
		"HSN": "01012100; 010129",
		" Description of Goods": "Live horses",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "202",
		" Description of Goods": "Meat of bovine animals; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "203",
		" Description of Goods": "Meat of swine; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "204",
		" Description of Goods": "Meat of sheep or goats; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "205",
		" Description of Goods": "Meat of horses; asses; mules or hinnies; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "206",
		" Description of Goods": "Edible offal of bovine animals; swine; sheep; goats; horses; asses; mules or hinnies; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "207",
		" Description of Goods": "Meat and edible offal; of the poultry of heading 0105; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "208",
		" Description of Goods": "Other meat and edible meat offal; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "209",
		" Description of Goods": "Pig fat; free of lean meat; and poultry fat; not rendered or otherwise extracted; frozen and put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "209",
		" Description of Goods": "Pig fat; free of lean meat; and poultry fat; not rendered or otherwise extracted; salted; in brine; dried or smoked; put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "210",
		" Description of Goods": "Meat and edible meat offal; salted; in brine; dried or smoked put up in unit containers; edible flours and meals of meat or meat offal put up in unit containers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "0405  ",
		" Description of Goods": "Butter and other fats (i.e. ghee; butter oil; etc.) and oils derived from milk; dairy spreads",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "406",
		" Description of Goods": "Cheese",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "801",
		" Description of Goods": "Brazil nuts; dried; whether or not shelled or peeled",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "802",
		" Description of Goods": "Other nuts; dried; whether or not shelled or peeled; such as Almonds; Hazelnuts or filberts (Coryius spp.); walnuts; Chestnuts (Castanea spp.); Pistachios; Macadamia nuts; Kola nuts (Cola spp.) [other than dried areca nuts]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "804",
		" Description of Goods": "Dates; figs; pineapples; avocados; guavas; mangoes and mangosteens; dried",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "813",
		" Description of Goods": "Fruit; dried; other than that of headings 0801 to 0806; mixtures of nuts or dried fruits of Chapter 8",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1108",
		" Description of Goods": "Starches; inulin",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1501",
		" Description of Goods": "Pig fats (including lard) and poultry fat; other than that of heading 0209 or 1503",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1502",
		" Description of Goods": "Fats of bovine animals; sheep or goats; other than those of heading 1503",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1503   ",
		" Description of Goods": "Lard stearin; lard oil; oleo stearin; oleo-oil and tallow oil; not emulsified or mixed or otherwise prepared",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1504",
		" Description of Goods": "Fats and oils and their fractions; of fish or marine mammals; whether or not refined; but not chemically modified",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1505",
		" Description of Goods": "Wool grease and fatty substances derived therefrom (including lanolin)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1506",
		" Description of Goods": "Other animal fats and oils and their fractions; whether or not refined; but not chemically modified",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1516",
		" Description of Goods": "Animal fats and oils and their fractions; partly or wholly hydrogenated; inter-esterified; re-esterified or elaidinised; whether or not refined; but not further prepared.",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1517",
		" Description of Goods": "Edible mixtures or preparations of  animal fats or animal oils or of fractions of different animal fats or animal oils of this Chapter; other than edible fats or oils or their fractions of heading 1516",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1518",
		" Description of Goods": "Animal fats and animal oils and their fractions; boiled; oxidised; dehydrated; sulphurised; blown; polymerised by heat in vacuum or in inert gas or otherwise chemically modified; excluding those of heading 1516; inedible mixtures or preparations of animal or vegetable fats or oils or of fractions of different fats or oils of this chapter; not elsewhere specified of included",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1601",
		" Description of Goods": "Sausages and similar products; of meat; meat offal or blood; food preparations based on these products",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1602",
		" Description of Goods": "Other prepared or preserved meat; meat offal or blood",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1603",
		" Description of Goods": "Extracts and juices of meat; fish or crustaceans; molluscs or other aquatic invertebrates",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1604",
		" Description of Goods": "Prepared or preserved fish; caviar and caviar substitutes prepared from fish eggs",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "1605",
		" Description of Goods": "Crustaceans; molluscs and other aquatic invertebrates prepared or preserved",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2001",
		" Description of Goods": "Vegetables; fruit; nuts and other edible parts of plants; prepared or preserved by vinegar or acetic acid",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2002",
		" Description of Goods": "Tomatoes prepared or preserved otherwise than by vinegar or acetic acid",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2003",
		" Description of Goods": "Mushrooms and truffles; prepared or preserved otherwise than by vinegar or acetic acid",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2004",
		" Description of Goods": "Other vegetables prepared or preserved otherwise than by vinegar or acetic acid; frozen; other than products of heading 2006",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2005",
		" Description of Goods": "Other vegetables prepared or preserved otherwise than by vinegar or acetic acid; not frozen; other than products of heading 2006",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2006",
		" Description of Goods": "Vegetables; fruit; nuts; fruit-peel and other parts of plants; preserved by sugar (drained; glacé or crystallised)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2007",
		" Description of Goods": "Jams; fruit jellies; marmalades; fruit or nut purée and fruit or nut pastes; obtained by cooking; whether or not containing added sugar or other sweetening matter",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2008",
		" Description of Goods": "Fruit; nuts and other edible parts of plants; otherwise prepared or preserved; whether or not containing added sugar or other sweetening matter or spirit; not elsewhere specified or included; such as Ground-nuts; Cashew nut; roasted; salted or roasted and salted; Other roasted nuts and seeds; squash of Mango; Lemon; Orange; Pineapple or other fruits",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2009",
		" Description of Goods": "Fruit juices (including grape must) and vegetable juices; unfermented and not containing added spirit; whether or not containing added sugar or other sweetening matter.",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2101 30",
		" Description of Goods": "Roasted chicory and other roasted coffee substitutes; and extracts; essences and concentrates thereof",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2102",
		" Description of Goods": "Yeasts and prepared baking powders",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2103 [other than 2103 90 10; 2103 90 30; 2103 90 40]",
		" Description of Goods": "Sauces and preparations therefor [other than Curry paste; mayonnaise and salad dressings; mixed condiments and mixed seasoning",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2106",
		" Description of Goods": "Texturised vegetable proteins (soya bari) and Bari made of pulses including mungodi",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2106 90",
		" Description of Goods": "Namkeens; bhujia; mixture; chabena and   similar edible preparations in ready for consumption form",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2202 90 10",
		" Description of Goods": "Soya milk drinks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2202 90 20",
		" Description of Goods": "Fruit pulp or fruit juice based drinks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2202 90 90",
		" Description of Goods": "Tender coconut water put up in unit container and bearing a registered brand name",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2202 90 30",
		" Description of Goods": "Beverages containing milk",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2515 12 10",
		" Description of Goods": "Marble and travertine blocks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2516",
		" Description of Goods": "Granite blocks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "28",
		" Description of Goods": "Anaesthetics",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "28",
		" Description of Goods": "Potassium Iodate",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "28",
		" Description of Goods": "Steam",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "28",
		" Description of Goods": "Micronutrients; which   are   covered   under serial number 1(f) of Schedule 1; Part (A) of the Fertilizer Control Order; 1985 and are manufactured by the manufacturers which    are    registered    under    the Fertilizer Control Order; 1985",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2801 20",
		" Description of Goods": "Iodine",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "2847",
		" Description of Goods": "Medicinal grade hydrogen peroxide",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "29",
		" Description of Goods": "Gibberellic acid",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3001",
		" Description of Goods": "Glands and other organs for organo-therapeutic uses; dried; whether or not powdered; extracts of glands or other organs or of their secretions for organo-therapeutic uses; heparin and its salts; other human or animal substances prepared for therapeutic or prophylactic uses; not elsewhere specified or included",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3002",
		" Description of Goods": "Animal blood prepared for therapeutic; prophylactic or diagnostic uses; antisera and other blood fractions and modified immunological products; whether or not obtained by means of biotechnological processes; toxins; cultures of micro-organisms (excluding yeasts) and similar products",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3003",
		" Description of Goods": "Medicaments (excluding goods of heading 30.02; 30.05 or 30.06) consisting of two or more constituents which have been mixed together for therapeutic or prophylactic uses; not put up in measured doses or in forms or packings for retail sale; including Ayurvaedic; Unani; Siddha; homoeopathic or Bio-chemic systems medicaments",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3004",
		" Description of Goods": "Medicaments (excluding goods of heading 30.02; 30.05 or 30.06) consisting of mixed or unmixed products for therapeutic or prophylactic uses; put up in measured doses (including those in the form of transdermal administration systems) or in forms or packings for retail sale; including Ayurvaedic; Unani; homoeopathic siddha or Bio-chemic systems medicaments; put up for retail sale",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3005",
		" Description of Goods": "Wadding; gauze; bandages and similar articles (for example; dressings; adhesive plasters; poultices); impregnated or coated with pharmaceutical substances or put up in forms or packings for retail sale for medical; surgical; dental or veterinary purposes",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3006",
		" Description of Goods": "Pharmaceutical goods specified in Note 4 to this Chapter [i.e. Sterile surgical catgut; similar sterile suture materials (including sterile absorbable surgical or dental yarns) and sterile tissue adhesives for surgical wound closure; sterile laminaria and sterile laminaria tents; sterile absorbable surgical or dental haemostatics; sterile surgical or denatal adhesion barriers; whether or not absorbable; Waste pharmaceuticals] [other than contraceptives]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3102",
		" Description of Goods": "Mineral or chemical fertilisers; nitrogenous; other than those which are clearly not to be used as fertilizers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3103",
		" Description of Goods": "Mineral or chemical fertilisers; phosphatic; other than those which are clearly not to be used as fertilizers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3104",
		" Description of Goods": "Mineral or chemical fertilisers; potassic; other than those which are clearly not to be used as fertilizers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3105",
		" Description of Goods": "Mineral or chemical fertilisers containing two or three of the fertilising elements nitrogen; phosphorus and potassium; other fertilisers; goods of this Chapter in tablets or similar forms or in packages of a gross weight not exceeding 10 kg; other than those which are clearly not to be used as fertilizers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3215",
		" Description of Goods": "Fountain pen ink",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3215",
		" Description of Goods": "Ball pen ink",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3306 10 10",
		" Description of Goods": "Tooth powder",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3307 41 00",
		" Description of Goods": "Odoriferous preparations which operate by burning [other than agarbattis]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "29; 30; 3302",
		" Description of Goods": "Following goods namely:- a.       Menthol and menthol crystals; b.      Peppermint (Mentha Oil); c.       Fractionated / de-terpenated mentha oil (DTMO); d.      De-mentholised oil (DMO); e.       Spearmint oil; f.        Mentha piperita oil",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3406",
		" Description of Goods": "Candles; tapers and the like",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3701",
		" Description of Goods": "Photographic plates and film for x-ray for medical use",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3705",
		" Description of Goods": "Photographic plates and films; exposed and developed; other than cinematographic film",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3706",
		" Description of Goods": "Photographic plates and films; exposed and developed; whether or not incorporating sound track or consisting only of sound track; other than feature films.",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3818",
		" Description of Goods": "Silicon wafers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3822",
		" Description of Goods": "All diagnostic kits and reagents",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3926",
		" Description of Goods": "Feeding bottles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "3926",
		" Description of Goods": "Plastic beads",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4007",
		" Description of Goods": "Latex Rubber Thread",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4014",
		" Description of Goods": "Nipples of feeding bottles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4015",
		" Description of Goods": "Surgical rubber gloves or medical examination rubber gloves",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4107",
		" Description of Goods": "Leather further prepared after tanning or crusting; including parchment-dressed leather; of bovine (including buffalo) or equine animals; without hair on; whether or not split; other than leather of heading 4114",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4112",
		" Description of Goods": "Leather further prepared after tanning or crusting; including parchment-dressed leather; of sheep or lamb; without wool on; whether or not split; other than leather of heading 4114",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4113",
		" Description of Goods": "Leather further prepared after tanning or crusting; including parchment-dressed leather; of other animals; without wool or hair on; whether or not split; other than leather of heading 4114",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4114",
		" Description of Goods": "Chamois (including combination chamois) leather; patent leather and patent laminated leather; metallised leather",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4115",
		" Description of Goods": "Composition leather with a basis of leather or leather fibre; in slabs; sheets or strip; whether or not in rolls; parings and other waste of leather or of composition leather; not suitable for the manufacture of leather articles; leather dust; powder and flour",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4203",
		" Description of Goods": "Gloves specially designed for use in sports",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "44 or any Chapter",
		" Description of Goods": "The following goods; namely: — a.    Cement Bonded Particle Board; b.    Jute Particle Board; c.    Rice Husk Board; d.    Glass-fibre Reinforced Gypsum Board (GRG) e.    Sisal-fibre Boards; f.     Bagasse Board; and g.    Cotton Stalk Particle Board h.    Particle/fibre board manufactured from agricultural crop residues",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4404",
		" Description of Goods": "Hoopwood; split poles; piles; pickets and stakes of wood; pointed but not sawn lengthwise; wooden sticks; roughly trimmed but not turned; bent or otherwise worked; suitable for the manufacture of walking-sticks; umbrellas; tool handles or the like",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4405",
		" Description of Goods": "Wood wool; wood flour",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4406",
		" Description of Goods": "Railway or tramway sleepers (cross-ties) of wood",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4408",
		" Description of Goods": "Sheets for veneering (including those obtained by slicing laminated wood); for plywood or for similar laminated wood and other wood; sawn lengthwise; sliced or peeled; whether or not planed; sanded; spliced or end-jointed; of a thickness not exceeding 6 mm [for match splints]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4415",
		" Description of Goods": "Packing cases; boxes; crates; drums and similar packings; of wood; cable-drums of wood; pallets; box pallets and other load boards; of wood; pallet collars of wood",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4416",
		" Description of Goods": "Casks; barrels; vats; tubs and other coopers' products and parts thereof; of wood; including staves",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4417",
		" Description of Goods": "Tools; tool bodies; tool handles; broom or brush bodies and handles; of wood; boot or shoe lasts and trees; of wood",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4420",
		" Description of Goods": "Wood marquetry and inlaid wood; caskets and cases for jewellery or cutlery; and similar articles; of wood; statuettes and other ornaments; of wood; wooden articles of furniture not falling in Chapter 94",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4421",
		" Description of Goods": "Other articles of wood; such as clothes hangers; Spools;  cops;  bobbins;  sewing thread reels and the like of turned wood for various textile machinery; Match splints; Pencil slats; Parts of wood;  namely oars;  paddles and rudders for ships; boats and other similar floating structures; Parts of domestic decorative articles used as tableware and kitchenware [other than Wood paving blocks; articles of densified wood not elsewhere included or specified; Parts of domestic decorative articles used as tableware and kitchenware]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4501",
		" Description of Goods": "Natural cork; raw or simply prepared",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4601",
		" Description of Goods": "Plaits and similar products of plaiting materials; whether or not assembled into strips; plaiting materials; plaits and similar products of plaiting materials; bound together in parallel strands or woven; in sheet form; whether or not being finished articles (for example; mats matting; screens) of vegetables materials such as of Bamboo; of rattan; of Other Vegetable materials",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4602",
		" Description of Goods": "Basketwork; wickerwork and other articles; made directly to shape from plaiting materials or made up from goods of heading 4601; articles of loofah",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4701",
		" Description of Goods": "Mechanical wood pulp",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4702",
		" Description of Goods": "Chemical wood pulp; dissolving grades",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4703",
		" Description of Goods": "Chemical wood pulp; soda or sulphate; other than dissolving grades",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4704",
		" Description of Goods": "Chemical wood pulp; sulphite; other than dissolving grades",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4705",
		" Description of Goods": "Wood pulp obtained by a combination of mechanical and chemical pulping processes",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4706",
		" Description of Goods": "Pulps of fibres derived from recovered (waste and scrap) paper or paperboard or of other fibrous cellulosic material",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4707",
		" Description of Goods": "Recovered (waste and scrap) paper or paperboard",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4802",
		" Description of Goods": "Uncoated paper and paperboard; of a kind used for writing; printing or other graphic purposes; and non perforated punch-cards and punch tape paper; in rolls or rectangular (including square) sheets; of any size; other than paper of heading 4801 or 4803; hand-made paper and paperboard",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4804",
		" Description of Goods": "Uncoated kraft paper and paperboard; in rolls or sheets; other than that of heading 4802 or 4803",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4805",
		" Description of Goods": "Other uncoated paper and paperboard; in rolls or sheets; not further worked or processed than as specified in Note 3 to this Chapter",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4806 20 00",
		" Description of Goods": "Greaseproof papers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4806 40 10",
		" Description of Goods": "Glassine papers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4807",
		" Description of Goods": "Composite paper and paperboard (made by sticking flat layers of paper or paperboard together with an adhesive); not surface-coated or impregnated; whether or not internally reinforced; in rolls or sheets",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4808",
		" Description of Goods": "Paper and paperboard; corrugated (with or without glued flat surface sheets); creped; crinkled; embossed or perforated; in rolls or sheets; other than paper of the kind described in heading 4803",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4810",
		" Description of Goods": "Paper and paperboard; coated on one or both sides with kaolin (China clay) or other inorganic substances; with or without a binder; and with no other coating; whether or not surface-coloured; surface-decorated or printed; in rolls or rectangular (including square) sheets of any size",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4811",
		" Description of Goods": "Aseptic packaging paper",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4817 30",
		" Description of Goods": "Boxes; pouches; wallets and writing compendiums; of paper or paperboard; containing an assortment of paper stationery",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4819",
		" Description of Goods": "Cartons; boxes and cases of corrugated paper or paper board",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4820",
		" Description of Goods": "Exercise book; graph book; & laboratory note book and notebooks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4823",
		" Description of Goods": "Paper pulp moulded trays",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "48",
		" Description of Goods": "Paper splints for matches; whether or not waxed; Asphaltic roofing sheets",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4904 00 00",
		" Description of Goods": "Music; printed or in manuscript; whether or not bound or illustrated",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4906 00 00",
		" Description of Goods": "Plans and drawings for architectural; engineering; industrial; commercial; topographical or similar purposes; being originals drawn by hand; hand-written texts; photographic reproductions on sensitised paper and carbon copies of the foregoing",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4907",
		" Description of Goods": "Unused postage; revenue or similar stamps of current or new issue in the country in which they have; or will have; a recognised face value; stamp-impressed paper; banknotes; cheque forms; stock; share or bond certificates and similar documents of title",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4908",
		" Description of Goods": "Transfers (decalcomanias)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4909",
		" Description of Goods": "Printed or illustrated postcards; printed cards bearing personal greetings; messages or announcements; whether or not illustrated; with or without envelopes or trimmings",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4910",
		" Description of Goods": "Calendars of any kind; printed; including calendar blocks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "4911",
		" Description of Goods": "Other printed matter; including printed pictures and photographs; such as Trade advertising material; Commercial catalogues and the like; printed Posters; Commercial catalogues; Printed inlay cards; Pictures; designs and photographs; Plan and drawings for architectural engineering; industrial; commercial; topographical or similar purposes reproduced with the aid of computer or any other devices",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5601",
		" Description of Goods": "Wadding of textile materials and articles thereof; such as Absorbent cotton wool",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5602",
		" Description of Goods": "Felt; whether or not impregnated; coated; covered or laminated",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5603",
		" Description of Goods": "Nonwovens; whether or not impregnated; coated; covered or laminated",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5604",
		" Description of Goods": "Rubber thread and cord; textile covered; textile yarn; and strip and the like of heading 5404 or 5405; impregnated; coated; covered or sheathed with rubber or plastics",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5605",
		" Description of Goods": "Metallised yarn; whether or not gimped; being textile yarn; or strip or the like of heading 5404 or 5405; combined with metal in the form of thread; strip or powder or covered with metal; such as Real zari thread (gold) and silver thread; combined with textile thread); Imitation zari thread",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5606",
		" Description of Goods": "Gimped yarn; and strip and the like of heading 5404 or 5405; gimped (other than those of heading 5605 and gimped horsehair yarn); chenille yarn (including flock chenille yarn); loop wale-yarn",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5607",
		" Description of Goods": "Twine; cordage; ropes and cables; whether or not plaited or braided and whether or not impregnated; coated; covered or sheathed with rubber or plastics",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5608",
		" Description of Goods": "Knotted netting of twine; cordage or rope; made up fishing nets and other made up nets; of textile materials",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5609",
		" Description of Goods": "Articles of yarn; strip or the like of heading 5404 or 5405; twine; cordage; rope or cables; not elsewhere specified or included",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5701",
		" Description of Goods": "Carpets and other textile floor coverings; knotted; whether or not made up",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5702",
		" Description of Goods": "Carpets and other textile floor coverings; woven; not tufted or flocked; whether or not made up; including “Kelem”; “Schumacks”; “Karamanie” and similar hand-woven rugs",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5703",
		" Description of Goods": "Carpets and other textile floor coverings; tufted; whether or not made up",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5704",
		" Description of Goods": "Carpets and other textile floor coverings; of felt; not tufted or flocked; whether or not made up",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5705",
		" Description of Goods": "Other carpets and other textile floor coverings; whether or not made up; such as Mats and mattings including Bath Mats; where cotton predominates by weight; of Handloom; Cotton Rugs of handloom",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5801",
		" Description of Goods": "Woven pile fabrics and chenille fabrics; other than fabrics of heading 5802 or 5806",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5802",
		" Description of Goods": "Terry towelling and similar woven terry fabrics; other than narrow fabrics of heading 5806; tufted textile fabrics; other than products of heading 5703",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5803",
		" Description of Goods": "Gauze; other than narrow fabrics of heading 5806",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5804",
		" Description of Goods": "Tulles and other net fabrics; not including woven; knitted or crocheted fabrics; lace in the piece; in strips or in motifs; other than fabrics of headings 6002 to 6006",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5805",
		" Description of Goods": "Hand-woven tapestries of the type Gobelins; Flanders; Aubusson; Beauvais and the like; and needle-worked tapestries (for example; petit point; cross stitch); whether or not made up",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5806",
		" Description of Goods": "Narrow woven fabrics; other than goods of heading 5807; narrow fabrics consisting of warp without weft assembled by means of an adhesive (bolducs)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5807",
		" Description of Goods": "Labels; badges and similar articles of textile materials; in the piece; in strips or cut to shape or size; not embroidered",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5808",
		" Description of Goods": "Braids in the piece; ornamental trimmings in the piece; without embroidery; other than knitted or crocheted; tassels; pompons and similar articles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5809",
		" Description of Goods": "Woven fabrics of metal thread and woven fabrics of metallised yarn of heading 5605; of a kind used in apparel; as furnishing fabrics or for similar purposes; not elsewhere specified or included; such as Zari borders [other than Embroidery or zari articles; that is to say;- imi; zari; kasab; saima; dabka; chumki; gota sitara; naqsi; kora; glass beads; badla; glzal]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5810",
		" Description of Goods": "Embroidery in the piece; in strips or in motifs; Embroidered badges; motifs and the like [other than Embroidery or zari articles; that is to say;- imi; zari; kasab; saima; dabka; chumki; gota sitara; naqsi; kora; glass beads; badla; glzal]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5811",
		" Description of Goods": "Quilted textile products in the piece; composed of one or more layers of textile materials assembled with padding by stitching or otherwise; other than embroidery of heading 5810",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5901",
		" Description of Goods": "Textile fabrics coated with gum or amylaceous substances; of a kind used for the outer covers of books or the like; tracing cloth; prepared painting canvas; buckram and similar stiffened textile fabrics of a kind used for hat foundations",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5902",
		" Description of Goods": "Tyre cord fabric of high tenacity yarn of nylon or other polyamides; polyesters or viscose rayon",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5903",
		" Description of Goods": "Textile fabrics impregnated; coated; covered or laminated with plastics; other than those of heading 5902",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5904",
		" Description of Goods": "Linoleum; whether or not cut to shape; floor coverings consisting of a coating or covering applied on a textile backing; whether or not cut to shape",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5905",
		" Description of Goods": "Textile wall coverings",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5906",
		" Description of Goods": "Rubberised textile fabrics; other than those of heading 5902",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5907",
		" Description of Goods": "Textile fabrics otherwise impregnated; coated or covered; painted canvas being theatrical scenery; studio back-cloths or the like",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5908",
		" Description of Goods": "Textile wicks; woven; plaited or knitted ; for lamps; stoves; lighters; candles or the like; incandescent gas mantles and tubular knitted gas mantle fabric therefor; whether or not impregnated",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5909",
		" Description of Goods": "Textile hose piping and similar textile tubing; with or without lining; armour or accessories of other materials",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5910",
		" Description of Goods": "Transmission or conveyor belts or belting; of textile material; whether or not impregnated; coated; covered or laminated with plastics; or reinforced with metal or other material",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "5911",
		" Description of Goods": "Textile products and articles; for technical uses; specified in Note 7 to this Chapter; such as Textile fabrics; felt and felt-lined woven fabrics; coated; covered or laminated with rubber; leather or other material; of a kind used for card clothing; and similar fabrics of a kind used for other technical purposes; including narrow fabrics made of velvet impregnated with rubber; for covering weaving spindles (weaving beams); Bolting cloth; whether or Not made up; Felt for cotton textile industries; woven; Woven textiles felt; whether or not impregnated or coated; of a kind commonly used in other machines; Cotton fabrics and articles used in machinery and plant; Jute fabrics and articles used in machinery or plant; Textile fabrics of metalised yarn of a kind commonly used in paper making or other machinery; Straining cloth of a kind used in oil presses or the like; including that of human hair; Paper maker's felt; woven; Gaskets; washers; polishing discs and other machinery parts of textile articles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "61",
		" Description of Goods": "Articles of apparel and clothing accessories; knitted or crocheted; of sale value exceeding Rs. 1000 per piece",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "62",
		" Description of Goods": "Articles of apparel and clothing accessories; not knitted or crocheted; of sale value exceeding Rs. 1000 per piece",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "63",
		" Description of Goods": "Other made up textile articles; sets; worn clothing and worn textile articles and rags; of sale value exceeding Rs. 1000 per piece",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "6601",
		" Description of Goods": "Umbrellas and sun umbrellas (including walking-stick umbrellas; garden umbrellas and similar umbrellas)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "6602",
		" Description of Goods": "Walking-sticks; seat-sticks; whips; riding-crops and the like",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "6603",
		" Description of Goods": "Parts; trimmings and accessories of articles of heading 6601 or 6602",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "6701",
		" Description of Goods": "Skins and other parts of birds with their feathers or down; feathers; parts of feathers; down and articles thereof (other than goods of heading 0505 and worked quills and scapes)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "68",
		" Description of Goods": "Sand lime bricks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "6815",
		" Description of Goods": "Fly ash bricks and fly ash blocks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7015 10",
		" Description of Goods": "Glasses for corrective spectacles and flint buttons",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7020",
		" Description of Goods": "Globes for lamps and lanterns; Founts for kerosene wick lamps; Glass chimneys for lamps and lanterns",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7310 or 7326",
		" Description of Goods": "Mathematical boxes; geometry boxes and colour boxes; pencil sharpeners",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7317",
		" Description of Goods": "Animal shoe nails",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7319",
		" Description of Goods": "Sewing needles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7321",
		" Description of Goods": "Kerosene burners; kerosene stoves and wood burning stoves of iron or steel",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7323",
		" Description of Goods": "Table; kitchen or other household articles of iron & steel; Utensils",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7418",
		" Description of Goods": "Table; kitchen or other household articles of copper; Utensils",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "7615",
		" Description of Goods": "Table; kitchen or other household articles of aluminium; Utensils",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8211",
		" Description of Goods": "Knives with cutting blades; serrated or not (including pruning knives); other than knives of heading 8208; and blades therefor",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8214",
		" Description of Goods": "Paper knives; Pencil sharpeners and blades therefor",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8215",
		" Description of Goods": "Spoons; forks; ladles; skimmers; cake-servers; fish-knives; butter-knives; sugar tongs and similar kitchen or tableware",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8401",
		" Description of Goods": "Fuel elements (cartridges); non-irradiated; for nuclear reactors",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8408",
		" Description of Goods": "Fixed Speed Diesel Engines of power not exceeding 15HP",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8413",
		" Description of Goods": "Power driven pumps primarily designed for handling water; namely; centrifugal pumps (horizontal and vertical); deep tube-well turbine pumps; submersible pumps; axial flow and mixed flow vertical pumps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8414 20 10",
		" Description of Goods": "Bicycle pumps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8414 20 20",
		" Description of Goods": "Other hand pumps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8414 90 12",
		" Description of Goods": "Parts of air or vacuum pumps and compressors of bicycle pumps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8432",
		" Description of Goods": "Agricultural; horticultural or forestry machinery for soil preparation or cultivation; lawn or sports-ground rollers",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8433",
		" Description of Goods": "Harvesting or threshing machinery; including straw or fodder balers; grass or hay mowers; machines for cleaning; sorting or grading eggs; fruit or other agricultural produce; other than machinery of heading 8437",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8434",
		" Description of Goods": "Milking machines and dairy machinery",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8436",
		" Description of Goods": "Other agricultural; horticultural; forestry; poultry-keeping or bee-keeping machinery; including germination plant fitted with mechanical or thermal equipment; poultry incubators and brooders",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8452",
		" Description of Goods": "Sewing machines",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8479",
		" Description of Goods": "Composting Machines",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8517",
		" Description of Goods": "Telephones for cellular networks or for other wireless networks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "85",
		" Description of Goods": "Parts for manufacture of Telephones for cellular networks or for other wireless networks",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8525 60",
		" Description of Goods": "Two-way radio (Walkie talkie) used by defence; police and paramilitary forces etc.",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8539",
		" Description of Goods": "LED lamps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "87",
		" Description of Goods": "Electrically operated vehicles; including two and three wheeled electric motor vehicles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8701",
		" Description of Goods": "Tractors (except road tractors for semi-trailers of engine capacity more than 1800 cc)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8712",
		" Description of Goods": "Bicycles and other cycles (including delivery tricycles); not motorised",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8714",
		" Description of Goods": "Parts and accessories of bicycles and other cycles (including delivery tricycles); not motorised; of 8712",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8716 20 00",
		" Description of Goods": "Self-loading or self-unloading trailers for agricultural purposes",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "8716 80",
		" Description of Goods": "Hand propelled vehicles (e.g. hand carts; rickshaws and the like); animal drawn vehicles",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "90 or any other Chapter",
		" Description of Goods": "Blood glucose monitoring system (Glucometer) and test strips",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "90 or any other Chapter",
		" Description of Goods": "Patent Ductus Arteriousus / Atrial Septal Defect occlusion device",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9001",
		" Description of Goods": "Contact lenses; Spectacle lenses",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9002",
		" Description of Goods": "Intraocular lens",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9004",
		" Description of Goods": "Spectacles; corrective",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9017 20",
		" Description of Goods": "Drawing and marking out instruments; Mathematical calculating instruments; pantographs; Other drawing or marking out instruments",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9018",
		" Description of Goods": "Instruments and appliances used in medical; surgical; dental or veterinary sciences; including scintigraphic apparatus; other electro-medical apparatus and sight-testing instruments",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9019",
		" Description of Goods": "Mechano-therapy appliances; massage apparatus; psychological aptitude-testing apparatus; ozone therapy; oxygen therapy; aerosol therapy; artificial respiration or other therapeutic respiration apparatus",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9020",
		" Description of Goods": "Other breathing appliances and gas masks; excluding protective masks having neither mechanical parts nor replaceable filters",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9021",
		" Description of Goods": "Orthopaedic appliances; including crutches; surgical belts and trusses; splints and other fracture appliances; artificial parts of the body",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9022",
		" Description of Goods": "Apparatus based on the use of X-rays or of alpha; beta or gamma radiations; for medical; surgical; dental or veterinary uses; including radiography or radiotherapy apparatus; X-ray tubes and other X-ray generators; high tension generators; control panels and desks; screens; examinations or treatment tables; chairs and the light",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9404",
		" Description of Goods": "Coir products [except coir mattresses]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9404",
		" Description of Goods": "Products wholly made of quilted textile materials",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9405; 9405 50 31",
		" Description of Goods": "Hurricane lanterns; Kerosene lamp / pressure lantern; petromax; glass chimney; and parts thereof",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9405",
		" Description of Goods": "LED lights or fixtures including LED lamps",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9405",
		" Description of Goods": "LED (light emitting diode) driver and MCPCB (Metal Core Printed Circuit Board)",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9503",
		" Description of Goods": "Toys like tricycles; scooters; pedal cars etc. (including parts and accessories thereof) [other than electronic toys]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9504",
		" Description of Goods": "Playing cards; chess board; carom board and other board games; like ludo; etc. [other than Video game consoles and Machines]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9506",
		" Description of Goods": "Sports goods other than articles and equipments for general physical exercise",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9507",
		" Description of Goods": "Fishing rods; fishing hooks; and other line fishing tackle; fish landing nets; butterfly nets and smilar nets; decoy “birds” (other than those of heading 9208) and similar hunting or shooting requisites",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9608",
		" Description of Goods": "Pens [other than Fountain pens; stylograph pens]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9608; 9609",
		" Description of Goods": "Pencils (including propelling or sliding pencils); crayons; pastels; drawing charcoals and tailor’s chalk",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9615",
		" Description of Goods": "Combs; hair-slides and the like; hairpins; curling pins; curling grips; hair-curlers and the like; other than those of heading 8516; and parts thereof",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9619",
		" Description of Goods": "Sanitary towels (pads) and tampons; napkins and napkin liners for babies and similar articles; of any material",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9701",
		" Description of Goods": "Paintings; drawings and pastels; executed entirely by hand; other than drawings of heading 4906 and other than hand-painted or hand-decorated manufactured articles; collages and similar decorative plaques",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9702",
		" Description of Goods": "Original engravings; prints and lithographs",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9703",
		" Description of Goods": "Original sculptures and statuary; in any material",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9705",
		" Description of Goods": "Collections and collectors' pieces of zoological; botanical; mineralogical; anatomical; historical; archaeological; paleontological; ethnographic or numismatic interest [other than numismatic coins]",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9706",
		" Description of Goods": "Antiques of an age exceeding one hundred years",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "9804",
		" Description of Goods": "Other Drugs and medicines intended for personal use",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "-",
		" Description of Goods": "Lottery run by State Governments Explanation 1.- For the purposes of this entry; value of supply of lottery under sub-section (5) of section 15 of the Central Goods and Services Tax Act; 2017 read with section 20 of the Integrated Goods and Services Tax Act; 2017 (13 of 2017) shall be deemed to be 100/112 of the face value of ticket or of the price as notified in the Official Gazette by the organising State; whichever is higher. Explanation 2.- (1) “Lottery run by State Governments” means a lottery not allowed to be sold in any state other than the organising state. (2) Organising state has the same meaning as assigned to it in clause (f) of sub-rule (1) of rule 2 of the Lotteries (Regulation) Rules; 2010.",
		"CGST": "6",
		"SGST": "6",
		"IGST": "12"
	},
	{
		"HSN": "0402 91 10; 0402 99 20",
		" Description of Goods": "Condensed milk",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "1107",
		" Description of Goods": "Malt; whether or not roasted",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1302",
		" Description of Goods": "Vegetable saps and extracts; pectic substances; pectinates and pectates; agar-agar and other mucilages and thickeners; whether or not modified; derived from vegetable products.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1404 90 10",
		" Description of Goods": "Bidi wrapper leaves (tendu)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1404 90 50",
		" Description of Goods": "Indian katha",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1517 10",
		" Description of Goods": "All goods i.e. Margarine; Linoxyn",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1520 00 00",
		" Description of Goods": "Glycerol; crude; glycerol waters and glycerol lyes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1521",
		" Description of Goods": "Vegetable waxes (other than triglycerides); Beeswax; other insect waxes and spermaceti; whether or not refined or coloured",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1522",
		" Description of Goods": "Degras; residues resulting from the treatment of fatty substances or animal or vegetable waxes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1701 91; 1701 99",
		" Description of Goods": "All goods; including refined sugar containing added flavouring or colouring matter; sugar cubes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1702",
		" Description of Goods": "Other sugars; including chemically pure lactose; maltose; glucose and fructose; in solid form; sugar syrups not containing added flavouring or colouring matter; artificial honey; whether or not mixed with natural honey; caramel [other than palmyra sugar and Palmyra jaggery]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1704",
		" Description of Goods": "Sugar confectionery (excluding white chocolate and bubble / chewing gum) [other than bura; batasha]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1901",
		" Description of Goods": "Preparations suitable for infants or young children; put up for retail sale",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1902",
		" Description of Goods": "Pasta; whether or not cooked or stuffed (with meat or other substances) or otherwise prepared; such as spaghetti; macaroni; noodles; lasagne; gnocchi; ravioli; cannelloni; couscous; whether or not prepared",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1904 [other than 1904 10 20]",
		" Description of Goods": "All goods i.e. Corn flakes; bulgar wheat; prepared foods obtained from cereal flakes [other than Puffed rice; commonly known as Muri; flattened or beaten rice; commonly known as Chira; parched rice; commonly known as khoi; parched paddy or rice coated with sugar or gur; commonly known as Murki]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1905 [other than 1905 32 11; 1905 90 40]",
		" Description of Goods": "All goods i.e. Waffles and wafers other than coated with chocolate or containing chocolate; biscuits; Pastries and cakes [other than pizza bread; Waffles and wafers coated with chocolate or containing chocolate; papad; bread]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2101 20",
		" Description of Goods": "All goods i.e Extracts; essences and concentrates of tea or mate; and preparations with a basis of these extracts; essences or concentrates or with a basis of tea or mate",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2103 90 10",
		" Description of Goods": "Curry paste",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2103 90 30",
		" Description of Goods": "Mayonnaise and salad dressings",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2103 90 40",
		" Description of Goods": "Mixed condiments and mixed seasoning",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2104",
		" Description of Goods": "Soups and broths and preparations therefor; homogenised composite food preparations",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2105 00 00",
		" Description of Goods": "Ice cream and other edible ice; whether or not containing cocoa",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2106",
		" Description of Goods": "All kinds of food mixes including instant food mixes; soft drink concentrates; Sharbat; Betel nut product known as ",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2201",
		" Description of Goods": "Waters; including natural or artificial mineral waters and aerated waters; not containing added sugar or other sweetening matter nor flavoured",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2207",
		" Description of Goods": "Ethyl alcohol and other spirits; denatured; of any strength",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2209",
		" Description of Goods": "Vinegar and substitutes for vinegar obtained from acetic acid",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2503 00 10",
		" Description of Goods": "Sulphur recovered as by-product in refining of crude oil",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2619",
		" Description of Goods": "Slag; dross (other than granulated slag); scalings and other waste from the manufacture of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2620",
		" Description of Goods": "Slag; ash and residues (other than from the manufacture of iron or steel) containing metals; arsenic or their compounds",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2621",
		" Description of Goods": "Other slag and ash; including seaweed ash (kelp); ash and residues from the incineration of municipal waste",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2707",
		" Description of Goods": "Oils and other products of the distillation of high temperature coal tar; similar products in which the weight of the aromatic constituents exceeds that of the non-aromatic constituents; such as Benzole (benzene); Toluole (toluene); Xylole (xylenes); Naphthelene",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2708",
		" Description of Goods": "Pitch and pitch coke; obtained from coal tar or from other mineral tars",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2710",
		" Description of Goods": "Petroleum oils and oils obtained from bituminous minerals; other than petroleum crude; preparations not elsewhere specified or included; containing by weight 70% or more of petroleum oils or of oils obtained from bituminous minerals; these oils being the basic constituents of the preparations; waste oils; [other than Avgas and Kerosene PDS and other than petrol; Diesel and ATF; not in GST]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2711",
		" Description of Goods": "Petroleum gases and other gaseous hydrocarbons; such as Propane; Butanes; Ethylene; propylene; butylene and butadiene [Other than Liquefied Propane and Butane mixture; Liquefied Propane; Liquefied Butane and Liquefied Petroleum Gases (LPG) for supply to household domestic consumers or to non-domestic exempted category (NDEC) customers by the Indian Oil Corporation Limited; Hindustan petroleum Corporation Limited or Bharat Petroleum Corporation Limited]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2712",
		" Description of Goods": "Petroleum jelly; paraffin wax; micro-crystalline petroleum wax; slack wax; ozokerite; lignite wax; peat wax; other mineral waxes; and similar products obtained by synthesis or by other processes; whether or not coloured",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2713  ",
		" Description of Goods": "Petroleum coke; petroleum bitumen and other residues of petroleum oils or of oils obtained from bituminous minerals",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2714",
		" Description of Goods": "Bitumen and asphalt; natural; bituminous or oil shale and tar sands; asphaltites and asphaltic rocks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "2715",
		" Description of Goods": "Bituminous mixtures based on natural asphalt; on natural bitumen; on petroleum bitumen; on mineral tar or on mineral tar pitch (for example; bituminous mastics; cut-backs)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "28",
		" Description of Goods": "All inorganic chemicals [other than those specified in the Schedule for exempted goods or other Rate Schedules for goods]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "29",
		" Description of Goods": "All organic chemicals other than giberellic acid",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "30",
		" Description of Goods": "Nicotine polacrilex gum",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3102",
		" Description of Goods": "Mineral or chemical fertilisers; nitrogenous; which are clearly not to be used as fertilizers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3103",
		" Description of Goods": "Mineral or chemical fertilisers; phosphatic; which are clearly not to be used as fertilizers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3104",
		" Description of Goods": "Mineral or chemical fertilisers; potassic; which are clearly not to be used as fertilizers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3105",
		" Description of Goods": "Mineral or chemical fertilisers containing two or three of the fertilising elements nitrogen; phosphorus and potassium; other fertilisers; goods of this Chapter in tablets or similar forms or in packages of a gross weight not exceeding 10 kg; which are clearly not to be used as fertilizers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3201",
		" Description of Goods": "Tanning extracts of vegetable origin; tannins and their salts; ethers; esters and other derivatives (other than Wattle extract; quebracho extract; chestnut extract)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3202",
		" Description of Goods": "Synthetic organic tanning substances; inorganic tanning substances; tanning preparations; whether or not containing natural tanning substances (other than Enzymatic preparations for pre-tanning)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3203",
		" Description of Goods": "Colouring matter of vegetable or animal origin (including dyeing extracts but excluding animal black); whether or not chemically defined; preparations as specified in Note 3 to this Chapter based on colouring matter of vegetable or animal origin",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3204",
		" Description of Goods": "Synthetic organic colouring matter; whether or not chemically defined; preparations as specified in Note 3 to this Chapter based on synthetic organic colouring matter; synthetic organic products of a kind used as fluorescent brightening agents or as luminophores; whether or not chemically defined",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3205",
		" Description of Goods": "Colour lakes; preparations as specified in Note 3 to this Chapter based on colour lakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3206",
		" Description of Goods": "Other colouring matter; preparations as specified in Note 3 to this Chapter; other than those of heading 32.03; 32.04 or 32.05; inorganic products of a kind used as luminophores; whether or not chemically defined",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3207",
		" Description of Goods": "Prepared pigments; prepared opacifiers; prepared colours; vitrifiable enamels; glazes; engobes (slips); liquid lustres; and other similar preparations of a kind used in ceramic; enamelling or glass industry",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3211 00 00",
		" Description of Goods": "Prepared driers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3212",
		" Description of Goods": "Pigments (including metallic powders and flakes) dispersed in non-aqueous media; in liquid or paste form; of a kind used in the manufacture of paints (including enamels); stamping foils; dyes and other colouring matter put up in forms or packings for retail sale",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3215",
		" Description of Goods": "Printing ink; writing or drawing ink and other inks; whether or not concentrated or solid (Fountain pen ink and Ball pen ink)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3301",
		" Description of Goods": "Essential oils (terpeneless or not); including concretes and absolutes; resinoids; extracted oleoresins; concentrates of essential oils in fats; in fixed oils; in waxes or the like; obtained by enfleurage or maceration; terpenic by-products of the deterpenation of essential oils; aqueous distillates and aqueous solutions of essential oils; such as essential oils of citrus fruit; essential oils other than those of citrus fruit such as Eucalyptus oil; etc.; Flavouring essences all types (including those for liquors); Attars of all kinds in fixed oil bases",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3302",
		" Description of Goods": "Mixtures of odoriferous substances and mixtures (including alcoholic solutions) with a basis of one or more of these substances; of a kind used as raw materials in industry; other preparations based on odoriferous substances; of a kind used for the manufacture of beverages; such as Synthetic perfumery compounds [other than Menthol and menthol crystals; Peppermint (Mentha Oil); Fractionated / de-terpenated mentha oil (DTMO); De-mentholised oil (DMO); Spearmint oil; Mentha piperita oil]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3304 20 00",
		" Description of Goods": "Kajal pencil sticks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3305 9011; 3305 90 19",
		" Description of Goods": "Hair oil",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3306 10 20",
		" Description of Goods": "Dentifices - Toothpaste",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3401 [except 340130]",
		" Description of Goods": "Soap; organic surface-active products and preparations for use as soap; in the form of bars; cakes; moulded pieces or shapes; whether or not containing soap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3404",
		" Description of Goods": "Artificial waxes and prepared waxes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3407",
		" Description of Goods": "Preparations known as “dental wax” or as “dental impression compounds”; put up in sets; in packings for retail sale or in plates; horseshoe shapes; sticks or similar forms; other preparations for use in dentistry; with a basis of plaster (of calcined gypsum or calcium sulphate)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3501",
		" Description of Goods": "Casein; caseinates and other casein derivatives; casein glues",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3502",
		" Description of Goods": "Albumins (including concentrates of two or more whey proteins; containing by weight more than 80% whey proteins; calculated on the dry matter); albuminates and other albumin derivatives",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3503",
		" Description of Goods": "Gelatin (including gelatin in rectangular (including square) sheets; whether or not surface-worked or coloured) and gelatin derivatives; isinglass; other glues of animal origin; excluding casein glues of heading 3501",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3504",
		" Description of Goods": "Peptones and their derivatives; other protein substances and their derivatives; not elsewhere specified or included; hide powder; whether or not chromed; including Isolated soya protein",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3505",
		" Description of Goods": "Dextrins and other modified starches (for example; pregelatinised or esterified starches); glues based on starches; or on dextrins or other modified starches",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3506",
		" Description of Goods": "Prepared glues and other prepared adhesives; not elsewhere specified or included; products suitable for use as glues or adhesives; put up for retail sale as glues or adhesives; not exceeding a net weight of 1 kg",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3507",
		" Description of Goods": "Enzymes; prepared enzymes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3601",
		" Description of Goods": "Propellant powders",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3603",
		" Description of Goods": "Safety fuses; detonating fuses; percussion or detonating caps; igniters; electric detonators",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3605",
		" Description of Goods": "Matches (other than handmade safety matches [3605 00 10])",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3701",
		" Description of Goods": "Photographic plates and film in the flat; sensitised; unexposed; of any material other than paper; paperboard or textiles; instant print film in the flat; sensitised; unexposed; whether or not in packs; such as Instant print film; Cinematographic film (other than for x-ray for Medical use)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3702",
		" Description of Goods": "Photographic film in rolls; sensitised; unexposed; of any material other than paper; paperboard or textiles; instant print film in rolls; sensitised; unexposed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3703",
		" Description of Goods": "Photographic paper; paperboard and textiles; sensitised; unexposed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3704",
		" Description of Goods": "Photographic plates; film; paper; paperboard and textiles; exposed but not developed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3706",
		" Description of Goods": "Photographic plates and films; exposed and developed; whether or not incorporating sound track or consisting only of sound track; for feature films",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3707",
		" Description of Goods": "Chemical preparations for photographic uses (other than varnishes; glues; adhesives and similar preparations); unmixed products for photographic uses; put up in measured portions or put up for retail sale in a form ready for use",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3801",
		" Description of Goods": "Artificial graphite; colloidal or semi-colloidal graphite; preparations based on graphite or other carbon in the form of pastes; blocks; plates or other semi-manufactures",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3802",
		" Description of Goods": "Activated carbon; activated natural mineral products; animal black; including spent animal black",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3803 00 00",
		" Description of Goods": "Tall oil; whether or not refined",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3804",
		" Description of Goods": "Residual lyes from the manufacture of wood pulp; whether or not concentrated; desugared or chemically treated; including lignin sulphonates",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3805",
		" Description of Goods": "Gum; wood or sulphate turpentine and other terpenic oils produced by the distillation or other treatment of coniferous woods; crude dipentene; sulphite turpentine and other crude para-cymene; pine oil containing alpha-terpineol as the main constituent",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3806",
		" Description of Goods": "Rosin and resin acids; and derivatives thereof; rosin spirit and rosin oils; run gums",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3807",
		" Description of Goods": "Wood tar; wood tar oils; wood creosote; wood naphtha; vegetable pitch; brewers' pitch and similar preparations based on rosin; resin acids or on vegetable pitch",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3808",
		" Description of Goods": "Insecticides; rodenticides; fungicides; herbicides; anti-sprouting products and plant-growth regulators; disinfectants and similar products",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3809",
		" Description of Goods": "Finishing agents; dye carriers to accelerate the dyeing or fixing of dyestuffs and other products and preparations (for example; dressings and mordants); of a kind used in the textile; paper; leather or like industries; not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3810",
		" Description of Goods": "Pickling preparations for metal surfaces; fluxes and other auxiliary preparations for soldering; brazing or welding; soldering; brazing or welding powders and pastes consisting of metal and other materials; preparations of a kind used as cores or coatings for welding electrodes or rods",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3812",
		" Description of Goods": "Prepared rubber accelerators; compound plasticisers for rubber or plastics; not elsewhere specified or included; anti-oxidising preparations and other compound stabilisers for rubber or plastics.; such as Vulcanizing agents for rubber",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3815",
		" Description of Goods": "Reaction initiators; reaction accelerators and catalytic preparations; not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3816",
		" Description of Goods": "Refractory cements; mortars; concretes and similar compositions; other than products of heading 3801",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3817",
		" Description of Goods": "Mixed alkylbenzenes and mixed alkylnaphthalenes; other than those of heading 2707 or 2902",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3818",
		" Description of Goods": "Chemical elements doped for use in electronics; in the form of discs; wafers or similar forms; chemical compounds doped for use in electronics [other than silicon wafers]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3821",
		" Description of Goods": "Prepared culture media for the development or maintenance of micro-organisms (including viruses and the like) or of plant; human or animal cells",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3823",
		" Description of Goods": "Industrial monocarboxylic fatty acids; acid oils from refining; industrial fatty alcohols",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3824",
		" Description of Goods": "Prepared binders for foundry moulds or cores; chemical products and preparations of the chemical or allied industries (including those consisting of mixtures of natural products); not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3825",
		" Description of Goods": "Residual products of the chemical or allied industries; not elsewhere specified or included; [except municipal waste; sewage sludge; other wastes specified in Note 6 to this Chapter.]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3826",
		" Description of Goods": "Biodiesel and mixtures thereof; not containing or containing less than 70% by weight of petroleum oils and oils obtained from bituminous minerals",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3901 to 3913",
		" Description of Goods": "All goods i.e. polymers; Polyacetals; other polyethers; epoxide resins; polycarbonates; alkyd resins; polyallyl esters; other polyesters; polyamides; Amino-resins; phenolic resins and polyurethanes; silicones; Petroleum resins; coumarone-indene resins; polyterpenes; polysulphides; polysulphones and other products specified in Note 3 to this Chapter; not elsewhere specified or included; Cellulose and its chemical derivatives; not elsewhere specified or included; Natural polymers (for example; alginic acid) and modified natural polymers (for example; hardened proteins; chemical derivatives of natural rubber); not elsewhere specified or included; in primary forms",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3914",
		" Description of Goods": "Ion exchangers based on polymers of headings 3901 to 3913; in primary forms",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3915",
		" Description of Goods": "Waste; parings and scrap; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3916",
		" Description of Goods": "Monofilament of which any cross-sectional dimension exceeds 1 mm; rods; sticks and profile shapes; whether or not surface-worked but not otherwise worked; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3917",
		" Description of Goods": "Tubes; pipes and hoses; and fittings therefor; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3919",
		" Description of Goods": "Self-adhesive plates; sheets; film; foil; tape; strip and other flat shapes; of plastics; whether or not in rolls",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3920",
		" Description of Goods": "Other plates; sheets; film; foil and strip; of plastics; non-cellular and not reinforced; laminated; supported or similarly combined with other materials",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3921",
		" Description of Goods": "Other plates; sheets; film; foil and strip; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3923",
		" Description of Goods": "Articles for the conveyance or packing of goods; of plastics; stoppers; lids; caps and other closures; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3924",
		" Description of Goods": "Tableware; kitchenware; other household articles and hygienic or toilet articles; of plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3925",
		" Description of Goods": "Builder's wares of plastics; not elsewhere specified",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "3926",
		" Description of Goods": "PVC Belt Conveyor; Plastic Tarpaulin",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4002",
		" Description of Goods": "Synthetic rubber and factice derived from oils; in primary forms or in plates; sheets or strip; mixtures of any product of heading 4001 with any product of this heading; in primary forms or in plates; sheets or strip; such as Latex; styrene butadiene rubber; butadiene rubber (BR); Isobutene-isoprene (butyl) rubber (IIR); Ethylene-propylene-Non-conjugated diene rubber (EPDM)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4003",
		" Description of Goods": "Reclaimed rubber in primary forms or in plates; sheets or strip",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4004",
		" Description of Goods": "Waste; parings and scrap of rubber (other than hard rubber) and powders and granules obtained therefrom",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4005",
		" Description of Goods": "Compounded rubber; unvulcanised; in primary forms or in plates; sheets or strip",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4006",
		" Description of Goods": "Other forms (for example; rods; tubes and profile shapes) and articles (for example; discs and rings); of unvulcanised rubber",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4007",
		" Description of Goods": "Vulcanised rubber thread and cord; other than latex rubber thread",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4008",
		" Description of Goods": "Plates; sheets; strip; rods and profile shapes; of vulcanised rubber other than hard rubber",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4009",
		" Description of Goods": "Tubes; pipes and hoses; of vulcanised rubber other than hard rubber; with or without their fittings (for example; joints; elbows; flanges)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4010",
		" Description of Goods": "Conveyor or transmission belts or belting; of vulcanised rubber",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4011",
		" Description of Goods": "Rear Tractor tyres and rear tractor tyre tubes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4014",
		" Description of Goods": "Hygienic or pharmaceutical articles (including teats); of vulcanised rubber other than hard rubber; with or without fittings of hard rubber; such as Hot water bottles; Ice bags [other than Sheath contraceptives; Rubber contraceptives; male (condoms); Rubber contraceptives; female (diaphragms); such as cervical caps]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4015",
		" Description of Goods": "Articles of apparel and clothing accessories (including gloves; mittens and mitts); for all purposes; of vulcanised rubber other than hard rubber [other than Surgical gloves]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202",
		" Description of Goods": "School satchels and bags other than of leather or composition leather",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 12 10",
		" Description of Goods": "Toilet cases",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 22 10",
		" Description of Goods": "Hand bags and shopping bags; of artificial plastic material",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 22 20",
		" Description of Goods": "Hand bags and shopping bags; of cotton",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 22 30",
		" Description of Goods": "Hand bags and shopping bags; of jute",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 22 40",
		" Description of Goods": "Vanity bags",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4202 29 10",
		" Description of Goods": "Handbags of other materials excluding wicker work or basket work",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4301",
		" Description of Goods": "Raw furskins (including heads; tails; paws and other pieces or cuttings; suitable for furriers' use); other than raw hides and skins of heading 4101; 4102 or 4103.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4302",
		" Description of Goods": "Tanned or dressed furskins (including heads; tails; paws and other pieces or cuttings); unassembled; or assembled (without the addition of other materials) other than those of heading 4303",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4304",
		" Description of Goods": "Artificial fur and articles thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4403",
		" Description of Goods": "Wood in the rough",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4407",
		" Description of Goods": "Wood sawn or chipped",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4408",
		" Description of Goods": "Sheets for veneering (including those obtained by slicing laminated wood); for plywood or for similar laminated wood and other wood; sawn lengthwise; sliced or peeled; whether or not planed; sanded; spliced or end-jointed; of a thickness not exceeding 6 mm [other than for match splints]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4409",
		" Description of Goods": "Wood (including strips and friezes for parquet flooring; not assembled) continuously shaped (tongued; grooved; rebated; chamfered; v-jointed; beaded; moulded; rounded or the like) along any of its edges or faces; whether or not planed; sanded or end-jointed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "44 or any Chapter",
		" Description of Goods": "Resin bonded bamboo mat board; with or without veneer in between",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "44 or any Chapter",
		" Description of Goods": "Bamboo flooring tiles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4419",
		" Description of Goods": "Tableware and Kitchenware of wood",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4501",
		" Description of Goods": "Waste cork; crushed; granulated or ground cork",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4502",
		" Description of Goods": "Natural cork; debacked or roughly squared; or in rectangular (including square) blocks; plates; sheets or strip (including sharp-edged blanks for corks or stoppers)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4503",
		" Description of Goods": "Articles of natural cork such as Corks and Stoppers; Shuttlecock cork bottom",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4504",
		" Description of Goods": "Agglomerated cork (with or without a binding substance) and articles of agglomerated cork",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4803",
		" Description of Goods": "Toilet or facial tissue stock; towel or napkin stock and similar paper of a kind used for household or sanitary purposes; cellulose wadding and webs of cellulose fibres; whether or not creped; crinkled; embossed; perforated; surface-coloured; surface-decorated or printed; in rolls or sheets",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4806 [Except 4806 20 00; 4806 40 10]",
		" Description of Goods": "Vegetable parchment; tracing papers and other glazed transparent or translucent papers; in rolls or sheets (other than greaseproof paper; glassine paper)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4809",
		" Description of Goods": "Carbon paper; self-copy paper and other copying or transfer papers (including coated or impregnated paper for duplicator stencils or offset plates); whether or not printed; in rolls or sheets",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4811",
		" Description of Goods": "Paper; paperboard; cellulose wadding and webs of cellulose fibres; coated; impregnated; covered; surface-coloured; surface-decorated or printed; in rolls or rectangular (including square) sheets; of any size; other than goods of the kind described in heading 4803; 4809 or 4810 [Other than aseptic packaging paper]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4812",
		" Description of Goods": "Filter blocks; slabs and plates; of paper pulp",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4813",
		" Description of Goods": "Cigarette paper; whether or not cut to size or in the form of booklets or tubes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4816",
		" Description of Goods": "Carbon paper; self-copy paper and other copying or transfer papers (other than those of heading 4809); duplicator stencils and offset plates; of paper; whether or not put up in boxes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4817 [Except 4817 30]",
		" Description of Goods": "Envelopes; letter cards; plain postcards and correspondence cards; of paper or paperboard; [other than boxes; pouches; wallets and writing compendiums; of paper or paperboard; containing an assortment of paper stationery including writing blocks]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4818",
		" Description of Goods": "Toilet paper and similar paper; cellulose wadding or webs of cellulose fibres; of a kind used for household or sanitary purposes; in rolls of a width not exceeding 36 cm; or cut to size or shape; handkerchiefs; cleansing tissues; towels; table cloths; serviettes; napkins for babies; tampons; bed sheets and similar household; sanitary or hospital articles; articles of apparel and clothing accessories; or paper pulp; paper; cellulose wadding or webs of cellulose fibres",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4820",
		" Description of Goods": "Registers; account books; order books; receipt books; letter pads; memorandum pads; diaries and similar articles; blotting-pads; binders (loose-leaf or other); folders; file covers; manifold business forms; interleaved carbon sets and other articles of stationary; of paper or paperboard; and  book covers; of paper or paperboard [other than note books and exercise books]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4821",
		" Description of Goods": "Paper or paperboard labels of all kinds; whether or not printed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4822",
		" Description of Goods": "Bobbins; spools; cops and similar supports of paper pulp; paper or paperboard (whether or not perforated or hardened)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "4823",
		" Description of Goods": "Other paper; paperboard; cellulose wadding and webs of cellulose fibres; cut to size or shape; other articles of paper pulp; paper; paperboard; cellulose wadding or webs of cellulose fibres [other than paper pulp moulded trays; Braille paper]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5401",
		" Description of Goods": "Sewing thread of manmade filaments; whether or not put up for retail sale",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5402; 5404; 5406",
		" Description of Goods": "All synthetic filament yarn such as nylon; polyester; acrylic; etc.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5403; 5405; 5406",
		" Description of Goods": "All artificial filament yarn such as viscose rayon; Cuprammonium; etc.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5501; 5502",
		" Description of Goods": "Synthetic or artificial filament tow",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5503; 5504; 5506; 5507",
		" Description of Goods": "Synthetic or artificial staple fibres",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5505",
		" Description of Goods": "Waste of manmade fibres",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5508",
		" Description of Goods": "Sewing thread of manmade staple fibres",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "5509; 5510; 5511",
		" Description of Goods": "Yarn of manmade staple fibres",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6401",
		" Description of Goods": "Waterproof footwear with outer soles and uppers of rubber or of plastics; the uppers of which are neither fixed to the sole nor assembled by stitching; riveting; nailing; screwing; plugging or similar processes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6402",
		" Description of Goods": "Other footwear with outer soles and uppers of rubber or plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6403",
		" Description of Goods": "Footwear with outer soles of rubber; plastics; leather or composition leather and uppers of leather",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6404",
		" Description of Goods": "Footwear with outer soles of rubber; plastics; leather or composition leather and uppers of textile materials",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6405",
		" Description of Goods": "Other footwear",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6406",
		" Description of Goods": "Parts of footwear (including uppers whether or not attached to soles other than outer soles); removable in-soles; heel cushions and similar articles; gaiters; leggings and similar articles; and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6501",
		" Description of Goods": "Hat-forms; hat bodies and hoods of felt; neither blocked to shape nor with made brims; plateaux and manchons (including slit manchons); of felt",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6502",
		" Description of Goods": "Hat-shapes; plaited or made by assembling strips of any material; neither blocked to shape; nor with made brims; nor lined; nor trimmed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6504 00 00",
		" Description of Goods": "Hats and other headgear; plaited or made by assembling strips of any material; whether or not lined or trimmed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6505",
		" Description of Goods": "Hats and other headgear; knitted or crocheted; or made up from lace; felt or other textile fabric; in the piece (but not in strips); whether or not lined or trimmed; hair-nets of any material; whether or not lined or trimmed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6506",
		" Description of Goods": "Other headgear; whether or not lined or trimmed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6507",
		" Description of Goods": "Head-bands; linings; covers; hat foundations; hat frames; peaks and chinstraps; for headgear",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6804",
		" Description of Goods": "Millstones; grindstones; grinding wheels and the like; without frameworks; for grinding; sharpening; polishing; trueing or cutting; hand sharpening or polishing stones; and parts thereof; of natural stone; of agglomerated nllatural or artificial abrasives; or of ceramics; with or without parts of other materials",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6805",
		" Description of Goods": "Natural or artificial abrasive powder or grain; on a base of textile material; of paper; of paperboard or of other materials; whether or not cut to shape or sewn or otherwise made up",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6806",
		" Description of Goods": "Slag wool; rock wool and similar mineral wools; exfoliated vermiculite; expanded clays; foamed slag and similar expanded mineral materials; mixtures and articles of heat-insulating; sound-insulating or sound-absorbing mineral materials; other than those of heading 6811 or 6812 or chapter 69",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6810",
		" Description of Goods": "Pre cast Concrete Pipes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6811",
		" Description of Goods": "Articles of asbestos-cement; of cellulose fibre-cement or the like",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6902",
		" Description of Goods": "Refractory bricks; blocks; tiles and similar refractory ceramic constructional goods; other than those of siliceous fossil meals or similar siliceous earths",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6903",
		" Description of Goods": "Other refractory ceramic goods (for example; retorts; crucibles; muffles; nozzles; plugs; supports; cupels; tubes; pipes; sheaths and rods); other than those of siliceous fossil meals or of similar siliceous earths",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6906",
		" Description of Goods": "Salt Glazed Stone Ware Pipes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6911",
		" Description of Goods": "Tableware; kitchenware; other household articles and toilet articles; of porcelain or china",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "6912",
		" Description of Goods": "Ceramic tableware; kitchenware; other household articles and toilet articles; other than of porcelain or china [other than Earthen pot and clay lamps]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7001",
		" Description of Goods": "Cullet and other waste and scrap of glass; glass in the mass",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7002",
		" Description of Goods": "Glass in balls (other than microspheres of heading 70.18); rods or tubes; unworked",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7010",
		" Description of Goods": "Carboys; bottles; flasks; jars; pots; phials; ampoules and other containers; of glass; of a kind used for the conveyance or packing of goods; preserving jars of glass; stoppers; lids and other closures; of glass",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7013",
		" Description of Goods": "Glassware of a kind used for table; kitchen; toilet; office; indoor decoration or similar purposes (other than that of heading 7010 or 7018)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7015",
		" Description of Goods": "Clock or watch glasses and similar glasses; glasses for non-corrective spectacles; curved; bent; hollowed or the like; not optically worked; hollow glass spheres and their segments; for the manufacture of such glasses",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7017",
		" Description of Goods": "Laboratory; hygienic or pharmaceutical glassware; whether or not graduated or calibrated",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7018",
		" Description of Goods": "Imitation pearls; imitation precious or semi-precious stones and similar glass smallwares; and articles thereof other than imitation jewellery; glass eyes other than prosthetic articles; statuettes and other ornaments of lamp-worked glass; other than imitaion jewelery; glass microsphers not exceeding 1 mm in diameter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7019",
		" Description of Goods": "Glass fibres (including glass wool) and articles thereof (for example; yarn; woven fabrics)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7201",
		" Description of Goods": "Pig iron and spiegeleisen in pigs; blocks or other primary forms",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7202",
		" Description of Goods": "Ferro-alloys",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7203",
		" Description of Goods": "Ferrous products obtained by direct reduction of iron ore and other spongy ferrous products; in lumps; pellets or similar forms; iron having a minimum purity by weight of 99.94%; in lumps; pellets or similar forms",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7204",
		" Description of Goods": "Ferrous waste and scrap; remelting scrap ingots of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7205",
		" Description of Goods": "Granules and powders; of pig iron; spiegeleisen; iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7206",
		" Description of Goods": "Iron and non-alloy steel in ingots or other primary forms (excluding iron of heading 7203)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7207",
		" Description of Goods": "Semi-finished products of iron or non-alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7208 to 7212",
		" Description of Goods": "All flat-rolled products of iron or non-alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7213 to 7215",
		" Description of Goods": "All bars and rods; of iron or non-alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7216",
		" Description of Goods": "Angles; shapes and sections of iron or non-alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7217",
		" Description of Goods": "Wire of iron or non-alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7218",
		" Description of Goods": "Stainless steel in ingots or other primary forms; semi-finished products of stainless steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7219; 7220",
		" Description of Goods": "All flat-rolled products of stainless steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7221; 7222",
		" Description of Goods": "All bars and rods; of stainless steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7223",
		" Description of Goods": "Wire of stainless steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7224",
		" Description of Goods": "Other alloy steel in ingots or other primary forms; semi-finished products of other alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7225; 7226",
		" Description of Goods": "All flat-rolled products of other alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7227; 7228",
		" Description of Goods": "All bars and rods of other alloy steel.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7229",
		" Description of Goods": "Wire of other alloy steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7301",
		" Description of Goods": "Sheet piling of iron or steel; whether or not drilled; punched or made from assembled elements; welded angles; shapes and sections; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7302",
		" Description of Goods": "Railway or tramway track construction material of iron or steel; the following: rails; check-rails and rack rails; switch blades; crossing frogs; point rods and other crossing pieces; sleepers (cross-ties); fish-plates; chairs; chair wedges; sole plates (base plates); rail clips bedplates; ties and other material specialized for jointing or fixing rails",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7303",
		" Description of Goods": "Tubes; pipes and hollow profiles; of cast iron",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7304",
		" Description of Goods": "Tubes; pipes and hollow profiles; seamless; of iron (other than cast iron) or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7305",
		" Description of Goods": "Other tubes and pipes (for example; welded; riveted or similarly closed); having circular cross sections; the external diameter of which exceeds 406.4 mm; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7306",
		" Description of Goods": "Other tubes; pipes and hollow profiles (for example; open seam or welded; riveted or similarly closed); of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7307",
		" Description of Goods": "Tube or pipe fittings (for example; couplings; elbows; sleeves); of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7308",
		" Description of Goods": "Structures (excluding prefabricated buildings of heading 94.06) and parts of structures (for example; bridges and bridge sections; lock gates; towers; lattice masts; roofs; roofing frame works; doors and windows and their frames and thresholds for doors; and shutters; balustrades; pillars; and columns); of iron or steel; plates; rods; angles; shapes; section; tubes and the like; prepared for using structures; of iron or steel [other than transmission towers]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7309",
		" Description of Goods": "Reservoirs; tanks; vats and similar containers for any material (other than compressed or liquefied gas); of iron or steel; of a capacity exceeding 300 l; whether or not lined or heat-insulated; but not fitted with mechanical or thermal equipment",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7310",
		" Description of Goods": "Tanks; casks; drums; cans; boxes and similar containers; for any material (other than compressed or liquefied gas); of iron or steel; of a capacity not exceeding 300 l; whether or not lined or heat-insulated; but not fitted with mechanical or thermal equipment",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7311",
		" Description of Goods": "Containers for compressed or liquefied gas; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7312",
		" Description of Goods": "Stranded wire; ropes; cables; plaited bands; slings and the like; of iron or steel; not electrically insulated",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7313",
		" Description of Goods": "Barbed wire of iron or steel; twisted hoop or single flat wire; barbed or not; and loosely twisted double wire; of a kind used for fencing; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7314",
		" Description of Goods": "Cloth (including endless bands); grill; netting and fencing; of iron or steel wire; expanded metal of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7315",
		" Description of Goods": "Chain and parts thereof; of iron or steel falling under 7315 20; 7315 81; 7315; 82; 7315 89; 7315 90",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7316",
		" Description of Goods": "Anchors; grapnels and parts thereof; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7317",
		" Description of Goods": "Nails; tacks; drawing pins; corrugated nails; staples (other than those of heading 8305) and similar articles; of iron or steel; whether or not with heads of other material; but excluding such articles with heads of copper",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7318",
		" Description of Goods": "Screws; bolts; nuts; coach screws; screw hooks; rivets; cotters; cotter-pins; washers (including spring washers) and similar articles; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7319",
		" Description of Goods": "Sewing needles; knitting needles; bodkins; crochet hooks; embroidery stilettos and similar articles; for use in the hand; of iron or steel; safety pins and other pins of iron or steel; not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7320",
		" Description of Goods": "Springs and leaves for springs; of iron and steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7321",
		" Description of Goods": "LPG stoves",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7323",
		" Description of Goods": "Iron or steel wool; pot scourers and scouring or polishing pads; gloves and the like; of iron or steel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7325",
		" Description of Goods": "Other cast articles of iron or steel; such as Grinding balls and similar articles for mills; Rudders for ships or boats; Drain covers; Plates and frames for sewage water or similar system",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7326",
		" Description of Goods": "Other articles of iron and steel; forged or stamped; but not further worked; such as Grinding balls and similar articles for mills; articles for automobiles and Earth moving implements; articles of iron or steel Wire; Tyre bead wire rings intended for use in the manufacture of tyres for cycles and cycle-rickshaws; Belt lacing of steel; Belt fasteners for machinery belts; Brain covers; plates; and frames for sewages; water or similar system; Enamelled iron ware (excluding utensil & sign board); Manufactures of stainless steel (excluding utensils); Articles of clad metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7401",
		" Description of Goods": "Copper mattes; cement copper (precipitated copper)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7402",
		" Description of Goods": "Unrefined copper; copper anodes for electrolytic refining",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7403",
		" Description of Goods": "Refined copper and copper alloys; unwrought",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7404",
		" Description of Goods": "Copper waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7405",
		" Description of Goods": "Master alloys of copper",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7406",
		" Description of Goods": "Copper powders and flakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7407",
		" Description of Goods": "Copper bars; rods and profiles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7408",
		" Description of Goods": "Copper wire",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7409",
		" Description of Goods": "Copper plates; sheets and strip; of a thickness exceeding 0.12.5 mm",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7410",
		" Description of Goods": "Copper foils",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7411",
		" Description of Goods": "Copper tubes and pipes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7412",
		" Description of Goods": "Copper tube or pipe fittings (for example; couplings; elbows; sleeves)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7413",
		" Description of Goods": "Stranded wires and cables",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7415",
		" Description of Goods": "Nails; tacks; drawing pins; staples (other than those of heading 83.05) and similar articles; of copper or of iron or steel with heads of copper; screws; bolts; nuts; screw hooks; rivets; cotters; cotter-pins; washers (including spring washers) and similar articles; of copper",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7419 91 00     ",
		" Description of Goods": "Metal castings",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7501",
		" Description of Goods": "Nickel mattes; nickel oxide sinters and other intermediate products of nickel metallurgy",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7502",
		" Description of Goods": "Unwrought nickel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7503",
		" Description of Goods": "Nickel waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7504",
		" Description of Goods": "Nickel powders and flakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7505",
		" Description of Goods": "Nickel bars; rods; profiles and wire",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7506",
		" Description of Goods": "Nickel plates; sheets; strip and foil",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7507",
		" Description of Goods": "Nickel tubes; pipes and tube or pipe fittings (for example; couplings; elbows; sleeves)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7508",
		" Description of Goods": "Other articles of nickel",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7601",
		" Description of Goods": "Aluminium alloys; such as Ingots; Billets; Wire-bars; Wire-rods",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7602",
		" Description of Goods": "Aluminium waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7603",
		" Description of Goods": "Aluminium powders and flakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7604",
		" Description of Goods": "Aluminium bars; rods and profiles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7605",
		" Description of Goods": "Aluminium wire",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7606",
		" Description of Goods": "Aluminium plates; sheets and strip; of a thickness exceeding 0.2 mm",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7607",
		" Description of Goods": "Aluminium foil (whether or not printed or backed with paper; paperboard; plastics or similar backing materials) of a thickness (excluding any backing) not exceeding 0.2 mm",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7608",
		" Description of Goods": "Aluminium tubes and pipes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7609",
		" Description of Goods": "Aluminium tube or pipe fittings (for example; couplings; elbows; sleeves)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7610 [Except 7610 10 00]",
		" Description of Goods": "Aluminium structures (excluding prefabricated buildings of heading 94.06 and doors; windows and their frames and thresholds for doors under 7610 10 00) and parts of structures (for example; bridges and bridge-sections; towers; lattice masts; roofs; roofing frameworks; balustrades; pillars and columns); aluminium plates. rods; profiles; tubes and the like; prepared for use in structures",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7611",
		" Description of Goods": "Aluminium reservoirs; tanks; vats and similar containers; for any material (other than compressed or liquefied gas); of a capacity exceeding 300 l; whether or not lined or heat-insulated; but not fitted with mechanical or thermal equipment",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7612",
		" Description of Goods": "Aluminium casks; drums; cans; boxes; etc.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7613",
		" Description of Goods": "Aluminium containers for compressed or liquefied gas",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7614",
		" Description of Goods": "Stranded wires and cables",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7616",
		" Description of Goods": "Other articles of aluminium",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7801",
		" Description of Goods": "Unwrought lead",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7802",
		" Description of Goods": "Lead waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7804",
		" Description of Goods": "Lead plates; sheets; strip and foil; lead powders and flakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7806",
		" Description of Goods": "Other articles of lead (including sanitary fixtures and Indian lead seals)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7901",
		" Description of Goods": "Unwrought zinc",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7902",
		" Description of Goods": "Zinc waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7903",
		" Description of Goods": "Zinc dust; powders and flakes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7904",
		" Description of Goods": "Zinc bars; rods; profiles and wire",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7905",
		" Description of Goods": "Zinc plates; sheets; strip and foil",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "7907",
		" Description of Goods": "Other articles of zinc including sanitary fixtures",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8001",
		" Description of Goods": "Unwrought tin",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8002",
		" Description of Goods": "Tin waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8003",
		" Description of Goods": "Tin bars; rods; profiles and wire",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8007",
		" Description of Goods": "Other articles of tin",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8101 to 8112",
		" Description of Goods": "Other base metals; namely; Tungsten; Molybdenum; Tantalum; Magnesium; Cobalt mattes;  and other intermediate products of cobalt metallurgy; Bismuth; Cadmium; Titanium; Zirconium; Antimony; Manganese; Beryllium; chromium; germanium; vanadium; gallium; hafnium; indium; niobium (columbium); rhenium and thallium; and articles thereof; including waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8113",
		" Description of Goods": "Cermets and articles thereof; including waste and scrap",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8202",
		" Description of Goods": "Hand saws; blades for saws of all kinds (including slitting; slotting or toothless saw blades)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8203",
		" Description of Goods": "Files; rasps; pliers (including cutting pliers); pincers; tweezers; metal cutting shears; pipe-cutters; bolt croppers; perforating punches and similar hand tools",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8204",
		" Description of Goods": "Hand-operated spanners and wrenches (including torque meter wrenches but not including tap wrenches); interchangeable spanner sockets; with or without handles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8205",
		" Description of Goods": "Hand tools (including glaziers' diamonds); not elsewhere specified or included; blow lamps; vices; clamps and the like; other than accessories for and parts of; machine-tools or water-jet cutting machines; anvils; portable forges; hand or pedal-operated grinding wheels with frameworks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8206",
		" Description of Goods": "Tools of two or more of the headings 8202 to 8205; put up in sets for retail sale",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8207",
		" Description of Goods": "Interchangeable tools for hand tools; whether or not power-operated; or for machine-tools (for example; for pressing; stamping; punching; tapping; threading; drilling; boring; broaching; milling; turning or screw driving); including dies for drawing or extruding metal; and rock drilling or earth boring tools",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8208",
		" Description of Goods": "Knives and cutting blades; for machines or for mechanical appliances",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8209",
		" Description of Goods": "Plates; sticks; tips and the like for tools; unmounted; of cermets",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8210 00 00",
		" Description of Goods": "Hand-operated mechanical appliances; weighing 10 kg or less; used in the preparation; conditioning or serving of food or drink",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8213 00 00",
		" Description of Goods": "Scissors; tailors' shears and similar shears; and blades therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8301",
		" Description of Goods": "Padlocks and locks (key; combination or electrically operated); of base metal; clasps and frames with clasps; incorporating locks; of base metal; keys for any of the foregoing articles; of base metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8306",
		" Description of Goods": "Bells; gongs and the like; non-electric; of base metal; statuettes and other ornaments; of base metal; photograph; picture or similar frames; of base metal; mirrors of base metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8307",
		" Description of Goods": "Flexible tubing of base metal; with or without fittings",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8308",
		" Description of Goods": "Clasps; frames with clasps; buckles; buckle-clasps; hooks; eyes; eyelets and the like; of base metal; of a kind used for clothing or clothing accessories; footwear; jewellery; wrist watches; books; awnings; leather goods; travel goods or saddlery or for other made up articles; tubular or bifurcated rivets; of base metal; beads and spangles; of base metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8309",
		" Description of Goods": "Stoppers; caps and lids (including crown corks; screw caps and pouring stoppers); capsules for bottles; threaded bungs; bung covers; seals and other packing accessories; of base metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8311",
		" Description of Goods": "Wire; rods; tubes; plates; electrodes and similar products; of base metal or of metal carbides; coated or cored with flux material; of a kind used for soldering; brazing; welding or deposition of metal or of metal carbides; wire and rods; of agglomerated base metal powder; used for metal spraying",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8401",
		" Description of Goods": "Nuclear reactors; machinery and apparatus for isotopes separation",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8402",
		" Description of Goods": "Steam or other vapour generating boilers (other than central heating hot water boilers capable also of producing low pressure steam); super-heated water boilers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8403",
		" Description of Goods": "Central heating boilers other than those of heading 8402",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8404",
		" Description of Goods": "Auxiliary plant for use with boilers of heading 8402 or 8403 (for example; economisers; super-heaters; soot removers; gas recoverers); condensers for steam or other vapour power units",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8405",
		" Description of Goods": "Producer gas or water gas generators; with or without their purifiers; acetylene gas generators and similar water process gas generators; with or without their purifiers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8406",
		" Description of Goods": "Steam turbines and other vapour turbines",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8410",
		" Description of Goods": "Hydraulic turbines; water wheels; and regulators therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8411",
		" Description of Goods": "Turbo-jets; turbo-propellers and other gas turbines - turbo-jets",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8412",
		" Description of Goods": "Other engines and motors (Reaction engines other than turbo jets; Hydraulic power engines and motors; Pneumatic power engines and motors; other; parts) [other than wind turbine or engine]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8416 ",
		" Description of Goods": "Furnace burners for liquid fuel; for pulverised solid fuel or for gas; mechanical stokers; including their mechanical grates; mechanical ash dischargers and similar appliances",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8417",
		" Description of Goods": "Industrial or laboratory furnaces and ovens; including incinerators; non-electric",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8419 20",
		" Description of Goods": "Medical; surgical or laboratory sterilisers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8420 ",
		" Description of Goods": "Calendering or other rolling machines; other than for metals or glass; and cylinders therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8421",
		" Description of Goods": "Centrifuges; including centrifugal dryers; filtering or purifying machinery and apparatus; for liquids or gases",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8422 20 00; 8422 30 00; 8422 40 00; 8522 90 [other than 8422 11 00; 8422 19 00]",
		" Description of Goods": "Machinery for cleaning or drying bottles or other containers; machinery for filling; closing; sealing or labelling bottles; cans; boxes; bags or other containers; machinery for capsuling bottles; jars; tubes and similar containers; other packing or wrapping machinery (including heat-shrink wrapping machinery); machinery for aerating beverages [other than dish washing machines]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8423",
		" Description of Goods": "Weighing machinery (excluding balances of a sensitivity of 5 centigrams or better); including weight operated counting or checking machines; weighing machine weights of all kinds [other than electric or electronic weighing machinery]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8424",
		" Description of Goods": "Mechanical appliances (whether or not hand-operated) for projecting; dispersing or spraying liquids or powders; spray guns and similar appliances; steam or sand blasting machines and similar jet projecting machines [other than fire extinguishers; whether or not charged]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8425 ",
		" Description of Goods": "Pulley tackle and hoists other than skip hoists; winches and capstans; jacks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8426",
		" Description of Goods": "Ship’s derricks; cranes including cable cranes; mobile lifting frames; straddle carriers and works trucks fitted with a crane",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8431",
		" Description of Goods": "Parts suitable for use solely or principally with the machinery of headings 8425 to 8430",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8435",
		" Description of Goods": "Presses; crushers and similar machinery used in the manufacture of wine; cider; fruit juices or similar beverages",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8438",
		" Description of Goods": "Machinery; not specified or included elsewhere in this Chapter; for the industrial preparation or manufacture of food or drink; other than machinery for the extraction or preparation of animal or fixed vegetable fats or oils",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8439",
		" Description of Goods": "Machinery for making pulp of fibrous cellulosic material or for making or finishing paper or paperboard",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8440",
		" Description of Goods": "Book-binding machinery; including book-sewing machines",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8441",
		" Description of Goods": "Other machinery for making up paper pulp; paper or paperboard; including cutting machines of all kinds",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8442",
		" Description of Goods": "Machinery; apparatus and equipment (other than the machines of headings 8456 to 8465) for preparing or making plates; printing components; plates; cylinders and lithographic stones; prepared for printing purposes (for example; planed; grained or polished)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8443",
		" Description of Goods": "Printing machinery used for printing by means of plates; cylinders and other printing components of heading 84.42; Printers [other than machines which perform two or more of the functions of printing; copying or facsimile transmission] capable of connecting to an automatic data processing machine or to a network printers [other than copying machines; facsimile machines]; parts and accessories thereof [other than ink cartridges with or without print head assembly and ink spray nozzle]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8444",
		" Description of Goods": "Machines for extruding; drawing; texturing or cutting man-made textile materials",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8445",
		" Description of Goods": "Machines for preparing textile fibres; spinning; doubling or twisting machines and other machinery for producing textile yarns; textile reeling or winding (including weft-winding) machines and machines for preparing textile yarns for use on the machines of heading 8446 or 8447",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8446",
		" Description of Goods": "Weaving machines (looms)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8447",
		" Description of Goods": "Knitting machines; stitch-bonding machines and machines for making gimped yarn; tulle; lace; embroidery; trimmings; braid or net and machines for tufting",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8448",
		" Description of Goods": "Auxiliary machinery for use with machines of heading 84.44; 84.45; 84.46 or 84.47 (for example; dobbies; Jacquards; automatic stop motions; shuttle changing mechanisms); parts and accessories suitable for use solely or principally with the machines of this heading or of heading 8444; 8445;8446 or 8447 (for example; spindles and spindles flyers; card clothing; combs; extruding nipples; shuttles; healds and heald frames; hosiery needles)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8449",
		" Description of Goods": "Machinery for the manufacture or finishing of felt or nonwovens in the piece or in shapes; including machinery for making felt hats; blocks for making hats",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8451 ",
		" Description of Goods": "Machinery (other than machines of heading 8450) for washing; cleaning; wringing; drying; ironing; pressing (including fusing presses); bleaching; dyeing; dressing; finishing; coating or impregnating textile yarns; fabrics or made up textile articles and machines for applying the paste to the base fabric or other support used in the manufacture of floor covering such as linoleum; machines for reeling; unreeling; folding; cutting or pinking textile fabrics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8453",
		" Description of Goods": "Machinery for preparing; tanning or working hides; skins or leather or for making or repairing footwear or other articles of hides; skins or leather; other than sewing machines",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8454",
		" Description of Goods": "Converters; ladles; ingot moulds and casting machines; of a kind used in metallurgy or in metal foundries",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8455",
		" Description of Goods": "Metal-rolling mills and rolls therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8456",
		" Description of Goods": "Machine-tools for working any material by removal of material; by laser or other light or photon beam; ultrasonic; electro-discharge; electro-chemical; electron beam; ionic-beam or plasma arc processes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8457",
		" Description of Goods": "Machining centres; unit construction machines (single station) and multi-station transfer machines; for working metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8458",
		" Description of Goods": "Lathes (including turning centres) for removing metal",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8459",
		" Description of Goods": "Machine-tools (including way-type unit head machines) for drilling; boring; milling; threading or tapping by removing metal; other than lathes (including turning centres) of heading 8458",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8460",
		" Description of Goods": "Machine-tools for deburring; sharpening; grinding; honing; lapping; polishing or otherwise finishing metal; or cermets by means of grinding stones; abrasives or polishing products; other than gear cutting; gear grinding or gear finishing machines of heading 8461",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8461",
		" Description of Goods": "Machine-tools for planing; shaping; slotting; broaching; gear cutting; gear grinding or gear finishing; sawing; cutting-off and other machine-tools working by removing metal or cermets; not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8462",
		" Description of Goods": "Machine-tools (including presses) for working metal by forging; hammering or die-stamping; machine-tools (including presses) for working metal by bending; folding; straightening; flattening; shearing; punching or notching; presses for working metal or metal carbides; not specified above",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8463",
		" Description of Goods": "Other machine-tools for working metal; or cermets; without removing material",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8464",
		" Description of Goods": "Machine-tools for working stone; ceramics; concrete; asbestos-cement or like mineral materials or for cold working glass",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8465",
		" Description of Goods": "Machine-tools (including machines for nailing; stapling; glueing or otherwise assembling) for working wood; cork; bone; hard rubber; hard plastics or similar hard materials",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8466",
		" Description of Goods": "Parts and accessories suitable for use solely or principally with the machines of headings 8456 to 8465 including work or tool holders;   self-opening dieheads;   dividing heads and other special attachments for the machines; tool holders for any type of tool; for working in the hand",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8467",
		" Description of Goods": "Tools for working in the hand; pneumatic; hydraulic or with self-contained electric or non-electric motor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8468",
		" Description of Goods": "Machinery and apparatus for soldering; brazing or welding; whether or not capable of cutting; other than those of heading 8512.5; gas-operated surface tempering machines and appliances",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8470",
		" Description of Goods": "Calculating machines and pocket-size data recording; reproducing and displaying machines with calculating functions; accounting machines; postage-franking machines; ticket-issuing machines and similar machines; incorporating a calculating device; cash registers",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8471",
		" Description of Goods": "Automatic data processing machines and units thereof; magnetic or optical readers; machines for transcribing data onto data media in coded form and machines for processing such data; not elsewhere specified or included",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8472",
		" Description of Goods": "Perforating or stapling machines (staplers); pencil sharpening machines",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8473",
		" Description of Goods": "Parts and accessories (other than covers; carrying cases and the like) suitable for use solely or principally with machines of headings 8470 to 8472",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8474",
		" Description of Goods": "Machinery for sorting; screening; separating; washing; crushing; grinding; mixing or kneading earth; stone; ores or other mineral substances; in solid (including powder or paste) form; machinery for agglomerating; shaping or moulding solid mineral fuels; ceramic paste; unhardened cements; plastering materials or other mineral products in powder or paste form; machines for forming foundry moulds of sand",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8475",
		" Description of Goods": "Machines for assembling electric or electronic lamps; tubes or valves or flashbulbs; in glass envelopes; machines for manufacturing or hot working glass or glassware",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8477",
		" Description of Goods": "Machinery for working rubber or plastics or for the manufacture of products from these materials; not specified or included elsewhere in this Chapter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8479",
		" Description of Goods": "Machines and mechanical appliances having individual functions; not specified or included elsewhere in this Chapter [other than Passenger boarding bridges of a kind used in airports (8479 71 00) and other (8479 79 00)]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8480",
		" Description of Goods": "Moulding boxes for metal foundry; mould bases; moulding patterns; moulds for metal (other than ingot moulds); metal carbides; glass; mineral materials; rubber or plastics",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8481",
		" Description of Goods": "Taps; cocks; valves and similar appliances for pipes; boiler shells; tanks; vats or the like; including pressure-reducing valves and thermostatically controlled valves",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8482",
		" Description of Goods": "Ball bearing; Roller Bearings",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8486 ",
		" Description of Goods": "Machines and apparatus of a kind used solely or principally for the manufacture of semiconductor boules or wafers; semiconductor devices; electronic integrated circuits or flat panel displays; machines and apparatus specified in Note 9 (C) to this Chapter; parts and accessories",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8487",
		" Description of Goods": "Machinery parts; not containing electrical connectors; insulators; coils; contacts or other electrical features not specified or included elsewhere in this chapter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8501",
		" Description of Goods": "Electric motors and generators (excluding generating sets)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8502",
		" Description of Goods": "Electric generating sets and rotary converters",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8503",
		" Description of Goods": "Parts suitable for use solely or principally with the machines of heading 8501 or 8502",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8504",
		" Description of Goods": "Transformers Industrial Electronics; Electrical Transformer; Static Convertors (UPS)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8505",
		" Description of Goods": "Electro-magnets; permanent magnets and articles intended to become permanent magnets after magnetisation; electro-magnetic or permanent magnet chucks; clamps and similar holding devices; electro-magnetic couplings; clutches and brakes; electro-magnetic lifting heads",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8514",
		" Description of Goods": "Industrial or laboratory electric furnaces and ovens (including those functioning by induction or dielectric loss); other industrial or laboratory equipment for the heat treatment of materials by induction or dielectric loss",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8515",
		" Description of Goods": "Electric (including electrically heated gas); laser or other light or photo beam; ultrasonic; electron beam; magnetic pulse or plasma arc soldering; brazing or welding machines and apparatus; whether or not capable of cutting; electric machines and apparatus for hot spraying of metals or cermets",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8517  ",
		" Description of Goods": "Telephone sets; other apparatus for the transmission or reception of voice; images or other data; including apparatus for communication in a wired or wireless network (such as a local or wide area network); other than transmission or reception apparatus of heading 8443; 8525; 8527 or 8528",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8518",
		" Description of Goods": "Microphones and stands therefor; loudspeakers; whether or not mounted in their enclosures [other than single loudspeakers; mounted in their enclosures]; headphones and earphones; whether or not combined with a microphone; and sets consisting of a microphone and one or more loudspeakers;",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8521",
		" Description of Goods": "Video recording or reproducing apparatus; whether or not incorporating a video tuner",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8523",
		" Description of Goods": "Discs; tapes; solid-state non-volatile storage devices; ",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8525",
		" Description of Goods": "Closed-circuit television (CCTV)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8528",
		" Description of Goods": "Computer monitors not exceeding 17 inches; Set top Box for Television (TV)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8532",
		" Description of Goods": "Electrical capacitors; fixed; variable or adjustable (pre-set)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8533",
		" Description of Goods": "Electrical resistors (including rheostats and potentiometers); other than heating resistors",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8534 00 00",
		" Description of Goods": "Printed Circuits",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8535",
		" Description of Goods": "Electrical apparatus for switching or protecting electrical circuits; or for making connections to or in electrical circuits (for example; switches; fuses; lightning arresters; voltage limiters; surge suppressors; plugs and other connectors; junction boxes); for a voltage exceeding 1;000 volts",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8538 ",
		" Description of Goods": "Parts suitable for use solely or principally with the apparatus of heading 8535; 8536 or 8537",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8539",
		" Description of Goods": "Electrical Filaments or discharge lamps",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8540",
		" Description of Goods": "Thermionic; cold cathode or photo-cathode valves and tubes (for example; vacuum or vapour or gas filled valves and tubes; mercury arc rectifying valves and tubes; cathode-ray tubes; television camera tubes)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8541",
		" Description of Goods": "Diodes;  transistors and similar semi-conductor devices; photosensitive semi-conductor devices; light-emitting diodes  (LED); mounted piezo-electric crystals",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8542",
		" Description of Goods": "Electronic integrated circuits",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8543",
		" Description of Goods": "Electrical machines and apparatus; having individual functions; not specified or included elsewhere in this Chapter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8544",
		" Description of Goods": "Winding Wires; Coaxial cables; Optical Fiber",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8545",
		" Description of Goods": "Carbon electrodes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8546",
		" Description of Goods": "Electrical insulators of any material",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8548",
		" Description of Goods": "Waste and scrap of primary cells; primary batteries and electric accumulators; spent primary cells; spent primary batteries and spent electric accumulators; electrical parts of machinery or apparatus; not specified or included elsewhere in this Chapter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8609",
		" Description of Goods": "Containers (including containers for the transport of fluids) specially designed and equipped for carriage by one or more modes of transport [including refrigerated containers]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8703",
		" Description of Goods": "Cars for physically handicapped persons; subject to the following conditions:  a)      an officer not below the rank of Deputy Secretary to the Government of India in the Department of Heavy Industries certifies that the said goods are capable of being used by the physically handicapped persons; and b)      the buyer of the car gives an affidavit that he shall not dispose of the car for a period of five years after its purchase.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8704",
		" Description of Goods": "Refrigerated motor vehicles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8708",
		" Description of Goods": "Following parts of tractors namely: a.    Rear Tractor wheel rim; b.    tractor centre housing; c.    tractor housing transmission; d.    tractor support front axle",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8715",
		" Description of Goods": "Baby carriages and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8801",
		" Description of Goods": "Balloons and dirigibles; gliders and other non-powered aircraft",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8804",
		" Description of Goods": "Parachutes (including dirigible parachutes and paragliders) and rotochutes; parts thereof and accessories thereto and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8805",
		" Description of Goods": "Aircraft launching gear; deck arrestor or similar gear; ground flying trainers and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "8908 00 00",
		" Description of Goods": "Vessels and other floating structures for breaking up",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9001",
		" Description of Goods": "Optical fibres and optical fibre bundles; optical fibre cables other than those of heading 8544; sheets and plates of polarising material; prisms; mirrors and other optical elements; of any material; unmounted; other than such elements of glass not optically worked",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9002",
		" Description of Goods": "Lenses; prisms; mirrors and other optical elements; of any material; mounted; being parts of or fittings for instruments or apparatus; other than such elements of glass not optically worked [other than intraocular lens]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9003",
		" Description of Goods": "Frames and mountings for spectacles; goggles or the like; and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9004",
		" Description of Goods": "Spectacles [other than corrective];",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9016",
		" Description of Goods": "Balances of a sensitivity of 5 cg or better; with or without weights [other than electric or electronic balances]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9017",
		" Description of Goods": "Instruments for measuring length; for use in the hand (for example; measuring rods and tapes; micrometers; callipers); not specified or included elsewhere in the chapter",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9024",
		" Description of Goods": "Machines and appliances for testing the hardness; strength; compressibility; elasticity or other mechanical properties of materials (for example; metals; wood; textiles; paper; plastics)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9025",
		" Description of Goods": "Hydrometers and similar floating instruments; thermometers; pyrometers; barometers; hygrometers and psychrometers; recording or not; and any combination of these instruments",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9026",
		" Description of Goods": "Instruments and apparatus for measuring or checking the flow; level; pressure or other variables of liquids or gases (for example; flow meters; level gauges; manometers; heat meters); excluding instruments and apparatus of heading 9014; 9015; 9028 or 9032",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9027",
		" Description of Goods": "Instruments and apparatus for physical or chemical analysis (for example; polarimeters; refractometers; spectrometers; gas or smoke analysis apparatus); instruments and apparatus for measuring or checking viscosity; porosity; expansion; surface tension or the like; instruments and appratus for measuring or checking quantities of heat; sound or light (including exposure meters); microtomes ",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9028",
		" Description of Goods": "Gas; liquid or electricity supply or production meters; including calibrating meters therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9029",
		" Description of Goods": "Revolution counters; production counters; taximeters; mileometers; pedometers and the like; speed indicators and tachometers; other than those of heading 9014 or 9015; stroboscopes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9030",
		" Description of Goods": "Oscilloscopes; spectrum analysers and other instruments and apparatus for measuring or checking electrical quantities; excluding meters of heading 90.28; instruments and apparatus for measuring or detecting alpha; beta; gamma; X ray; cosmic or other ionising radiations",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9031",
		" Description of Goods": "Measuring or checking instruments; appliances and machines; not specified or included elsewhere in this Chapter; profile projectors",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9032",
		" Description of Goods": "Automatic regulating or controlling instruments and apparatus",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9033",
		" Description of Goods": "Parts and accessories (not specified or included elsewhere in this Chapter) for machines; appliances; instruments or apparatus of Chapter 90",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9103",
		" Description of Goods": "Clocks with watch movements; excluding clocks of heading 9104",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9105",
		" Description of Goods": "Other clocks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9109",
		" Description of Goods": "Clock movements; complete and assembled",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9114",
		" Description of Goods": "Other clock parts",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9110",
		" Description of Goods": "Complete clock movements; unassembled or partly assembled (movement sets); incomplete clock movements; assembled; rough clock movements",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9112",
		" Description of Goods": "Clock cases; and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9301",
		" Description of Goods": "Military weapons other than revolvers; pistols",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9303",
		" Description of Goods": "Other firearms and similar devices which operate by the firing of an explosive charge (for example; sporting shotguns and rifles; muzzle-loading firearms; very pistols and other devices designed to project only signal flares; pistols and revolvers for firing blank ammunition; captive-bolt humane killers; line-throwing guns)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9304",
		" Description of Goods": "Other arms (for example; spring; air or gas guns and pistols; truncheons); excluding those of heading 9307",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9305",
		" Description of Goods": "Parts and accessories of articles of headings 9301 to 9304",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9306",
		" Description of Goods": "Bombs; grenades; torpedoes; mines; missiles; and similar munitions of war and parts thereof; cartridges and other ammunition and projectiles and parts thereof; including shot and cartridge wads",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9307",
		" Description of Goods": "Swords; cut lasses; bayonets; lances and similar arms and parts thereof and scabbards and sheaths therefor",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9402",
		" Description of Goods": "Medical; surgical; dental or veterinary furniture (for example; operating tables; examination tables; hospital beds with mechanical fittings; dentists' chairs); barbers' chairs and similar chairs; having rotating as well as both reclining and elevating movements; parts of the foregoing articles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9403",
		" Description of Goods": "Bamboo furniture",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9404",
		" Description of Goods": "Coir mattresses; cotton pillows; mattress and quilts",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9406",
		" Description of Goods": "Prefabricated buildings",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9503",
		" Description of Goods": "Electronic Toys like tricycles; scooters; pedal cars etc. (including parts and accessories thereof)",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9506",
		" Description of Goods": "Swimming pools and padding pools",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9606 21 00; 9606 22 00; 9606 29; 9606 30",
		" Description of Goods": "Buttons; of plastics not covered with the textile material; of base metals; buttons of coconut shell; button blanks",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9603 [other than 9603 10 00]",
		" Description of Goods": "Brushes (including brushes constituting parts of machines; appliances or vehicles); hand operated mechanical floor sweepers; not motorised; mops and feather dusters; prepared knots and tufts for broom or brush making; paint pads and rollers; squeegees (other than roller squeegees) [other than brooms and brushes; consisting of twigs or other vegetable materials bound together; with or without handles]",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9604 00 00",
		" Description of Goods": "Hand sieves and hand riddles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9605",
		" Description of Goods": "Travel sets for personal toilet; sewing or shoe or clothes cleaning",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9607",
		" Description of Goods": "Slide fasteners and parts thereof",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9608",
		" Description of Goods": "Fountain pens; stylograph pens and other pens",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9610 00 00",
		" Description of Goods": "Boards; with writing or drawing surface; whether or not framed",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9612",
		" Description of Goods": "Typewriter or similar ribbons; inked or otherwise prepared for giving impressions; whether or not on spools or in cartridges; ink-pads; whether or not inked; with or without boxes",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9620 00 00  ",
		" Description of Goods": "Monopods; bipods; tripods and similar articles",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9801",
		" Description of Goods": "All items of machinery including prime movers; instruments; apparatus and appliances; control gear and transmission equipment; auxiliary equipment (including those required for research and  development purposes; testing and quality control); as well as all components (whether finished or not) or raw materials for the manufacture of the aforesaid items and their components; required for the initial setting up of a unit; or the substantial expansion of an existing unit; of a specified: (1)   industrial plant; (2)   irrigation project; (3)   power project; (4)   mining project; (5)   project for the exploration for oil or other minerals; and (6)   such other projects as the Central Government may; having regard to the economic development of the country notify in the Official Gazette in this behalf; and spare parts; other raw materials (including semi-finished materials of consumable stores) not exceeding 10% of the value of the goods specified above; provided that such spare parts; raw materials or consumable stores are essential for the maintenance of the plant or project mentioned in (1) to (6) above.",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "9802",
		" Description of Goods": "Laboratory chemicals",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "Any Chapter",
		" Description of Goods": "Goods which are not specified elsewhere",
		"CGST": "9",
		"SGST": "9",
		"IGST": "18"
	},
	{
		"HSN": "1703",
		" Description of Goods": "Molasses",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1704",
		" Description of Goods": "Chewing gum / bubble gum and white chocolate; not containing cocoa",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1804",
		" Description of Goods": "Cocoa butter; fat and oil",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1805",
		" Description of Goods": "Cocoa powder; not containing added sugar or sweetening matter",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1806",
		" Description of Goods": "Chocolates and other food preparations containing cocoa",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1901 90 [other than 1901 10; 1901 20 00]",
		" Description of Goods": "Malt extract; food preparations of flour; groats; meal; starch or malt extract; not containing cocoa or containing less than 40% by weight of cocoa calculated on a totally defatted basis; not elsewhere specified or included; food preparations of goods of heading 0401 to 0404; not containing cocoa or containing less than 5% by weight of cocoa calculated on a totally defatted basis not elsewhere specified or included [other than preparations for infants or young children; put up for retail sale and mixes and doughs for the preparation of bakers’ wares of heading 1905]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "1905 32",
		" Description of Goods": "Waffles and wafers coated with chocolate or containing chocolate",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2101 11; 2101 12 00",
		" Description of Goods": "Extracts; essences and concentrates of coffee; and preparations with a basis of these extracts; essences or concentrates or with a basis of coffee",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2106",
		" Description of Goods": "Food preparations not elsewhere specified or included i.e. Protein concentrates and textured protein substances; Sugar-syrups containing added flavouring or colouring matter; not elsewhere specified or included; lactose syrup; glucose syrup and malto dextrine syrup; Compound preparations for making non-alcoholic beverages; Food flavouring material; Churna for pan; Custard powder",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2106 90 20",
		" Description of Goods": "Pan masala",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2202 90 90",
		" Description of Goods": "Other non-alcoholic beverages",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2202 10",
		" Description of Goods": "All goods [including aerated waters]; containing added sugar or other sweetening matter or flavoured",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2401",
		" Description of Goods": "Unmanufactured tobacco; tobacco refuse [other than tobacco leaves]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2402",
		" Description of Goods": "Cigars; cheroots; cigarillos and cigarettes; of tobacco or of tobacco substitutes",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2403",
		" Description of Goods": "Other manufactured tobacco and manufactured tobacco substitutes; “homogenised” or “reconstituted” tobacco; tobacco extracts and essences [including biris]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2515 12 20; 2515 12 90",
		" Description of Goods": "Marble and travertine; other than blocks",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2516 12 00",
		" Description of Goods": "Granite; other than blocks",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2523",
		" Description of Goods": "Portland cement; aluminous cement; slag cement; super sulphate cement and similar hydraulic cements; whether or not coloured or in the form of clinkers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "2710",
		" Description of Goods": "Avgas",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3208",
		" Description of Goods": "Paints and varnishes (including enamels and lacquers) based on synthetic polymers or chemically modified natural polymers; dispersed or dissolved in a non-aqueous medium; solutions as defined in Note 4 to this Chapter",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3209",
		" Description of Goods": "Paints and varnishes (including enamels and lacquers) based on synthetic polymers or chemically modified natural polymers; dispersed or dissolved in an aqueous medium",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3210",
		" Description of Goods": "Other paints and varnishes (including enamels; lacquers and distempers); prepared water pigments of a kind used for finishing leather",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3213",
		" Description of Goods": "Artists’; students’ or signboard painters’ colours; modifying tints; amusement colours and the like; in tablets; tubes; jars; bottles; pans or in similar forms or packings",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3214",
		" Description of Goods": "Glaziers’ putty; grafting putty; resin cements; caulking compounds and other mastics; painters’ fillings; non- refractory surfacing preparations for facades; indoor walls; floors; ceilings or the like",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3303",
		" Description of Goods": "Perfumes and toilet waters",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3304",
		" Description of Goods": "Beauty or make-up preparations and preparations for the care of the skin (other than medicaments); including sunscreen or sun tan preparations; manicure or pedicure preparations [other than kajal; Kumkum; Bindi; Sindur; Alta]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3305 [other than 3305 9011; 3305 90 19]",
		" Description of Goods": "All goods; i.e. preparations for use on the hair such as Shampoos; Preparations for permanent waving or straightening; Hair lacquers; Brilliantines (spirituous); Hair cream; Hair dyes (natural; herbal or synthetic) [other than Hair oil]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3306 [other than 3306 10 10; 3306 10 20]",
		" Description of Goods": "Preparations for oral or dental hygiene; including and powders; yarn used to clean between the teeth (dental floss); in individual retail packages [other than dentifrices in powder or paste from (tooth powder or toothpaste)]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3307",
		" Description of Goods": "Pre-shave; shaving or after-shave preparations; personal deodorants; bath preparations; depilatories and other perfumery; cosmetic or toilet preparations; not elsewhere specified or included; prepared room deodorisers; whether or not perfumed or having disinfectant properties; such as Pre-shave; shaving or after-shave Preparations; Shaving cream; Personal deodorants and antiperspirants",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3401 30",
		" Description of Goods": "Organic surface-active products and preparations for washing the skin; in the form of liquid or cream and put up for retail sale; whether or not containing soap; paper; wadding; felt and nonwovens; impregnated; coated or covered with soap or detergent",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3402",
		" Description of Goods": "Organic surface-active agents (other than soap); surface-active preparations; washing preparations (including auxiliary washing preparations) and cleaning preparations; whether or not containing soap; other than those of heading 3401",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3403",
		" Description of Goods": "Lubricating preparations (including cutting-oil preparations; bolt or nut release preparations; anti-rust or anti-corrosion preparations and mould release preparations; based on lubricants) and preparations of a kind used for the oil or grease treatment of textile materials; leather; furskins or other materials; but excluding preparations containing; as basic constituents; 70% or more by weight of petroleum oils or of oils obtained from bituminous minerals",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3405",
		" Description of Goods": "Polishes and creams; for footwear; furniture; floors; coachwork; glass or metal; scouring pastes and powders and similar preparations (whether or not in the form of paper; wadding; felt; nonwovens; cellular plastics or cellular rubber; impregnated; coated or covered with such preparations); excluding waxes of heading 3404",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3407",
		" Description of Goods": "Modelling pastes; including those put up for children's amusement",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3602",
		" Description of Goods": "Prepared explosives; other than propellant powders; such as Industrial explosives",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3604",
		" Description of Goods": "Fireworks; signalling flares; rain rockets; fog signals and other pyrotechnic articles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3606",
		" Description of Goods": "Ferro-cerium and other pyrophoric alloys in all forms; articles of combustible materials as specified in Note 2 to this Chapter; such as liquid or liquefied-gas fuels in containers of a kind used for filling or refilling cigarette or similar lighters",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3811",
		" Description of Goods": "Anti-knock preparations; oxidation inhibitors; gum inhibitors; viscosity improvers; anti-corrosive preparations and other prepared additives; for mineral oils (including gasoline) or for other liquids used for the same purposes as mineral oils",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3813",
		" Description of Goods": "Preparations and charges for fire-extinguishers; charged fire-extinguishing grenades",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3814",
		" Description of Goods": "Organic composite solvents and thinners; not elsewhere specified or included; prepared paint or varnish removers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3819",
		" Description of Goods": "Hydraulic brake fluids and other prepared liquids for hydraulic transmission; not containing or containing less than 70% by weight of petroleum oils or oils obtained from bituminous minerals",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3820",
		" Description of Goods": "Anti-freezing preparations and prepared de-icing fluids",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3918",
		" Description of Goods": "Floor coverings of plastics; whether or not self-adhesive; in rolls or in form of tiles; wall or ceiling coverings of plastics",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3922",
		" Description of Goods": "Baths; shower baths; sinks; wash basins; bidets; lavatory pans; seats and covers; flushing cisterns and similar sanitary ware of plastics",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "3926 [other than 3926 40 11; 3926 90 10]",
		" Description of Goods": "Other articles of plastics and articles of other materials of headings 3901 to 3914 [other than bangles of plastic; PVC Belt Conveyor; plastic beads and plastic tarpaulins]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4011",
		" Description of Goods": "New pneumatic tyres; of rubber [other than of a kind used on/in bicycles; cycle-rickshaws and three wheeled powered cycle rickshaws; and Rear Tractor tyres]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4012",
		" Description of Goods": "Retreaded or used tyres and flaps",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4013",
		" Description of Goods": "Inner tubes of rubber [other than of a kind used on/in bicycles; cycle-rickshaws and three wheeled powered cycle rickshaws; and Rear Tractor tyre tubes]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4016 [other than 4016 92 00]",
		" Description of Goods": "Other articles of vulcanised rubber other than hard rubber (other than erasers)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4017",
		" Description of Goods": "Hard rubber (for example ebonite) in all forms; including waste and scrap; articles of hard rubber",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4201",
		" Description of Goods": "Saddlery and harness for any animal (including traces; leads; knee pads; muzzles; saddle cloths; saddle bags; dog coats and the like); of any material",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4202",
		" Description of Goods": "Trunks; suit-cases; vanity-cases; executive-cases; brief-cases; school satchels; spectacle cases; binocular cases; camera cases; musical instrument cases; gun cases; holsters and similar containers; travelling-bags; insulated food or beverages bags; toilet bags; rucksacks; handbags; shopping bags; wallets; purses; map-cases; cigarette-cases; to-bacco- pouches; tool bags; sports bags; bottle-cases; jewellery boxes; powder-boxes; cutlery cases and similar containers; of leather; of sheeting of plastics; of textile materials; of vulcanised fibre or of paperboard; or wholly or mainly covered with such materials or with paper [other than School satchels and bags other than of leather or composition leather; Toilet cases; Hand bags and shopping bags; of artificial plastic material; of cotton; or of jute; Vanity bags; Handbags of other materials excluding wicker work or basket work]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4203",
		" Description of Goods": "Articles of apparel and clothing accessories; of leather or of composition leather",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4205",
		" Description of Goods": "Other articles of leather or of composition leather",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4206",
		" Description of Goods": "Articles of gut (other than silk-worm gut); of goldbeater's skin; of bladders or of tendons",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4303",
		" Description of Goods": "Articles of apparel; clothing accessories and other articles of furskin",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4304",
		" Description of Goods": "Articles of artificial fur",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4410",
		" Description of Goods": "Particle board; Oriented Strand Board (OSB) and similar board (for example; wafer board) of wood or other ligneous materials; whether or not agglomerated with resins or other organic binding substances; other than specified boards",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4411",
		" Description of Goods": "Fibre board of wood or other ligneous materials; whether or not bonded with resins or other organic substances; other than specified boards",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4412",
		" Description of Goods": "Plywood; veneered panels and similar laminated wood",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4413",
		" Description of Goods": "Densified wood; in blocks; plates; strips; or profile shapes",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4414",
		" Description of Goods": "Wooden frames for paintings; photographs; mirrors or similar objects",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4418",
		" Description of Goods": "Builders’ joinery and carpentry of wood; including cellular wood panels; assembled flooring panels; shingles and shakes",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4421",
		" Description of Goods": "Wood paving blocks; articles of densified wood not elsewhere included or specified; Parts of domestic decorative articles used as tableware and kitchenware",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "4814",
		" Description of Goods": "Wall paper and similar wall coverings; window transparencies of paper",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6702",
		" Description of Goods": "Artificial flowers; foliage and fruit and parts thereof; articles made of artificial flowers; foliage or fruit",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6703",
		" Description of Goods": "Wool or other animal hair or other textile materials; prepared for use in making wigs or the like",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6704",
		" Description of Goods": "Wigs; false beards; eyebrows and eyelashes; switches and the like; of human or animal hair or of textile materials; articles of human hair not elsewhere specified or included",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6801",
		" Description of Goods": "Setts; curbstones and flagstones; of natural stone (except slate)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6802",
		" Description of Goods": "Worked monumental or building stone (except slate) and articles thereof; other than goods of heading 6801; mosaic cubes and the like; of natural stone (including slate); whether or not on a backing; artificially coloured granules; chippings and powder; of natural stone (including slate); of marble; travertine and alabaster; of Granite; of Other calcareous stone",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6803",
		" Description of Goods": "Worked slate and articles of slate or of agglomerated slate",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6807",
		" Description of Goods": "Articles of asphalt or of similar material (for example; petroleum bitumen or coal tar pitch)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6808",
		" Description of Goods": "Panels; boards; tiles; blocks and similar articles of vegetable fibre; of straw or of shavings; chips; particles; sawdust or other waste; of wood; agglomerated with cement; plaster or other mineral binders",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6809",
		" Description of Goods": "Articles of plaster or of compositions based on plaster; such as Boards; sheets; panels; tiles and similar articles; not ornamented",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6810",
		" Description of Goods": "Articles of cement; of concrete or of artificial stone; whether or not reinforced; such as Tiles; flagstones; bricks and similar articles; Building blocks and bricks; Cement bricks; Prefabricated structural components for Building or civil engineering; Prefabricated structural components for building or civil engineering",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6812",
		" Description of Goods": "Fabricated asbestos fibres; mixtures with a basis of asbestos or with a basis of asbestos and magnesium carbonate; articles of such mixtures or of asbestos (for example; thread; woven fabric; clothing; headgear; footwear; gaskets); whether or not reinforced; other than goods of heading 6811 or 6813",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6813",
		" Description of Goods": "Friction material and articles thereof (for example; sheets; rolls; strips; segments; discs; washers; pads); not mounted; for brakes; for clutches or the like; with a basis of asbestos; of other mineral substances or of cellulose; whether or not combined with textiles or other materials",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6814",
		" Description of Goods": "Worked mica and articles of mica; including agglomerated or reconstituted mica; whether or not on a support of paper; paperboard or other materials",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6815",
		" Description of Goods": "Articles of stone or of other mineral substances (including carbon fibres; articles of carbon fibres and articles of peat); not elsewhere specified or included",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6901",
		" Description of Goods": "Blocks; tiles and other ceramic goods of siliceous fossil meals (for example; kieselguhr; tripolite or diatomite) or of similar siliceous earths",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6904",
		" Description of Goods": "Ceramic flooring blocks; support or filler tiles and the like",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6905",
		" Description of Goods": "Chimney-pots; cowls; chimney liners; architectural ornaments and other ceramic constructional goods",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6906",
		" Description of Goods": "Ceramic pipes; conduits; guttering and pipe fittings",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6907",
		" Description of Goods": "Ceramic flags and paving; hearth or wall tiles; ceramic mosaic cubes and the like;  whether or not on a backing; finishing ceramics",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6909",
		" Description of Goods": "Ceramic wares for laboratory; chemical or other technical uses; ceramic troughs; tubs and similar receptacles of a kind used in agriculture; ceramic pots; jars and similar articles of a kind used for the conveyance or packing of goods",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6910",
		" Description of Goods": "Ceramic sinks; wash basins; wash basin pedestals; baths; bidets; water closet pans; flushing cisterns; urinals and similar sanitary fixtures",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6913",
		" Description of Goods": "Statuettes and other ornamental ceramic articles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "6914",
		" Description of Goods": "Other ceramic articles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7003",
		" Description of Goods": "Cast glass and rolled glass; in sheets or profiles; whether or not having an absorbent; reflecting or non-reflecting layer; but not otherwise worked",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7004",
		" Description of Goods": "Drawn glass and blown glass; in sheets; whether or not having an absorbent; reflecting or non-reflecting layer; but not otherwise worked",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7005",
		" Description of Goods": "Float glass and surface ground or polished glass; in sheets; whether or not having an absorbent; reflecting or non-reflecting layer; but not otherwise worked",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7006 00 00",
		" Description of Goods": "Glass of heading 70.03; 70.04 or 70.05; bent; edge-worked; engraved; drilled; enamelled or otherwise worked; but not framed or fitted with other materials",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7007",
		" Description of Goods": "Safety glass; consisting of toughened (tempered) or laminated glass",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7008",
		" Description of Goods": "Multiple-walled insulating units of glass",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7009",
		" Description of Goods": "Glass mirrors; whether or not framed; including rear-view mirrors",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7011",
		" Description of Goods": "Glass envelopes (including bulbs and tubes); open; and glass parts thereof; without fittings; for electric lamps; cathode-ray tubes or the like",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7014",
		" Description of Goods": "Signalling glassware and optical elements of glass (other than those of heading 7015); not optically worked",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7016",
		" Description of Goods": "Paving blocks; slabs; bricks; squares; tiles and other articles of pressed or moulded glass; whether or not wired; of a kind used for building or construction purposes; glass cubes and other glass smallwares; whether or not on a backing; for mosaics or similar decorative purposes; leaded lights and the like; multi-cellular or foam glass in blocks; panels; plates; shells or similar forms",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7020",
		" Description of Goods": "Other articles of glass [other than Globes for lamps and lanterns; Founts for kerosene wick lamps; Glass chimneys for lamps and lanterns]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7321",
		" Description of Goods": "Stoves [other than kerosene stove and LPG stoves]; ranges; grates; cookers (including those with subsidiary boilers for central heating); barbecues; braziers; gas-rings; plate warmers and similar non-electric domestic appliances; and parts thereof; of iron or steel",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7322",
		" Description of Goods": "Radiators for central heating; not electrically heated; and parts thereof; of iron or steel; air heaters and hot air distributors (including distributors which can also distribute fresh or conditioned air); not electrically heated; incorporating a motor-driven fan or blower; and parts thereof; of iron or steel",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7324",
		" Description of Goods": "Sanitary ware and parts thereof of iron and steel",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7418",
		" Description of Goods": "All goods other than utensils i.e. sanitary ware and parts thereof of copper",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7419",
		" Description of Goods": "Other articles of copper [including chain and parts thereof under 7419 10 and other articles under 7419 99] but not including metal castings under 7419 91 00",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7610 10 00",
		" Description of Goods": "Doors; windows and their frames and thresholds for doors",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7615",
		" Description of Goods": "All goods other than utensils i.e. sanitary ware and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8212",
		" Description of Goods": "Razors and razor blades (including razor blade blanks in strips)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8214",
		" Description of Goods": "Other articles of cutlery (for example; hair clippers; butchers' or kitchen cleavers; choppers and mincing knives;); manicure or pedicure sets and instruments (including nail files) [other than paper knives; pencil sharpeners and blades thereof]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8302",
		" Description of Goods": "Base metal mountings; fittings and similar articles suitable for furniture; doors; staircases; windows; blinds; coachwork; saddlery; trunks; chests; caskets or the like; base metal hat-racks; hat-pegs; brackets and similar fixtures; castors with mountings of base metal; automatic door closers of base metal",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8303",
		" Description of Goods": "Armoured or reinforced safes; strong-boxes and doors and safe deposit lockers for strong-rooms; cash or deed boxes and the like; of base metal",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8304",
		" Description of Goods": "Filing cabinets; card-index cabinets; paper trays; paper rests; pen trays; office-stamp stands and similar office or desk equipment; of base metal; other than office furniture of heading 9403",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8305",
		" Description of Goods": "Fittings for loose-leaf binders or files; letter clips; letter corners; paper clips; indexing tags and similar office articles; of base metal; staples in strips (for example; for offices; upholstery; packaging); of base metal",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8310",
		" Description of Goods": "Sign-plates; name-plates; address-plates and similar plates; numbers; letters and other symbols; of base metal; excluding those of heading 9405",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8407",
		" Description of Goods": "Spark-ignition reciprocating or rotary internal combustion piston engine",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8408",
		" Description of Goods": "Compression-ignition internal combustion piston engines (diesel or semi-diesel engines)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8409",
		" Description of Goods": "Parts suitable for use solely or principally with the engines of heading 8407 or 8408",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8413",
		" Description of Goods": "Pumps for dispensing fuel or lubricants of the type used in filling stations or garages [8413 11]; Fuel; lubricating or cooling medium pumps for internal combustion piston engines [8413 30]; concrete pumps [8413 40 00]; other rotary positive displacement pumps [8413 60]; [other than hand pumps falling under tariff item 8413 11 10]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8414",
		" Description of Goods": "Air or vacuum pumps; air or other gas compressors and fans; ventilating or recycling hoods incorporating a fan; whether or not fitted with filters",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8415",
		" Description of Goods": "Air-conditioning machines; comprising a motor-driven fan and elements for changing the temperature and humidity; including those machines in which the humidity cannot be separately regulated",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8418",
		" Description of Goods": "Refrigerators; freezers and other refrigerating or freezing equipment; electric or other; heat pumps other than air conditioning machines of heading 8415",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8419",
		" Description of Goods": "Storage water heaters; non-electric [8419 19] (other than solar water heater and system); Pressure vessels; reactors; columns or towers or chemical storage tanks [8419 89 10]; Glass lined equipment [8419 89 20];  Auto claves other than for cooking or heating food; not elsewhere specified or included [8419 89 30];  Cooling towers and similar plants for direct cooling (without a separating wall) by means of recirculated water [8419 89 40]; Plant growth chambers and rooms and tissue culture chambers and rooms having temperature; humidity or light control [8419 89 60]; Apparatus for rapid heating of semi- conductor devices ; apparatus for chemical or physical vapour deposition on semiconductor wafers; apparatus for chemical vapour deposition on LCD substratus [8419 89 70]; parts [8419 90]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8422",
		" Description of Goods": "Dish washing machines; household [8422 11 00] and other [8422 19 00]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8423",
		" Description of Goods": "Electric or electronic weighing machinery (excluding balances of a sensitivity of 5 centigrams or better); including weight operated counting or checking machines; weighing machine weights of all kinds",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8424",
		" Description of Goods": "Fire extinguishers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8427",
		" Description of Goods": "Fork-lift trucks; other works trucks fitted with lifting or handling equipment",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8428",
		" Description of Goods": "Other lifting; handling; loading or unloading machinery (for example; lifts; escalators; conveyors; teleferics)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8429",
		" Description of Goods": "Self-propelled bulldozers; angledozers; graders; levellers; scrapers; mechanical shovels; excavators; shovel loaders; tamping machines and road rollers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8430",
		" Description of Goods": "Other moving; grading; levelling; scraping; excavating; tamping; compacting; extracting or boring machinery; for earth; minerals or ores; pile-drivers and pile-extractors; snow-ploughs and snow-blowers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8443",
		" Description of Goods": "Printers which perform two or more of the functions of printing; copying or facsimile transmission; capable of connecting to an automatic data processing machine or to a network printers; copying machines; facsimile machines; ink cartridges with or without print head assembly and ink spray nozzle",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8450",
		" Description of Goods": "Household or laundry-type washing machines; including machines which both wash and dry",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8472",
		" Description of Goods": "Other office machines (for example; hectograph or stencil duplicating machines; addressing machines; automatic banknote dispensers; coin sorting machines; coin counting or wrapping machines [other than Braille typewriters; electric or non-electric; Perforating or stapling machines (staplers); pencil sharpening machines]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8476",
		" Description of Goods": "Automatic goods-vending machines (for example; postage stamps; cigarette; food or beverage machines); including money changing machines",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8478",
		" Description of Goods": "Machinery for preparing or making up tobacco; not specified or included elsewhere in this chapter",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8479",
		" Description of Goods": "Passenger boarding bridges of a kind used in airports [8479 71 00] and other [8479 79 00]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8483",
		" Description of Goods": "Transmission shafts (including cam shafts and crank shafts) and cranks; bearing housings and plain shaft bearings; gears and gearing; ball or roller screws; gear boxes and other speed changers; including torque converters; flywheels and pulleys; including pulley blocks; clutches and shaft couplings (including universal joints)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8484",
		" Description of Goods": "Gaskets and similar joints of metal sheeting combined with other material or of two or more layers of metal; sets or assortments of gaskets and similar joints; dissimilar in composition; put up in pouches; envelopes or similar packings; mechanical seals",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8504",
		" Description of Goods": "Static converters (for example; rectifiers) and inductors [other than Transformers Industrial Electronics; Electrical Transformer; Static Convertors (UPS)]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8506",
		" Description of Goods": "Primary cells and primary batteries",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8507",
		" Description of Goods": "Electric accumulators; including separators therefor; whether or not rectangular (including square)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8508",
		" Description of Goods": "Vacuum cleaners",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8509",
		" Description of Goods": "Electro-mechanical domestic appliances; with self-contained electric motor; other than vacuum cleaners of heading 8508",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8510",
		" Description of Goods": "Shavers; hair clippers and hair-removing appliances; with self-contained electric motor",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8511",
		" Description of Goods": "Electrical ignition or starting equipment of a kind used for spark-ignition or compression-ignition internal combustion engines (for example; ignition magnetos; magneto-dynamos; ignition coils; sparking plugs and glow plugs; starter motors); generators (for example; dynamos; alternators) and cut-outs of a kind used in conjunction with such engines",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8512",
		" Description of Goods": "Electrical lighting or signalling equipment (excluding articles of heading 8539); windscreen wipers; defrosters and demisters; of a kind used for cycles or motor vehicles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8513",
		" Description of Goods": "Portable electric lamps designed to function by their own source of energy (for example; dry batteries; accumulators; magnetos); other than lighting equipment of heading 8512",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8516",
		" Description of Goods": "Electric instantaneous or storage water heaters and immersion heaters; electric space heating apparatus and soil heating apparatus; electrothermic hair-dressing apparatus (for example; hair dryers; hair curlers; curling tong heaters) and hand dryers; electric smoothing irons; other electro-thermic appliances of a kind used for domestic purposes; electric heating resistors; other than those of heading 8545",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8517",
		" Description of Goods": "ISDN System [8517 69 10]; ISDN Terminal Adaptor [8517 69 20]; X 25 Pads [8517 69 40]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8518",
		" Description of Goods": "Single loudspeakers; mounted in their enclosures [8518 21 00]; Audio-frequency electric amplifiers [8518 40 00]; Electric sound amplifier sets [8518 50 00]; Parts [8518 90 00]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8519",
		" Description of Goods": "Sound recording or reproducing apparatus",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8522",
		" Description of Goods": "Parts and accessories suitable for use solely or principally with the apparatus of headings 8519 or 8521",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8525",
		" Description of Goods": "Transmission apparatus for radio-broadcasting or television; whether or not incorporating reception apparatus or sound recording or reproducing apparatus; television cameras; digital cameras and video cameras recorders [other than CCTV]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8526",
		" Description of Goods": "Radar apparatus; radio navigational aid apparatus and radio remote control apparatus",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8527",
		" Description of Goods": "Reception apparatus for radio-broadcasting; whether or not combined; in the same housing; with sound recording or reproducing apparatus or a clock",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8528",
		" Description of Goods": "Monitors and projectors; not incorporating television reception apparatus; reception apparatus for television; whether or not incorporating radio-broadcast receiver or sound or video recording or reproducing apparatus [other than computer monitors not exceeding 17 inches]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8529",
		" Description of Goods": "Parts suitable for use solely or principally with the apparatus of headings 8525 to 8528",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8530",
		" Description of Goods": "Electrical signalling; safety or traffic control equipment for railways; tramways; roads; inland waterways; parking facilities; port installations or airfields (other than those of heading 8608)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8531",
		" Description of Goods": "Electric sound or visual signalling apparatus (for example; bells; sirens; indicator panels; burglar or fire alarms); other than those of heading 8512 or 8530",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8536",
		" Description of Goods": "Electrical apparatus for switching or protecting electrical circuits; or for making connections to or in electrical circuits (for example; switches; relays; fuses; surge suppressors; plugs; sockets; lamp-holders; and other connectors; junction boxes); for a voltage not exceeding 1;000 volts : connectors for optical fibres optical fibres; bundles or cables",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8537",
		" Description of Goods": "Boards; panels; consoles; desks; cabinets and other bases; equipped with two or more apparatus of heading 8535 or 8536; for electric control or the distribution of electricity; including those incorporating instruments or apparatus of chapter 90; and numerical control apparatus; other than switching apparatus of heading 8517",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8539",
		" Description of Goods": "Sealed beam lamp units and ultra-violet or infra-red lamps; arc lamps [other than Electric filament or discharge lamps and LED lamps]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8544",
		" Description of Goods": "Insulated (including enamelled or anodised) wire; cable and other insulated electric conductors; whether or not fitted with connectors [other than Winding Wires; Coaxial cables; Optical Fiber]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8545",
		" Description of Goods": "Brushes [8545 20 00] and goods under 8545 (including arc lamp carbon and battery carbon)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8547",
		" Description of Goods": "Insulating fittings for electrical machines; appliances or equipment; being fittings wholly of insulating material apart from any minor components of metal (for example; threaded sockets) incorporated during moulding solely for the purposes of assembly; other than insulators of heading 8546; electrical conduit tubing and joints therefor; of base metal lined with insulating material",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8702",
		" Description of Goods": "Motor vehicles for the transport of ten or more persons; including the driver",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8703",
		" Description of Goods": "Motor cars and other motor vehicles principally designed for the transport of persons (other than those of heading 8702); including station wagons and racing cars [other than Cars for physically handicapped persons]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8704",
		" Description of Goods": "Motor vehicles for the transport of goods [other than Refrigerated motor vehicles]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8705",
		" Description of Goods": "Special purpose motor vehicles; other than those principally designed for the transport of persons or goods (for example; breakdown lorries; crane lorries; fire fighting vehicles; concrete-mixer lorries; road sweeper lorries; spraying lorries; mobile workshops; mobile radiological unit)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8706",
		" Description of Goods": "Chassis fitted with engines; for the motor vehicles of headings 8701 to 8705",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8707",
		" Description of Goods": "Bodies (including cabs); for the motor vehicles of headings 8701 to 8705",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8708",
		" Description of Goods": "Parts and accessories of the motor vehicles of headings 8701 to 8705 [other than specified parts of tractors]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8709",
		" Description of Goods": "Works trucks; self-propelled; not fitted with lifting or handling equipment; of the type used in factories; warehouses; dock areas or airports for short distance transport of goods; tractors of the type used on railway station platforms; parts of the foregoing vehicles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8710",
		" Description of Goods": "Tanks and other armoured fighting vehicles; motorised; whether or not fitted with weapons; and parts of such vehicles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8711",
		" Description of Goods": "Motorcycles (including mopeds) and cycles fitted with an auxiliary motor; with or without side-cars; side-cars",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8714",
		" Description of Goods": "Parts and accessories of vehicles of headings 8711 and 8713",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8716",
		" Description of Goods": "Trailers and semi-trailers; other vehicles; not mechanically propelled; parts thereof [other than Self-loading or self-unloading trailers for agricultural purposes; and Hand propelled vehicles (e.g. hand carts; rickshaws and the like); animal drawn vehicles]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8802",
		" Description of Goods": "Aircrafts for personal use",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "8903",
		" Description of Goods": "Yachts and other vessels for pleasure or sports; rowing boats and canoes",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9004",
		" Description of Goods": "Goggles",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9005",
		" Description of Goods": "Binoculars; monoculars; other optical telescopes; and mountings therefor; other astronomical instruments and mountings therefor; but not including instruments for radio-astronomy",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9006",
		" Description of Goods": "Photographic (other than cinematographic) cameras; photographic flashlight apparatus and flashbulbs other than discharge lamps of heading 8539",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9007",
		" Description of Goods": "Cinematographic cameras and projectors; whether or not incorporating sound recording or reproducing apparatus",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9008",
		" Description of Goods": "Image projectors; other than cinematographic; photographic (other than cinematographic) enlargers and reducers",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9010",
		" Description of Goods": "Apparatus and equipment for photographic (including cinematographic) laboratories; not specified or included elsewhere in this Chapter; negatoscopes; projection screens",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9011",
		" Description of Goods": "Compound optical microscopes; including those for photomicrography cinephotomicrography or microprojection",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9012",
		" Description of Goods": "Microscopes other than optical microscopes; diffraction apparatus",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9013",
		" Description of Goods": "Liquid crystal devices not constituting articles provided for more specifically in other headings; lasers; other than laser diodes; other optical appliances and instruments; not specified or included elsewhere in this Chapter",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9014",
		" Description of Goods": "Direction finding compasses; other navigational instruments and appliances",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9015",
		" Description of Goods": "Surveying (including photogrammetrical surveying); hydrographic; oceanographic; hydrological; meteorological or geophysical instruments and appliances; excluding compasses; rangefinders",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9016",
		" Description of Goods": "Electric or electronic balances of a sensitivity of 5 cg or better; with or without weights",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9022",
		" Description of Goods": "Apparatus based on the use of X-rays or of alpha; beta or gamma radiations; for \\ including radiography or radiotherapy apparatus; X-ray tubes and other X-ray generators; high tension generators; control panels and desks; screens; examinations or treatment tables; chairs and the light",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9023",
		" Description of Goods": "Instruments; apparatus and models; designed for demonstrational purposes (for example; in education or exhibitions); unsuitable for other uses",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9101",
		" Description of Goods": "Wrist-watches; pocket-watches and other watches; including stop-watches; with case of precious metal or of metal clad with precious metal",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9102",
		" Description of Goods": "Wrist-watches; pocket-watches and other watches; including stop watches; other than those of heading 9101",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9104",
		" Description of Goods": "Instrument panel clocks and clocks of a similar type   for vehicles; aircraft; spacecraft or vessels",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9106",
		" Description of Goods": "Time of day recording apparatus and apparatus for measuring; recording or otherwise indicating intervals of time; with clock or watch movement or with synchronous motor (for example; time registers; time-recorders)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9107",
		" Description of Goods": "Time switches with clock or watch movement or with synchronous motor",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9108",
		" Description of Goods": "Watch movements; complete and assembled",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9110",
		" Description of Goods": "Complete watch movements; unassembled or partly assembled (movement sets); incomplete watch movements; assembled; rough watch movements",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9111",
		" Description of Goods": "Watch cases and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9112",
		" Description of Goods": "Cases for other than clocks; and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9113",
		" Description of Goods": "Watch straps; watch bands and watch bracelets; and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9114",
		" Description of Goods": "Other watch parts",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9201",
		" Description of Goods": "Pianos; including automatic pianos; harpsi-chords and other keyboard stringed instruments",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9202",
		" Description of Goods": "Other string musical instruments (for example; guitars; violins; harps)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9205",
		" Description of Goods": "Wind musical instruments (for example; keyboard pipe organs; accordions; clarinets; trumpets; bagpipes); other than fairground organs and mechanical street organs",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9206 00 00",
		" Description of Goods": "Percussion musical instruments (for example; drums; xylophones; cymbols; castanets; maracas)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9207",
		" Description of Goods": "Musical instruments; the sound of which is produced; or must be amplified; electrically (for example; organs; guitars; accordions)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9208",
		" Description of Goods": "Musical boxes; fairground organs; mechanical street organs; mechanical singing birds; musical saws and other musical instruments not falling within any other heading of this chapter; decoy calls of all kinds; whistles; call horns and other mouth-blown sound signalling instruments",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9209",
		" Description of Goods": "Parts (for example; mechanisms for musical boxes) and accessories (for example; cards; discs and rolls for mechanical instruments) of musical instruments; metronomes; tuning forks and pitch pipes of all kinds",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9302",
		" Description of Goods": "Revolvers and pistols; other than those of heading 9303 or 9304",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9401",
		" Description of Goods": "Seats (other than those of heading 9402); whether or not convertible into beds; and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9403",
		" Description of Goods": "Other furniture [other than bamboo furniture] and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9404",
		" Description of Goods": "Mattress supports; articles of bedding and similar furnishing (for example; mattresses; quilts; eiderdowns; cushions; pouffes and pillows) fitted with springs or stuffed or internally fitted with any material or of cellular rubber or plastics; whether or not covered",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9405",
		" Description of Goods": "Lamps and lighting fittings including searchlights and spotlights and parts thereof; not elsewhere specified or included; illuminated signs; illuminated name-plates and the like; having a permanently fixed light source; and parts thereof not elsewhere specified or included",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9504",
		" Description of Goods": "Video games consoles and Machines",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9505",
		" Description of Goods": "Festive; carnival or other entertainment articles; including conjuring tricks and novelty jokes",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9506",
		" Description of Goods": "Articles and equipment for general physical exercise; gymnastics; athletics",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9508",
		" Description of Goods": "Roundabouts; swings; shooting galleries and other fairground amusements; [other than travelling circuses and travelling menageries]",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9601",
		" Description of Goods": "Worked ivory; bone; tortoise-shell; horn; antlers; coral; mother-of-pearl and other animal carving material; and articles of these materials (including articles obtained by moulding)",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9602",
		" Description of Goods": "Worked vegetable or mineral carving material and articles of these materials moulded or carved articles of wax; of stearin; of natural gums or natural resins or of modelling pastes; and other moulded or carved articles; not elsewhere specified or included; worked; unhardened gelatin (except gelatin of heading 3503) and articles of unhardened gelatin",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9611",
		" Description of Goods": "Date; sealing or numbering stamps; and the like (including devices for printing or embossing labels); designed for operating in the hand; hand-operated composing sticks and hand printing sets incorporating such composing sticks",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9613",
		" Description of Goods": "Cigarette lighters and other lighters; whether or not mechanical or electrical; and parts thereof other than flints and wicks",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9614",
		" Description of Goods": "Smoking pipes (including pipe bowls) and cigar or cigarette holders; and parts thereof",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9616",
		" Description of Goods": "Scent sprays and similar toilet sprays; and mounts and heads therefor; powder-puffs and pads for the application of cosmetics or toilet preparations",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9617",
		" Description of Goods": "Vacuum flasks and other vacuum vessels; complete with cases; parts thereof other than glass inners",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9618",
		" Description of Goods": "Tailors' dummies and other lay figures; automata and other animated displays; used for shop window dressing",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "9804",
		" Description of Goods": "All dutiable articles intended for personal use",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "-",
		" Description of Goods": "Lottery  authorized by State Governments Explanation 1.- For the purposes of this entry; value of supply of lottery under sub-section (5) of section 15 of the Central Goods and Services Tax Act; 2017 read with section 20 of the Integrated Goods and Services Tax Act; 2017 (13 of 2017) shall be deemed to be 100/128 of the face value of ticket or of the price as notified in the Official Gazette by the organising State; whichever is higher. Explanation 2.-  (1) “Lottery authorized by State Governments” means a lottery which is authorized to be sold in State(s) other than the organising state also. (2) Organising state has the same meaning as assigned to it in clause (f) of sub-rule (1) of rule 2 of the Lotteries (Regulation) Rules; 2010.",
		"CGST": "14",
		"SGST": "14",
		"IGST": "28"
	},
	{
		"HSN": "7101",
		" Description of Goods": "Pearls; natural or cultured; whether or not worked or graded but not strung; mounted or set; pearls; natural or cultured; temporarily strung for convenience of transport",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7102",
		" Description of Goods": "Diamonds; whether or not worked; but not mounted or set [other than Non-Industrial Unworked or simply sawn; cleaved or bruted]",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7103",
		" Description of Goods": "Precious stones (other than diamonds) and semi-precious stones; whether or not worked or graded but not strung; mounted or set; ungraded precious stones (other than diamonds) and semi-precious stones; temporarily strung for convenience of transport [other than Unworked or simply sawn or roughly shaped]",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7104",
		" Description of Goods": "Synthetic or reconstructed precious or semi-precious stones; whether or not worked or graded but not strung; mounted or set; ungraded synthetic or reconstructed precious or semi-precious stones; temporarily strung for convenience of transport [other than Unworked or simply sawn or roughly shaped]",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7105",
		" Description of Goods": "Dust and powder of natural or synthetic precious or semi-precious stones",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7106",
		" Description of Goods": "Silver (including silver plated with gold or platinum); unwrought or in semi-manufactured forms; or in powder form",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7107",
		" Description of Goods": "Base metals clad with silver; not further worked than semi-manufactured",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7108",
		" Description of Goods": "Gold (including gold plated with platinum) unwrought or in semi-manufactured forms; or in powder form",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7109",
		" Description of Goods": "Base metals or silver; clad with gold; not further worked than semi-manufactured",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7110",
		" Description of Goods": "Platinum; unwrought or in semi-manufactured forms; or in powder form",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7111",
		" Description of Goods": "Base metals; silver or gold; clad with platinum; not further worked than semi-manufactured",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7112",
		" Description of Goods": "Waste and scrap of precious metal or of metal clad with precious metal; other waste and scrap containing precious metal or precious metal compounds; of a kind used principally for the recovery of precious metal.",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7113",
		" Description of Goods": "Articles of jewellery and parts thereof; of precious metal or of metal clad with precious metal",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7114",
		" Description of Goods": "Articles of goldsmiths' or silversmiths' wares and parts thereof; of precious metal or of metal clad with precious metal",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7115",
		" Description of Goods": "Other articles of precious metal or of metal clad with precious metal",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7116",
		" Description of Goods": "Articles of natural or cultured pearls; precious or semi-precious stones (natural; synthetic or reconstructed)",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7117",
		" Description of Goods": "Imitation jewellery",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7118",
		" Description of Goods": "Coin",
		"CGST": "1.5",
		"SGST": "1.5",
		"IGST": "3"
	},
	{
		"HSN": "7102",
		" Description of Goods": "Diamonds; non-industrial unworked or simply sawn; cleaved or bruted",
		"CGST": "0.125",
		"SGST": "0.125",
		"IGST": "0.25"
	},
	{
		"HSN": "7103",
		" Description of Goods": "Precious stones (other than diamonds) and semi-precious stones; unworked or simply sawn or roughly shaped",
		"CGST": "0.125",
		"SGST": "0.125",
		"IGST": "0.25"
	},
	{
		"HSN": "7104",
		" Description of Goods": "Synthetic or reconstructed precious or semi-precious stones; unworked or simply sawn or roughly shaped",
		"CGST": "0.125",
		"SGST": "0.125",
		"IGST": "0.25"
	},
	{
		"HSN": "101",
		" Description of Goods": "Live asses; mules and hinnies",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "102",
		" Description of Goods": "Live bovine animals",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "103",
		" Description of Goods": "Live swine",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "104",
		" Description of Goods": "Live sheep and goats",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "105",
		" Description of Goods": "Live poultry; that is to say; fowls of the species Gallus domesticus; ducks; geese; turkeys and guinea fowls.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "106",
		" Description of Goods": "Other live animal such as Mammals; Birds; Insects",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "201",
		" Description of Goods": "Meat of bovine animals; fresh and chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "202",
		" Description of Goods": "Meat of bovine animals frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "203",
		" Description of Goods": "Meat of swine; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "204",
		" Description of Goods": "Meat of sheep or goats; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "205",
		" Description of Goods": "Meat of horses; asses; mules or hinnies; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "206",
		" Description of Goods": "Edible offal of bovine animals; swine; sheep; goats; horses; asses; mules or hinnies; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "207",
		" Description of Goods": "Meat and edible offal; of the poultry of heading 0105; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "208",
		" Description of Goods": "Other meat and edible meat offal; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "209",
		" Description of Goods": "Pig fat; free of lean meat; and poultry fat; not rendered or otherwise extracted; fresh; chilled or frozen [other than frozen and put up in unit container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "209",
		" Description of Goods": "Pig fat; free of lean meat; and poultry fat; not rendered or otherwise extracted; salted; in brine; dried or smoked [other than put up in unit containers]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "210",
		" Description of Goods": "Meat and edible meat offal; salted; in brine; dried or smoked; edible flours and meals of meat or meat offal; other than put up in unit containers",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3",
		" Description of Goods": "Fish seeds; prawn / shrimp seeds whether or not processed; cured or in frozen state [other than goods falling under Chapter 3 and attracting 5%]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "301",
		" Description of Goods": "Live fish.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "302",
		" Description of Goods": "Fish; fresh or chilled; excluding fish fillets and other fish meat of heading 0304",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "304",
		" Description of Goods": "Fish fillets and other fish meat (whether or not minced); fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "306",
		" Description of Goods": "Crustaceans; whether in shell or not; live; fresh or chilled; crustaceans; in shell; cooked by steaming or by boiling in water live; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "307",
		" Description of Goods": "Molluscs; whether in shell or not; live; fresh; chilled; aquatic invertebrates other than crustaceans and molluscs; live; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "308",
		" Description of Goods": "Aquatic invertebrates other than crustaceans and molluscs; live; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "401",
		" Description of Goods": "Fresh milk and pasteurised milk; including separated milk; milk and cream; not concentrated nor containing added sugar or other sweetening matter; excluding Ultra High Temperature (UHT) milk",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "403",
		" Description of Goods": "Curd; Lassi; Butter milk",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "406",
		" Description of Goods": "Chena or paneer; other than put up in unit containers and bearing a registered brand name;",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "407",
		" Description of Goods": "Birds' eggs; in shell; fresh; preserved or cooked",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "409",
		" Description of Goods": "Natural honey; other than put up in unit container and bearing a registered brand name",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "501",
		" Description of Goods": "Human hair; unworked; whether or not washed or scoured; waste of human hair",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "506",
		" Description of Goods": "All goods i.e. Bones and horn-cores; unworked; defatted; simply prepared (but not cut to shape); treated with acid or gelatinised; powder and waste of these products",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "0507 90",
		" Description of Goods": "All goods i.e. Hoof meal; horn meal; hooves; claws; nails and beaks; antlers; etc.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "511",
		" Description of Goods": "Semen including frozen semen",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "6",
		" Description of Goods": "Live trees and other plants; bulbs; roots and the like; cut flowers and ornamental foliage",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "701",
		" Description of Goods": "Potatoes; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "702",
		" Description of Goods": "Tomatoes; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "703",
		" Description of Goods": "Onions; shallots; garlic; leeks and other alliaceous vegetables; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "704",
		" Description of Goods": "Cabbages; cauliflowers; kohlrabi; kale and similar edible brassicas; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "705",
		" Description of Goods": "Lettuce (Lactuca sativa) and chicory (Cichorium spp.); fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "706",
		" Description of Goods": "Carrots; turnips; salad beetroot; salsify; celeriac; radishes and similar edible roots; fresh or chilled",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "707",
		" Description of Goods": "Cucumbers and gherkins; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "708",
		" Description of Goods": "Leguminous vegetables; shelled or unshelled; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "709",
		" Description of Goods": "Other vegetables; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "712",
		" Description of Goods": "Dried vegetables; whole; cut; sliced; broken or in powder; but not further prepared.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "713",
		" Description of Goods": "Dried leguminous vegetables; shelled; whether or not skinned or split.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "714",
		" Description of Goods": "Manioc; arrowroot; salep; Jerusalem artichokes; sweet potatoes and similar roots and tubers with high starch or inulin content; fresh or chilled; sago pith.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "801",
		" Description of Goods": "Coconuts; fresh or dried; whether or not shelled or peeled",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "801",
		" Description of Goods": "Brazil nuts; fresh; whether or not shelled or peeled",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "802",
		" Description of Goods": "Other nuts; Other nuts; fresh such as Almonds; Hazelnuts or filberts (Coryius spp.); walnuts; Chestnuts (Castanea spp.); Pistachios; Macadamia nuts; Kola nuts (Cola spp.); Areca nuts; fresh; whether or not shelled or peeled",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "803",
		" Description of Goods": "Bananas; including plantains; fresh or dried",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "804",
		" Description of Goods": "Dates; figs; pineapples; avocados; guavas; mangoes and mangosteens; fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "805",
		" Description of Goods": "Citrus fruit; such as Oranges; Mandarins (including tangerines and satsumas); clementines; wilkings and similar citrus hybrids; Grapefruit; including pomelos; Lemons (Citrus limon; Citrus limonum) and limes (Citrus aurantifolia; Citrus latifolia); fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "806",
		" Description of Goods": "Grapes; fresh",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "807",
		" Description of Goods": "Melons (including watermelons) and papaws (papayas); fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "808",
		" Description of Goods": "Apples; pears and quinces; fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "809",
		" Description of Goods": "Apricots; cherries; peaches (including nectarines); plums and sloes; fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "810",
		" Description of Goods": "Other fruit such as strawberries; raspberries; blackberries; mulberries and loganberries; black; white or red currants and gooseberries; cranberries; bilberries and other fruits of the genus vaccinium; Kiwi fruit; Durians; Persimmons; Pomegranates; Tamarind; Sapota (chico); Custard-apple (ata); Bore; Lichi; fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "814",
		" Description of Goods": "Peel of citrus fruit or melons (including watermelons); fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9",
		" Description of Goods": "All goods of seed quality",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "901",
		" Description of Goods": "Coffee beans; not roasted",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "902",
		" Description of Goods": "Unprocessed green leaves of tea",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "909",
		" Description of Goods": "Seeds of anise; badian; fennel; coriander; cumin or caraway; juniper berries [of seed quality]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "0910 11 10",
		" Description of Goods": "Fresh ginger; other than in processed form",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "0910 30 10",
		" Description of Goods": "Fresh turmeric; other than in processed form",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1001",
		" Description of Goods": "Wheat and meslin [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1002",
		" Description of Goods": "Rye [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1003",
		" Description of Goods": "Barley [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1004",
		" Description of Goods": "Oats [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1005",
		" Description of Goods": "Maize (corn) [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1006",
		" Description of Goods": "Rice [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1007",
		" Description of Goods": "Grain sorghum [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1008",
		" Description of Goods": "Buckwheat; millet and canary seed; other cereals such as Jawar; Bajra; Ragi] [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1101",
		" Description of Goods": "Wheat or meslin flour [other than those put up in unit container and bearing a registered brand name].",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1102",
		" Description of Goods": "Cereal flours other than of wheat or meslin; [maize (corn) flour; Rye flour; etc.] [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1103",
		" Description of Goods": "Cereal groats; meal and pellets [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1104",
		" Description of Goods": "Cereal grains hulled",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1105",
		" Description of Goods": "Flour; of potatoes [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1106",
		" Description of Goods": "Flour; of the dried leguminous vegetables of heading 0713 (pulses) [other than guar meal 1106 10 10 and guar gum refined split 1106 10 90]; of sago or of roots or tubers of heading 0714 or of the products of Chapter 8 i.e. of tamarind; of singoda; mango flour; etc. [other than those put up in unit container and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "12",
		" Description of Goods": "All goods of seed quality",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1201",
		" Description of Goods": "Soya beans; whether or not broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1202",
		" Description of Goods": "Ground-nuts; not roasted or otherwise cooked; whether or not shelled or broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1204",
		" Description of Goods": "Linseed; whether or not broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1205",
		" Description of Goods": "Rape or colza seeds; whether or not broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1206",
		" Description of Goods": "Sunflower seeds; whether or not broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1207",
		" Description of Goods": "Other oil seeds and oleaginous fruits (i.e. Palm nuts and kernels; cotton seeds; Castor oil seeds; Sesamum seeds; Mustard seeds; Saffower (Carthamus tinctorius) seeds; Melon seeds; Poppy seeds; Ajams; Mango kernel; Niger seed; Kokam) whether or not broken; of seed quality.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1209",
		" Description of Goods": "Seeds; fruit and spores; of a kind used for sowing.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1210",
		" Description of Goods": "Hop cones; fresh.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1211",
		" Description of Goods": "Plants and parts of plants (including seeds and fruits); of a kind used primarily in perfumery; in pharmacy or for insecticidal; fungicidal or similar purpose; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1212",
		" Description of Goods": "Locust beans; seaweeds and other algae; sugar beet and sugar cane; fresh or chilled.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1213",
		" Description of Goods": "Cereal straw and husks; unprepared; whether or not chopped; ground; pressed or in the form of pellets",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1214",
		" Description of Goods": "Swedes; mangolds; fodder roots; hay; lucerne (alfalfa); clover; sainfoin; forage kale; lupines; vetches and similar forage products; whether or not in the form of pellets.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1301",
		" Description of Goods": "Lac and Shellac",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1404 90 40",
		" Description of Goods": "Betel leaves",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1701 or 1702",
		" Description of Goods": "Jaggery of all types including Cane Jaggery (gur) and Palmyra Jaggery",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1904",
		" Description of Goods": "Puffed rice; commonly known as Muri; flattened or beaten rice; commonly known as Chira; parched rice; commonly known as khoi; parched paddy or rice coated with sugar or gur; commonly known as Murki",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1905",
		" Description of Goods": "Pappad; by whatever name it is known; except when served for consumption",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "1905",
		" Description of Goods": "Bread (branded or otherwise); except when served for consumption and pizza bread",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2106",
		" Description of Goods": "Prasadam supplied by religious places like temples; mosques; churches; gurudwaras; dargahs; etc.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2201",
		" Description of Goods": "Water [other than aerated; mineral; purified; distilled; medicinal; ionic; battery; de-mineralized and water sold in sealed container]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2201",
		" Description of Goods": "Non-alcoholic Toddy; Neera including date and palm neera",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2202 90 90",
		" Description of Goods": "Tender coconut water other than put up in unit container and bearing a registered brand name",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2302; 2304; 2305; 2306; 2308; 2309",
		" Description of Goods": "Aquatic feed including shrimp feed and prawn feed; poultry feed & cattle feed; including grass; hay & straw; supplement & husk of pulses; concentrates & additives; wheat bran & de-oiled cake",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2501",
		" Description of Goods": "Salt; all types",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2716 00 00",
		" Description of Goods": "Electrical energy",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2835",
		" Description of Goods": "Dicalcium phosphate (DCP) of animal feed grade conforming to IS specification No.5470 : 2002",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3002",
		" Description of Goods": "Human Blood and its components",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3006",
		" Description of Goods": "All types of contraceptives",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3101",
		" Description of Goods": "All goods and organic manure [other than put up in unit containers and bearing a registered brand name]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3304",
		" Description of Goods": "Kajal [other than kajal pencil sticks]; Kumkum; Bindi; Sindur; Alta",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3825",
		" Description of Goods": "Municipal waste; sewage sludge; clinical waste",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "3926",
		" Description of Goods": "Plastic bangles",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4014",
		" Description of Goods": "Condoms and contraceptives",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4401",
		" Description of Goods": "Firewood or fuel wood",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4402",
		" Description of Goods": "Wood charcoal (including shell or nut charcoal); whether or not agglomerated",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4802 / 4907",
		" Description of Goods": "Judicial; Non-judicial stamp papers; Court fee stamps when sold by the Government Treasuries or Vendors authorized by the Government",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4817 / 4907",
		" Description of Goods": "Postal items; like envelope; Post card etc.; sold by Government",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "48 / 4907",
		" Description of Goods": "Rupee notes when sold to the Reserve Bank of India",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4907",
		" Description of Goods": "Cheques; lose or in book form",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4901",
		" Description of Goods": "Printed books; including Braille books",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4902",
		" Description of Goods": "Newspapers; journals and periodicals; whether or not illustrated or containing advertising material",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4903",
		" Description of Goods": "Children's picture; drawing or colouring books",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "4905",
		" Description of Goods": "Maps and hydrographic or similar charts of all kinds; including atlases; wall maps; topographical plans and globes; printed",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5001",
		" Description of Goods": "Silkworm laying; cocoon",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5002",
		" Description of Goods": "Raw silk",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5003",
		" Description of Goods": "Silk waste",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5101",
		" Description of Goods": "Wool; not carded or combed",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5102",
		" Description of Goods": "Fine or coarse animal hair; not carded or combed",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5103",
		" Description of Goods": "Waste of wool or of fine or coarse animal hair",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "52",
		" Description of Goods": "Gandhi Topi",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "52",
		" Description of Goods": "Khadi yarn",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5303",
		" Description of Goods": "Jute fibres; raw or processed but not spun",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "5305",
		" Description of Goods": "Coconut; coir fibre",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "63",
		" Description of Goods": "Indian National Flag",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "6703",
		" Description of Goods": "Human hair; dressed; thinned; bleached or otherwise worked",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "6912 00 40",
		" Description of Goods": "Earthen pot and clay lamps",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "7018",
		" Description of Goods": "Glass bangles (except those made from precious metals)",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "8201",
		" Description of Goods": "Agricultural implements manually operated or animal driven i.e. Hand tools; such as spades; shovels; mattocks; picks; hoes; forks and rakes; axes; bill hooks and similar hewing tools; secateurs and pruners of any kind; scythes; sickles; hay knives; hedge shears; timber wedges and other tools of a kind used in agriculture; horticulture or forestry.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "8445",
		" Description of Goods": "Amber charkha",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "8446",
		" Description of Goods": "Handloom [weaving machinery]",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "8802 60 00",
		" Description of Goods": "Spacecraft (including satellites) and suborbital and spacecraft launch vehicles",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "8803",
		" Description of Goods": "Parts of goods of heading 8801",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9021",
		" Description of Goods": "Hearing aids",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "92",
		" Description of Goods": "Indigenous handmade musical instruments",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9603",
		" Description of Goods": "Muddhas made of sarkanda and phool bahari jhadoo",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9609",
		" Description of Goods": "Slate pencils and chalk sticks",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9610 00 00",
		" Description of Goods": "Slates",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "9803",
		" Description of Goods": "Passenger baggage",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "Any chapter",
		" Description of Goods": "Puja samagri namely;- (i) Rudraksha; rudraksha mala; tulsi kanthi mala; panchgavya (mixture of cowdung; desi ghee; milk and curd); (ii) Sacred thread (commonly known as yagnopavit); (iii) Wooden khadau; (iv) Panchamrit; (v) Vibhuti sold by religious institutions; (vi) Unbranded honey [proposed GST Nil] (vii) Wick for diya. (viii) Roli (ix) Kalava (Raksha sutra) (x) Chandan tika",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "",
		" Description of Goods": "Supply of lottery by any person other than State Government; Union Territory or Local authority subject to the condition that the supply of such lottery has suffered appropriate central tax; State tax; Union territory tax or integrated tax; as the case may be; when supplied by State Government; Union Territory or local authority; as the case may be; to the lottery distributor or selling agent appointed by the State Government; Union Territory or local authority; as the case may be.",
		"CGST": "0",
		"SGST": "0",
		"IGST": "0"
	},
	{
		"HSN": "2106 90 20",
		" Description of Goods": "Pan-masala",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2202 10 10",
		" Description of Goods": "Aerated waters",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2202 10 20",
		" Description of Goods": "Lemonade",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2202 10 90",
		" Description of Goods": "Lemonade",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2401",
		" Description of Goods": "Unmanufactured tobacco (without lime tube) – bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2401",
		" Description of Goods": "Unmanufactured tobacco (without lime tube) – bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2401",
		" Description of Goods": "Unmanufactured tobacco (with lime tube) – bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2401 30 00",
		" Description of Goods": "Tobacco refuse; bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 10 10",
		" Description of Goods": "Cigar and cheroots",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 10 20",
		" Description of Goods": "Cigarillos",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 10",
		" Description of Goods": "Cigarettes containing tobacco other than filter cigarettes; of length not exceeding 65 millimetres",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 20",
		" Description of Goods": "Cigarettes containing tobacco other than filter cigarettes; of length exceeding 65 millimetres but not exceeding 75 millimetres",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 30",
		" Description of Goods": "Filter cigarettes of length (including the length of the filter; the length of filter being 11 millimetres or its actual length; whichever is more) not exceeding 65 millimetres",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 40",
		" Description of Goods": "Filter cigarettes of length (including the length of the filter; the length of filter being 11 millimetres or its actual length; whichever is more) exceeding 65 millimetres but not exceeding 70 millimetres",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 50",
		" Description of Goods": "Filter cigarettes of length (including the length of the filter; the length of filter being 11 millimetres or its actual length; whichever is more) exceeding 70 millimetres but not exceeding 75 millimetres",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 20 90",
		" Description of Goods": "Other cigarettes containing tobacco",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 90 10",
		" Description of Goods": "Cigarettes of tobacco substitutes",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 90 20",
		" Description of Goods": "Cigarillos of tobacco substitutes",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2402 90 90",
		" Description of Goods": "Other",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 11 10",
		" Description of Goods": "'Hookah' or 'gudaku' tobacco bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 11 10",
		" Description of Goods": "Tobacco used for smoking 'hookah' or 'chilam' commonly known as 'hookah' tobacco or 'gudaku' not bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 11 90",
		" Description of Goods": "Other water pipe smoking tobacco not bearing a brand name.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 19 10",
		" Description of Goods": "Smoking mixtures for pipes and cigarettes",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 19 90",
		" Description of Goods": "Other smoking tobacco bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 19 90",
		" Description of Goods": "Other smoking tobacco not bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 91 00",
		" Description of Goods": "“Homogenised” or “reconstituted” tobacco; bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 10",
		" Description of Goods": "Chewing tobacco (without lime tube)",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 10",
		" Description of Goods": "Chewing tobacco (with lime tube)",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 10",
		" Description of Goods": "Filter khaini",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 20",
		" Description of Goods": "Preparations containing chewing tobacco",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 30",
		" Description of Goods": "Jarda scented tobacco",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 40",
		" Description of Goods": "Snuff",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 50",
		" Description of Goods": "Preparations containing snuff",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 60",
		" Description of Goods": "Tobacco extracts and essence bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 60",
		" Description of Goods": "Tobacco extracts and essence not bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 70",
		" Description of Goods": "Cut tobacco",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 90",
		" Description of Goods": "Pan masala containing tobacco ‘Gutkha’",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 90",
		" Description of Goods": "All goods; other than pan masala containing tobacco 'gutkha'; bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2403 99 90",
		" Description of Goods": "All goods; other than pan masala containing tobacco 'gutkha'; not bearing a brand name",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2701",
		" Description of Goods": "Coal; briquettes; ovoids and similar solid fuels manufactured from coal.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2702",
		" Description of Goods": "Lignite; whether or not agglomerated; excluding jet",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "2703",
		" Description of Goods": "Peat (including peat litter); whether or not agglomerated",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8702 10",
		" Description of Goods": "Motor vehicles for the transport of ten or more persons; including the driver",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703",
		" Description of Goods": "Motor vehicles cleared as ambulances duly fitted with all the fitments; furniture and accessories necessary for an ambulance from the factory manufacturing such motor vehicles",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703 10 10; 8703 80",
		" Description of Goods": "Electrically operated vehicles; including three wheeled electric motor vehicles.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703",
		" Description of Goods": "Three wheeled vehicles",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703",
		" Description of Goods": "Cars for physically handicapped persons; subject to the following conditions: a) an officer not below the rank of Deputy Secretary to the Government of India in the Department of Heavy Industries certifies that the said goods are capable of being used by the physically handicapped persons; and b) the buyer of the car gives an affidavit that he shall not dispose of the car for a period of five years after its purchase.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703 40; 8703 50;",
		" Description of Goods": "Following Vehicles; with both spark-ignition internal combustion reciprocating piston engine and electric motor as motors for propulsion; a) Motor vehicles cleared as ambulances duly fitted with all the fitments; furniture and accessories necessary for an ambulance from the factory manufacturing such motor vehicles b) Three wheeled vehicles c) Motor vehicles of engine capacity not exceeding 1200cc and of length not exceeding 4000 mm. Explanation.- For the purposes of this entry; the specification of the motor vehicle shall be determined as per the Motor Vehicles Act; 1988 (59 of 1988) and the rules made there under.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703 60; 8703 70",
		" Description of Goods": "Following Vehicles; with both compression -ignition internal combustion piston engine [ diesel-or semi diesel ) and electric motor as motors for propulsion; a) Motor vehicles cleared as ambulances duly fitted with all the fitments; furniture and accessories necessary for an ambulance from the factory manufacturing such motor vehicles b) Three wheeled vehicles c) Motor vehicles of engine capacity not exceeding 1500 cc and of length not exceeding 4000 mm. Explanation.- For the purposes of this entry; the specification of the motor vehicle shall be determined as per the Motor Vehicles Act; 1988 (59 of 1988) and the rules made there under.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703",
		" Description of Goods": "Hydrogen vehicles based on fuel cell tech and of length not exceeding 4000 mm. Explanation.- For the purposes of this entry; the specification of the motor vehicle shall be determined as per the Motor Vehicles Act; 1988 (59 of 1988) and the rules made there under.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703 21 or 8703 22",
		" Description of Goods": "Petrol; Liquefied petroleum gases (LPG) or compressed natural gas (CNG) driven motor vehicles of engine capacity not exceeding 1200cc and of length not exceeding 4000 mm. Explanation.- For the purposes of this entry; the specification of the motor vehicle shall be determined as per the Motor Vehicles Act; 1988 (59 of 1988) and the rules made there under.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703 31",
		" Description of Goods": "Diesel driven motor vehicles of engine capacity not exceeding 1500 cc and of length not exceeding 4000 mm. Explanation.- For the purposes of this entry; the specification of the motor vehicle shall be determined as per the Motor Vehicles Act; 1988 (59 of 1988) and the rules made there under.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8703",
		" Description of Goods": "All goods other than Compensation cess 15% those mentioned with compensation cess as Nil",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8711",
		" Description of Goods": "Motorcycles of engine capacity exceeding 350 cc.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8802",
		" Description of Goods": "Other aircraft (for example; helicopters; aeroplanes); for personal use.",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "8903",
		" Description of Goods": "Yacht and other vessels for pleasure or sports",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	},
	{
		"HSN": "",
		" Description of Goods": "",
		"CGST": "",
		"SGST": "",
		"IGST": ""
	}

]
exports.data1 = function (req, res) {
voucherTransaction.getDataSource().connector.connect(function (err, db) {
    var collection = db.collection('gstRate');
   collection.insert(gst,  function(err, result) {
                assert.equal(err, null);
                console.log("inserted")
                callback(result);
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