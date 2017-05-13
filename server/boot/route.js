module.exports = function (server) {
  var voucher = require('./voucherDelete');
  var account = require('./account');
  var router = server.loopback.Router();

   router.route('/deleteJournalAndContra/:voId').get(voucher.deleteTransaction);
   router.route('/deleteVoucher/:voId').get(voucher.deleteTransaction);
   router.route('/dateWiseAccountDetail').post(account.dateWiseAccountDetail);
   router.route('/isVoucherExist/:vochNo').get(account.isVoucherExist);
   router.route('/getBalanceSheet').post(account.getBalanceSheet);
   
 server.use(router);
};
