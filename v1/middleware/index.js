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

 
middlewareObj.profileLogin =  function(req ,type, requestBody, done) {
    var answer = 'SELECT * FROM ' + type + 's WHERE email = ?';
    con.query(answer, requestBody.email, function (err, result, fields) {
        if (err) {
            throw err;
        }
        else {
            if (result.length > 0) {
                bcrypt.compare(requestBody.password, result[0].password, function (err, compare) {
                    if (compare === true) {
                        var answer2 = 'SELECT confirmed FROM ' + type + 's WHERE email = ?';
                        con.query(answer2, requestBody.email, function (err, confirmed) {
                            if (confirmed[0].confirmed === 1) {
                                req.app.locals.user = type;
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
              "http://localhost:3000/confirmed/" + token
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
    req.flash("error", "not auth");
    res.redirect("back");
}
module.exports = middlewareObj;