//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require('lodash');
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bcrypt = require('bcryptjs');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require('passport-facebook');
const findOrCreate = require('mongoose-findorcreate');
const date = require(__dirname + "/date.js");

const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'pookloko57@gmail.com',
        pass: 'cqkeutyeuvrqbyyc'
    }
});

const func = function truncateString(str, num) {
  if (str.length > num) {
    return str.slice(0, num) + "...";
  } else {
    return str;
  }
}

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_GOOGLE_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:4000/auth/google",
    passReqToCallback: true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return done(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.CLIENT_FACEBOOK_ID,
    clientSecret: process.env.CLIENT_FACEBOOK_SECRET,
    callbackURL: 'http://localhost:4000/auth/facebook',
    profileFields: ["email", "displayName", "id"]
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({
    facebookId: profile.id
    }, function(err, user) {
       return done(err, user);
    });
  }));


const composeSchema = new mongoose.Schema({
  title: String,
  body: String
});

const Compose = mongoose.model("Compose", composeSchema);

const signSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  email: String,
  content: String
});
const Sign = mongoose.model("Sign", signSchema);

app.get("/", function(req, res) {
var day = date.getDate();

res.render("home", {
  theDate: day
    });
  });

app.get("/download-file", function(req,res){
  res.download("./Noam Radiano-CV.pdf");
});

app.get("/contact", function(req, res) {
  var day = date.getDate();
  res.render("contact", {
    theDate: day
  });
});

app.get("/success",function(req,res)
{
  var day = date.getDate();
  res.render("success", {
    theDate: day
  });
});

app.post("/contact", function(req, res) {
  let mailDetails = {
      from: 'pookloko57@gmail.com',
      to: 'noamradiano@gmail.com',
      subject: req.body.fName + ' ' + req.body.lName + ' send me about my CV',
      text: 'Email: ' + req.body.email + '\nContant is: ' + req.body.details
  };

  mailTransporter.sendMail(mailDetails);

  res.redirect("/success");
});

app.get("/compose", function(req, res) {
  res.render("compose");
});

app.get("/about", function(req, res) {
  var day = date.getDate();
  res.render("about", {
    theDate: day
  });
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

app.get("/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["public_profile", "email"]
  })
);

app.get('/auth/facebook',
  passport.authenticate('facebook', { failureRedirect: '/login', failureMessage: true }),
  function(req, res) {
    res.redirect('/');
  });

app.get("/auth/google",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res){
    res.redirect("/");
  });

  app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get('/posts/:postId', function(req, res) {

  const nameRequest = req.params.postId;

  Compose.findOne({
    _id: nameRequest
  }, function(err, foundPost) {
    if (!err) {
      if (!foundPost) {
        res.redirect("/");
      } else {
        res.render("post", {
          newTitle: foundPost.title,
          newBody: foundPost.body
        });
      }
    }
  })
});

app.post("/compose", function(req, res) {

  const compose = new Compose({
    title: req.body.postTitle,
    body: req.body.postBody
  });

  compose.save(function(err) {
    if (!err) {
      res.redirect("/");
    }
  });
});

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});

  app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err)
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});
app.listen(process.env.PORT || 4000, function() {
  console.log("Server started on port 4000");
});
