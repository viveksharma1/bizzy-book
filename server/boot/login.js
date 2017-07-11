module.exports = function(server) { 
    var jwt = require('jsonwebtoken');
    var router = server.loopback.Router();
    var UserModel = server.models.User;
    var mongo = require('mongodb').MongoClient;
    var Binary = mongo.Binary;
    server.set('superSecret', "vivek"); 
    var fs = require('fs');
    var bodyParser = require('body-parser');
    var formidable = require('formidable');
    var path = require('path');
    var azure = require('azure-storage');
    var uuid = require('node-uuid');
    var accessKey = 'MUibwEVXc21tA4lTza7EQttRsIh+Jk+CWGBRwVZzex32ybNp7fg7No0ARNVNF9+0mg/j+BWe4kJ+m3MtH0zbMw==';
    var storageAccount = 'bizzycrmcdn';
    var containerName = 'bizzy-book';
    form = new formidable.IncomingForm();
    var contexts = [];

// upload file to server/boot/uploads
    
router.post('/upload',function (req, res) {   
    //console.log(req);
    var form = new formidable.IncomingForm();
    //var name;
    var no = req.query.no;
    form.multiples = true;
    form.uploadDir = path.join(__dirname, '/uploads');
    var blobService = azure.createBlobService(storageAccount, accessKey);
  form.on('file', function(field, file) {  
      //name = file.name;
      //console.log(name);
    //console.log(file);
      //fs.rename(file.path, path.join(form.uploadDir, file.name));
    blobService.createContainerIfNotExists(containerName, function(error, result, response){
    if(!error){
      // Container exists and is private
    var fileName=file.name;
    var file_ext = fileName.substr((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1);
    
      var newFileName = uuid.v4()+ '.' + file_ext;
     
    blobService.createBlockBlobFromLocalFile(containerName, newFileName, file.path, function (error,result,response) {
                if (error) {
                      res.send(' Blob create: error ');
                }else{
       
        console.log(response);
        fs.unlinkSync(file.path);
        res.send(result);
        }
            });
    }
  });
  });
    
  form.on('error', function(err) {
      console.log('An error has occured: \n' + err);
  });

 form.parse(req);
 
});
   
    
//get file from server/boot/uploads    
 router.get('/getfile',function (req, res) { 
   var filepath =  req.query.path 
   var blobService = azure.createBlobService(storageAccount, accessKey);
   blobService.getBlobToStream(containerName, filepath, res, function(error){
        if(!error){
        }
        else
        {
            res.send(error);
        }
    });
});
    
    
   // delete file path from transaction 
 router.get('/delete',function (req, res) {
     Transaction.getDataSource().connector.connect(function (err, db) {
        var collection = db.collection('transaction');
        var filepath =  req.query.path
        var no =  req.query.no
        collection.update({no:no}, {$pull:{path:{$in:[filepath]}}},function (err, instance) {  
         if (err) {    
            return;
        }    
        })
    })    
});
    
    // account
    
    
     
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
            var res1 = result;
                
            UserModel.findOne({ where: { email: req.body.email } }, { fields: { email: true, role: true } }, function (err, data) {
                if (err) {
                    res.status(401).json({ "error": "wrong pass" });
                    return;
                }
                if(data.status=='0'){
                    res.json({ message: "User Not Found" });
                    return;
                }
                //console.log(data)
                //var data = instance;
                var token = jwt.sign({ role: data.role, email: data.email, permission: data.permission }, server.get('superSecret'), {
                });
                //var tokdata = jwt.verify(token, server.get('superSecret'),  { 
                //});
                //var role= tokdata.role;
                //delete res1["user"];
                //res1.user.permission = {};
                console.log(res1.user());
                res1.token = token;
                res.send(res1);
            });
        });
    });
    
  //logout route starts here
    
router.get('/logout', function (req, res){ 
  if (!req.query.token1) return res.sendStatus(401); //return 401:unauthorized if accessToken is not present      
    UserModel.logout(req.query.token1, function(err) {
      if (err)return res.send('invalid');
      res.send('logout'); //on successful logout, redirect
   });   
});
    
   
    
    
 
server.use(router);
};

