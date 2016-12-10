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
			
				 res.json({message:"User Not Found"});
				return;
			}
 
			
			
			//transform response to only return the token and ttl
			
       
       
      
       
    UserModel.find({where:{email:req.body.email}},{ fields: {email: true, role: true} },function (err, instance) {
         
         if (err) {
            //custom logger
           
            res.status(401).json({ "error": "wrong pass" });
            return;
        }
         
                            
          var data = instance;
         //res.json(instance);
           /*var Credentials = {
               
               role:instance[0].role,
               email:instance[0].email
               
           }*/
           //res.json(Credentials);
         
         var token = jwt.sign({role:instance[0].role,email:instance[0].email}, server.get('superSecret'), {
              
         });
             //res.json(token);  //console.log(token);
         var tokdata = jwt.verify(token, server.get('superSecret'),  {
       
         
       
        });
    var role= tokdata.role;
        res.json({role,token});
          //var role = tokdata.role;
        // console.log(tokdata);
         //res.json(tokdata.role,token);
   
        
         
    });
       
     
   
		});

   
         
  
    
                      
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
});
server.use(router);
};