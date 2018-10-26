var express = require("express");
var app = express();
var bodyParser=require("body-parser");
var mongoose = require("mongoose");
var passport = require('passport');
var async = require("async");//for mail
var nodemailer = require("nodemailer");//for mail
var crypto = require("crypto");//for mail

var LocalStrategy = require('passport-local');
var passportLocalMongoose=require("passport-local-mongoose");
var alert=require("alert-node");
var flash = require("connect-flash");
const multer   = require("multer");
const path     = require("path");
//for update
var methodOverride = require("method-override");
app.use(methodOverride("_method"));//for update i.e app.put


app.use(bodyParser.urlencoded({ extended : true})); //set up body parser for forms
app.set("view engine","ejs");
app.use( express.static( "public" ) );
app.use(flash());

//db connection
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/FoodFreaks");

//var CustomerSchema = new mongoose.Schema({
    //name     : String,
    //email    : String,
    //phno     : String,
    //location : String,
    //Address  : String,
    //createdTime : { type : Date , default : Date.now }
//});
//var Customer =  mongoose.model("Customer" , CustomerSchema );
//CustomerSchema.plugin(passportLocalMongoose);
//owner schema
var ownerSchema = new mongoose.Schema({
    title    : String,
    name     : String,
    email    : String,
    images     :[
        {
            type :mongoose.Schema.Types.ObjectId,
            ref  :"Image"
        }
    ] ,
    phno     : String,
    location : String,
    Address  : String,
    Tiffins  : String,
    Starters  : String,
    Drinks  : String,
    Veg_Items  : String,
    NON_Veg_Items  : String,
    Timings  : String,
    createdTime : { type : Date , default : Date.now }
});
var Owner =  mongoose.model("owner" , ownerSchema );

ownerSchema.plugin(passportLocalMongoose);

var UserSchema = new mongoose.Schema({
    username : {type: String, unique : true , required : true } ,
    password : String,
    type     : String,
    //need to modify
    resetPasswordToken     : String,
    resetPasswordExpires   : Date,
    isAdmin                : {type: Boolean, default: false}
});

UserSchema.plugin(passportLocalMongoose);
var Auth =  mongoose.model("Auth" , UserSchema );

app.use(require("express-session")({
    secret:"Welcome to secret world",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(Auth.authenticate()));
passport.serializeUser(Auth.serializeUser());
passport.deserializeUser(Auth.deserializeUser());
//creating Images Schema
var ImageSchema = new mongoose.Schema({ 
    fieldname: String,
    originalname: String,
    encoding: String,
    mimetype: String,
    destination: String,
    filename: String,
    path: String,
    size: Number
 });
var Image =  mongoose.model("Image" , ImageSchema );


// set storeage engine
const storage = multer.diskStorage({
    destination : './public/upload',
    filename : function(req,file ,cb   ){
        cb( null , file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

//init upoad
const upload = multer ({
    storage: storage,
    limits : {fileSize : 10000000  },
    fileFilter : function(req,file , cb){
        checkFileType(file , cb);   
    }
}).single('myImage');


//check file function 
function checkFileType(file ,cb){
    //allowed extension 
    const filetypes = /jpeg|jpg|png|gif/;
    const extname   = filetypes.test(path.extname(file.originalname).toLowerCase());
    //check mime
    const mimetype =filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    }else{
        cb("error : Images Only")
    }
}



//upload image


app.post("/upload" , isLoggedIn, (req,res) => {
    upload(req,res,(err) => {
        if(err){
            res.render("/service", { msg : err });
        }else{
            console.log(req.file);
            
            Image.create(req.file,function(err,newlyCreated){
                if(err){
                    console.log(err);
                }else{
                    console.log(newlyCreated);
                    console.log(req.user.username);
                    Owner.findOne({email : req.user.username}, function(err,found){
                        if(err){
                            console.log(err);
                        }else{
                            console.log(found);
                            found.images.push(newlyCreated);
                            found.save(function(err,finalFound){
                                if(err){
                                    console.log(err);
                                }else{
                                    console.log(finalFound);
                                    // res.redirect("/service");
                                    res.redirect("/service");
                                }
                            });
                            
                        }
                    });
                    
                }
            });

        }
    });
});



// app.get("/",function(req,res){
//     res.render("home");
// });


//});
app.get("/",function(req,res){
    Owner.find({}).populate("images").exec(function(err,user){
        if(err){
            console.log(err);
            // res.redirect("/");
        }else{
            var noMatch = "";
              //======// checking for empty images and making non empty
                    for (var i = 0; i < user.length; i++) {
                        if(user[i].images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            user[i].images.push(newImage);
                        }
                    }
                    //=====//Pushed fake data error solved
            if(user.length < 1 ){
                noMatch = " Not Found "
            }
            console.log(user);
            res.render("home" , { currentUser : req.user , owners : user , noMatch :noMatch , search : "" } ) ;
            
            
        }
    });
   
});

app.get("/service", isLoggedIn,function(req,res){
    Owner.find({email:req.user.username}).populate("images").exec(function(err,data){
        if(err){
            console.log(err);
        }else{
            console.log(data);
            res.render("service" , { file : data } ) ;
        }
    });
    
});

app.get("/service/:id/view" , function(req,res){
    Owner.findById( req.params.id).populate("images").exec(function(err,data){
        if(err){
            console.log(err);
        }else{
             //======// checking for empty images and making non empty
                    
                        if(data.images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            data.images.push(newImage);
                        }
                    
             //=====//Pushed fake data error solved
            res.render("moreService" , {data :data } );
            

        }
    })
    
});
//update menu
app.put("/update/:id/menu" , function(req,res){
     //find and update owner and redirect
     var newMenu = {
        Tiffins  :req.body.tiffins,
        Starters  : req.body.starters,
        Drinks  :req.body.drinks,
        Veg_Items  : req.body.veg,
        NON_Veg_Items  : req.body.nonveg,
        Timings  : req.body.timing,
        location  : req.body.location,
    };
    Owner.findByIdAndUpdate( req.params.id , newMenu , function(err,updated){
        if(err){
            console.log(err);
            res.send("ERROR OCCURED"+err);
        }else{
            console.log(updated);
            res.redirect("/service");
        }
    });
});

//forgot password
app.get("/forgotPassword" , function(req,res){
    res.render("forgotPassword"  , { currentUser : req.user }  );
});



//post forgot password
app.post('/forgotPassword', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        Auth.findOne({ username: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgotPassword');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail', 
          auth: {
            user: 'celebrons.bookmyhall@gmail.com',
            pass: 'celebrons@bookmyhall'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'celebrons.bookmyhall@gmail.com',
          subject: 'BookMyHall Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.username + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgotPassword');
    });
  });
  
  app.get('/reset/:token', function(req, res) {
    Auth.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgotPassword');
      }
      res.render('reset', {token: req.params.token});
    });
  });
  
  app.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        Auth.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgotPassword');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('/forgotPassword');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'gmail', 
          auth: {
            user: 'celebrons.bookmyhall@gmail.com',
            pass: 'celebrons@bookmyhall'
          }
        });
        var mailOptions = {
          to: user.username,
          from: 'celebrons.bookmyhall@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\t\t This is From BookMyHall\n\n' + 
            'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
       if(req.user.type == "O"){
            res.redirect("/addowner");
        }
    });
  });


//owner post
app.post("/addowner", function(req, res) 
{
    var title = req.body.title;
    var name = req.body.name;
    var email = req.body.username;
    var password = req.body.password;
    var mobile = req.body.number;
    var location = req.body.location;

    var newOwner  = {
        title    :title, 
        name     : name,
        email    : email,
        phno     : mobile,
        location : location,
        Tiffins  : "",
        Starters  : "" ,
        Drinks  : "" ,
        Veg_Items  : "" ,
        NON_Veg_Items  : "" ,
        Timings  : "" ,
        
    };
    Owner.create(newOwner,function(err,newlyCreated){
        if(err){
            console.log(err);
        }else{
            console.log(newlyCreated);
        }
    });
    Auth.register(new Auth({username:req.body.username,type:"O"}),req.body.password, function(err,user)
    {
        if(err)
        {
            console.log(err);
        }
        passport.authenticate("local")(req, res, function()
        {
            Owner.find({}).populate("images").exec(function(err,user){
                if(err){
                    console.log(err);
                    // res.redirect("/");
                }else{
                    var noMatch = "";
                      //======// checking for empty images and making non empty
                            for (var i = 0; i < user.length; i++) {
                                if(user[i].images.length == 0 ){
                                    var newImage = {
                                        fieldname: "",
                                        originalname: "",
                                        encoding: "",
                                        mimetype: "",
                                        destination: "",
                                        filename: "",
                                        path: "",
                                        size: 0
                                    }
                                    user[i].images.push(newImage);
                                }
                            }
                            //=====//Pushed fake data error solved
                    if(user.length < 1 ){
                        noMatch = " Not Found "
                    }
                    console.log(user);
                    res.render("home" , { currentUser : req.user , owners : user , noMatch :noMatch , search : "" } ) ;
                }
        
                });
            });
    });
});
//Login logic
app.post("/authuser",passport.authenticate("local"),function(req,res)
{
    Auth.findOne({username:req.body.username},function(err,user){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("/");
        }
        else{
            if(user.type=="O")
            {
                res.redirect("/service");
            }//else if(user.type == "C"){
               // res.redirect("/indexlogged");
            //}
        }
    });
});

app.get("/logout", function(req,res){
    req.logout();
    res.redirect("/");
});

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/");
}

//search page

app.get("/search" , function(req,res){
    if(req.query.location_search){
        const regex = new RegExp(escapeRegex(req.query.location_search), 'gi');
        Owner.find({  location: regex  }).populate("images").exec(function(err,user){
            if(err){
                console.log(err);
                // res.redirect("/");
            }else{
                var noMatch = "";
                 //======// checking for empty images and making non empty
                    for (var i = 0; i < user.length; i++) {
                        if(user[i].images.length == 0 ){
                            var newImage = {
                                fieldname: "",
                                originalname: "",
                                encoding: "",
                                mimetype: "",
                                destination: "",
                                filename: "",
                                path: "",
                                size: 0
                            }
                            user[i].images.push(newImage);
                        }
                    }
                    //=====//Pushed fake data error solved
                if(user.length < 1 ){
                    noMatch = "404 Halls Not Found "
                }
                console.log(user);
                res.render("home" , { currentUser : req.user , owners : user  , noMatch : noMatch ,search : req.query.location_search} ) ;
                
            }
        });
    }
 
    
    
    
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

app.listen("3000","localhost",function(){
    console.log("localhost:3000 CONNECTION ESTABLISHED FOR THE FOOD FREAKS........!. # @ # .! ");
});