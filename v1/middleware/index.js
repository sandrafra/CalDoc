var middlewareObj = {};
var con = require("../db");
var bcrypt = require("bcrypt");
var app = require("../app");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

 
middlewareObj.profileLogin =  function(req ,profileType, requestBody, done) {
    var answer = 'SELECT * FROM ' + profileType + 's WHERE email = ?';
    con.query(answer, requestBody.email, function (err, result, fields) {
        if (err) {
            throw err;
        }
        else {
            if (result.length > 0) {
                bcrypt.compare(requestBody.password, result[0].password, function (err, compare) {
                    if (compare === true) {
                        var answer2 = 'SELECT confirmed FROM ' + type + 's WHERE email = ?';
                        con.query(answer2, requestBody.email, function (err, resultConfirmed) {
                            if (resultConfirmed[0].confirmed === 1) {
                                req.app.locals.user = profileType;
                                return done(null, result[0].id);

                            }
                            else {
                                console.log("account is not confimred yet")
                                return done(null, false);
                            }
                        });
                    }
                    else {
                        return done(null, false);

                    }
                });
            }
            else {
                return done(null, false);
            }
        }
    });
};


middlewareObj.verificationEmail =  function(email, token) {
    transporter.sendMail({
        from: "DocCal",
        to: email,
        subject: "User Verification",
        text: "Hello, Thank you for registration in app DocCal!" + 
              "To finish you registration please confirm you email by clicking below link:" + 
              "https://doccal.herokuapp.com/confirmed/" + token
    });
}

middlewareObj.sendForgot = function(email, token){
    transporter.sendMail({
        to: email,
        from: 'DocCal',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'https://doccal.herokuapp.com/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        });
}

middlewareObj.isLoggedin = function(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "Please login first!");
    res.redirect("/login");
}

middlewareObj.isPatient = function(req, res, next) {
    if (req.app.locals.user === "patient") {
        return next();
    }
    res.redirect("/home");
}

middlewareObj.isDoctor  = function(req, res, next) {
    if (req.app.locals.user === "doctor") {
        return next();
    }
    res.redirect("/home");
}

middlewareObj.isClinic = function(req, res, next) {
    if (req.app.locals.user === "clinic") {
        return next();
    }
    res.redirect("/home");
}

middlewareObj.checkAuth = function(req,res, next){
    console.log(res.locals.currentUserID)
    if (req.isAuthenticated()) {
        console.log(res.locals.currentUserID)
        console.log(req.params.id)
        if(res.locals.currentUserID == req.params.id){
            return next();
        }
    }
    req.flash("error", "Not authenticated");
    res.redirect("back");
}
module.exports = middlewareObj;