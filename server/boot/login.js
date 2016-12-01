module.exports = function(server) { 
    var jwt = require('jsonwebtoken');
  var router = server.loopback.Router();
var UserModel = server.models.User;

server.set('superSecret', "vivek");
router.post('/login', function (req, res) {

    console.log(req.headers);
    
    //parse user credentials from request body
    const userCredentials = {
        "email": req.body.email,
        "password": req.body.password
    }

    UserModel.login(userCredentials, 'user', function (err, result) {
        if (err) {
            //custom logger
           
            res.status(401).json({ "error": "login failed" });
            return;
        }

       
        //transform response to only return the token and ttl
        
    })


  
    var Credentials;
    
     UserModel.find({where:{email:req.body.email}},{ fields: {email: true, role: true} },function (err, instance) {
                            
          var data = instance;
        
           var Credentials = {
               
               role: data[0].role,
               email:data[0].email
               
           }
         
         var token = jwt.sign(Credentials, server.get('superSecret'), {
              
         });
               console.log(token);
       var tokdata = jwt.verify(token, server.get('superSecret'),  {
       
           
       
        });
    
           var role = tokdata.role;
         console.log(tokdata);
         res.send({role,token});
    });
           
  
    
                      
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
});
server.use(router);
};