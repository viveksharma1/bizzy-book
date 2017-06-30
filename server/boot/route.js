module.exports = function (server) {
  var voucher = require('./voucherDelete');
  var account = require('./account');
  var router = server.loopback.Router();
   // account.data1();
   router.route('/deleteJournalAndContra/:voId').get(voucher.deleteTransaction);
   router.route('/deleteVoucher/:voId').get(voucher.deleteTransaction);
   router.route('/dateWiseAccountDetail').post(account.dateWiseAccountDetail);
   router.route('/isVoucherExist/:vochNo').get(account.isVoucherExist);
   router.route('/getBalanceSheet').post(account.getBalanceSheettest);
    router.route('/closingBalance/:accountId').get(account.closingBalance);
     router.route('/getGroupData').get(account.getGrpupData);
       router.route('/getGrpupDataForBalanceSheet').get(account.getGrpupDataForBalanceSheet);
       router.route('/getSalesRegister').get(account.getSalesRegister);
         router.route('/getMonthWiseSales').get(account.getMonthWiseSales);
   
 server.use(router);
};
