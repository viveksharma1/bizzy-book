module.exports = function (server) {
    var jwt = require('jsonwebtoken');
    var router = server.loopback.Router();
    var UserModel = server.models.User;
    var mongo = require('mongodb').MongoClient;
    var Transaction = server.models.transaction;
    var Account = server.models.account;
    var Binary = mongo.Binary;
    server.set('superSecret', "vivek");


    var fs = require('fs');
    var bodyParser = require('body-parser');
    var formidable = require('formidable');
    var path = require('path');
    form = new formidable.IncomingForm();
    var contexts = [];

    // vivek  upload file to server/boot/uploads

    router.post('/upload', function (req, res) {
        var form = new formidable.IncomingForm();
        var name;
        var no = req.query.no;
        form.multiples = true;
        form.uploadDir = path.join(__dirname, '/uploads');

        form.on('file', function (field, file) {
            name = file.name;
            console.log(name)
            fs.rename(file.path, path.join(form.uploadDir, file.name));
        });

        form.on('error', function (err) {
            console.log('An error has occured: \n' + err);
        });

        //push file path into path array 
        form.on('end', function () {
            Transaction.getDataSource().connector.connect(function (err, db) {
                var collection = db.collection('transaction');
                var path = 'server/boot/uploads/' + name;
                collection.findOne({ no: no, path: path }, function (err, instance) {
                    if (instance) {

                        return;
                    }

                    collection.update({ no: no }, { $push: { path: path } }, function (err, instance) {
                        if (err) {
                            return;
                        }
                    })
                })

            })
            res.end('success');
        })
        form.parse(req);
    });


    //get file from server/boot/uploads    
    router.get('/getfile', function (req, res) {
        var filepath = req.query.path
        var form = new formidable.IncomingForm();
        fs = require('fs');
        fs.readFile(filepath, function (err, data) {
            if (err) {
                return console.log(err);
            }
            res.send(data);
        });
    });


    // delete file path from transaction 
    router.get('/delete', function (req, res) {
        Transaction.getDataSource().connector.connect(function (err, db) {
            var collection = db.collection('transaction');
            var filepath = req.query.path
            var no = req.query.no
            collection.update({ no: no }, { $pull: { path: { $in: [filepath] } } }, function (err, instance) {
                if (err) {
                    return;
                }
            })
        })
    });

    // account

    router.post('/addammount', function (req, res) {
        var credit = req.body.credit;
        var debit = req.body.debit;
        var accountName = req.body.accountName;
        console.log(accountName);

        Account.getDataSource(accountName).connector.connect(function (err, db) {
            var collection = db.collection('account');
            if (credit != '') {
                collection.update({ accountName: accountName }, { $inc: { credit: Number(credit) } },
                    function (err, instance) {
                        if (err) {
                            console.log(err);
                        }



                    });
            }
            if (debit != '') {

                collection.update({ accountName: accountName }, { $inc: { debit: Number(debit) } },
                     function (err, instance) {

                         if (err) {
                             console.log(err);
                         }


                     });
            }



        })

        res.send({ "status": "200" });


    });


    //login routes start here

    router.post('/login', function (req, res) {
        var res1;
        const userCredentials = {
            "email": req.body.email,
            "password": req.body.password
        }
        UserModel.login(userCredentials, 'user', function (err, result) {
            if (err) {
                res.json({ message: "User Not Found" });
                return;
            }
            res1 = result;

            UserModel.find({ where: { email: req.body.email } }, { fields: { email: true, role: true } }, function (err, instance) {
                if (err) {
                    res.status(401).json({ "error": "wrong pass" });
                    return;
                }
                var data = instance;
                var token = jwt.sign({ role: instance[0].role, email: instance[0].email }, server.get('superSecret'), {
                });
                var tokdata = jwt.verify(token, server.get('superSecret'), {
                });
                var role = tokdata.role;

                res.json({ res1, token });
            });
        });
    });

    //logout route starts here

    router.get('/logout', function (req, res) {
        if (!req.query.token1) return res.sendStatus(401); //return 401:unauthorized if accessToken is not present      
        UserModel.logout(req.query.token1, function (err) {
            if (err) return res.send('invalid');
            res.send('logout'); //on successful logout, redirect
        });
    });





    server.use(router);
};

