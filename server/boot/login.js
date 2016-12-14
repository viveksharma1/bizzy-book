module.exports = function(server) { 
    var jwt = require('jsonwebtoken');
  var router = server.loopback.Router();
var UserModel = server.models.User;

server.set('superSecret', "vivek");
    
    
    
    
    var nodemailer = require('nodemailer');
    var fs = require('fs');

var bodyParser = require('body-parser');
var formidable = require('formidable'),
form = new formidable.IncomingForm();

router.post('/email',function (req, res) { // handle the route at yourdomain.com/sayHello

 form.parse(req, function(err, fields, files) {
        console.log("File received:\nName:"+files.pdf.name+"\ntype:"+files.pdf.type);
    });

    form.on('end', function() {
        /* this.openedFiles[0].path -- object Contains the path to the file uploaded
        ------- Use NodeMailer to process this file or attach to the mail-----------------*/
        console.log("PDF raw data:"+ fs.readFileSync(this.openedFiles[0].path, "utf8"));
        
         var newPath = "./myfile.pdf";
  fs.writeFile(newPath, fs.readFileSync(this.openedFiles[0].path, "utf8"), function (err) {
      
      
          var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'vkumarpatna@gmail.com', // Your email id
            pass: 'vivek@123' // Your password
        }
    });
    
    
    fs.readFile("./myfile.pdf", function (err, data) {
        
        
    var text = 'Hello world from \n\n' 
    
    
    var mailOptions = {
    from: 'vkumarpatna@gmail.com', // sender address
    to: 'vkumarpatna@gmail.com', // list of receivers
    subject: 'Email Example', // Subject line
    text: text,
    attachments: [{'filename': 'myfile.pdf', 'content': data}]
    
};
    
    transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
        res.json({yo: 'error'});
    }else{
        console.log('Message sent: ' + info.response);
        res.json({yo: info.response});
    };
});
});
   
  });
        //res.status(200).send("thank you");
    });
    // Not the movie transporter!

});
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