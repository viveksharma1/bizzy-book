module.exports = function (server) {
 var voucher = require('./voucherDelete');
  var account = require('./account');
 var router = server.loopback.Router();


   router.route('/deleteVoucher/:voId').get(voucher.deleteTransaction);
   router.route('/dateWiseAccountDetail').post(account.dateWiseAccountDetail);
   router.route('/isVoucherExist/:vochNo').get(account.isVoucherExist);



  // router.get('/dateWiseAccountDetail/:compCode', function (req, res) {
































 server.use(router);
};
