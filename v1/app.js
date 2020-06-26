var express = require("express"),
    app = express(),
    nodemailer = require('nodemailer'),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    mysql = require("mysql"),
    bcrypt = require("bcrypt"),
    jwt = require("jsonwebtoken"),
    randomString = require("randomstring"),
    crypto = require("crypto"),
    async = require("async"),
    passport = require("passport");

var MySQLStore = require('express-mysql-session')(session);
var LocalStrategy = require('passport-local').Strategy;
require("dotenv").config();

let transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE
});
var options = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE
};
var sessionStore = new MySQLStore(options);

app.use(session({
    secret: 'bhgycfyxrtyfyluyhcdawetsdtykg6vufyse7u',
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    expires: new Date(Date.now() + (3600))
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function (user_id, done) {
    done(null, user_id);
});

passport.deserializeUser(function (user_id, done) {
    done(null, user_id);
});


passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
},
    function (req, email, password, done) {
        profileLogin(req.body.user, req.body, done);
    }
));

app.use(function (req, res, next) {
    res.locals.currentUserID = req.user;
    next();
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.get("/", function (req, res) {
    res.render("landing");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.post('/login',
    passport.authenticate('local', {
        successRedirect: '/calendar',
        failureRedirect: '/login'
    })
);

app.get("/signup", function (req, res) {
    res.render("signup");
});
app.get("/registerdoc", function (req, res) {
    res.render("registerdoc", { message: "" });
});

app.post("/registerdoc", function (req, res) {


    var confirmedPass = req.body.password2;
    con.query("SELECT email FROM doctors WHERE email = ?", [req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                return res.render("registerdoc", {
                    message: "This email is already used!"
                });
            } else if (req.body.password !== confirmedPass) {
                return res.render("registerdoc", {
                    message: "Passwords do not match!"
                });
            } else {

                bcrypt.hash(req.body.password, 8, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var doctor = [req.body.specialization, req.body.name, req.body.surname, req.body.email, hash, token];
                    con.query('INSERT INTO doctors (specialization, name, surname, email, password, token) VALUES (?, ?, ?, ?, ?, ?)', doctor, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            console.log("added new patinent");
                            res.redirect("/calendar");
                        }
                    });
                });
            }
        }
    });
});

app.get("/registerpat", function (req, res) {
    res.render("registerpat", { message: "" });
});
app.post("/registerpat", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT email FROM patients WHERE email = ?", [req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                return res.render("registerpat", {
                    message: "This email is already used!"
                });
            } else if (req.body.password !== confirmedPass) {
                return res.render("registerpat", {
                    message: "Passwords do not match!"
                });
            } else {
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var patient = [req.body.name, req.body.surname, req.body.email, hash, token];
                    con.query('INSERT INTO patients (name, surname, email, password, token) VALUES (?, ?, ?, ?, ?)', patient, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            console.log("added new patinent");
                            res.redirect("/calendar");
                        }
                    });
                });
            }
        }
    });
});

app.get('/registercln', function (req, res) {
    res.render("registercln", { message: "" });
});

app.post("/registercln", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT email FROM clinics WHERE email = ?", [req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                return res.render("registercln", {
                    message: "This email is already used!"
                });
            } else if (req.body.password !== confirmedPass) {
                return res.render("registercln", {
                    message: "Passwords do not match!"
                });
            } else {
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.zipcode, req.body.city, req.body.street, hash, token];

                    con.query('INSERT INTO clinics (name, email, phone, zipcode, city, street, password, token) VALUES (?, ?, ?, ?, ?, ?, ?,?)', clinic, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            console.log("Added new clinic");
                            res.redirect("/calendar");
                        }
                    });
                });
            }
        }
    });
})
app.get("/logout", function (req, res) {
    req.logOut();
    req.session.destroy();
    res.redirect("/calendar");
});

app.get("/calendar", function (req, res) {
    res.render("index");
});

app.get('/patient', isLoggedin, function (req, res) {
    res.render("patient");
    req.logOut;
})

app.get('/forgot', function (req, res) {
    res.render('forgot');
});

app.post('/forgot', function (req, res, next) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            var email = "";
            var type = "patients";
            var ans1 = "SELECT * FROM patients WHERE email = '" + req.body.email + "'";
            con.query(ans1, function (err, result) {
                if (result.length > 0) {
                    console.log("nic");
                }
            });
            type = "doctors"
            var ans2 = "SELECT * FROM doctors WHERE email = '" + req.body.email + "'";
            con.query(ans2, function (err, result) {
                if (result.length > 0) {
                    console.log("nic2");

                }
            });
            type = 'clinics'
            var ans3 = "SELECT * FROM clinics WHERE email = '" + req.body.email + "'";
            console.log(ans3);
            con.query(ans3, function (err, result) {
                if (result.length > 0 ) {
                    console.log("nic3");

                } else {
                    return res.redirect("/forgot");
                }
            });
            console.log(email);
            var update = "UPDATE " + type + " SET resettoken = '" + token + "', resetexpires = '" + (Date.now() + 3600000) + "' WHERE email = '" + req.body.email + "'";
            console.log(update);
            con.query(update, function (err, result) {
                if (err){
                    return res.redirect("/forgot");
                
                } else {
                    email = req.body.email;
                    done(err, token, email);
                }
            })
        },
        function (token, email, done) {
            console.log(email);
            var mailOptions = {
                to: email,
                from: 'DocCal',
                subject: 'Node.js Password Reset',
                text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://localhost:3000/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            transporter.sendMail(mailOptions, function (err) { 
                if(err){
                     throw err;
                } else {
                console.log('mail sent');
                // req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
                done(err, 'done');
                }
            });
        }
    ], function (err) {
        if (err) return next(err);
        res.redirect('/forgot');
    });
});

app.get('/reset/:token', function (req, res) {
    var ans = "SELECT resetexpires FROM patients WHERE resettoken = '" + req.params.token + "'";
    con.query(ans, function (err, result) {
        if (result.length > 0 && (result[0].resetexpires > Date.now())) {
            res.render('reset', { token: req.params.token });
        } 
    });
    var ans2 = "SELECT resetexpires FROM doctors WHERE resettoken = '" + req.params.token + "'";
    con.query(ans2, function (err, result) {
        if (result.length > 0 && (result[0].resetexpires > Date.now())) {
            res.render('reset', { token: req.params.token });
        } 
    });
    var ans3 = "SELECT * FROM clinics WHERE resettoken = '" + req.params.token + "'";
    console.log(ans3);
    con.query(ans3, function (err, result) {
        console.log(result);
        console.log(Date.now());
        if (result.length > 0) {
            console.log(result[0].resetexpires);
            if(result[0].resetexpires > Date.now()){
            res.render('reset', { token: req.params.token });
            }
        } else {
            console.log("nothing")
        }
    });
});

app.post('/reset/:token', function (req, res) {
    console.log("hehe");
    async.waterfall([
        function (done) {
            var email = "";
            var type = "patients";
            var ans1 = "SELECT * FROM patients WHERE resettoken = '" + req.params.token + "'";
            con.query(ans1, function (err, result) {
                if (result.length > 0) {
                    email = result[0].email;
                    type = "patients"
                }
            });
            var ans2 = "SELECT * FROM doctors WHERE resettoken = '" + req.params.token + "'";
            type="doctors";
            con.query(ans2, function (err, result) {
                if (result.length > 0) {
                    email = result[0].email;
                    type = "doctors";
                }
            });
            var ans3 = "SELECT * FROM clinics WHERE resettoken = '" + req.params.token + "'";
            type="clinics"
            con.query(ans3, function (err, result) {
                if (result.length > 0) {
                    email = result[0].email;
                    type = "clinics";
                } else {
                    return res.redirect("/forgot");
                }
            });
            if (req.body.password === req.body.confirm) {
                bcrypt.hash(req.body.password, 8, function (err, hash) {
                    email = '';
                    var ans = "SELECT email FROM " + type + " WHERE resettoken = '" + req.params.token + "'";
                    console.log(ans);
                    con.query(ans, function(err, result){
                        if(result.length>0){
                            email = result[0].email;
                        }
                    })
                    var update = "UPDATE " + type + " SET resettoken = 0, resetexpires = 0, password = '" + hash + "' WHERE resettoken = '" + req.params.token + "'";
                    console.log(update)
                    con.query(update, function (err, result) {
                        if(err){
                            console.log("Cannot update a password");
                            return res.redirect("/calendar");
                            
                        } else {
                            done(err, email);
                        }
                    })
                });
            } else {
                // req.flash("error", "Passwords do not match.");
                console.log("wrong password")
                return res.redirect('back');
            }
        },
        function (email, done) {
            var mailOptions = {
                to: email,
                from: 'DocCal',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + email + ' has just been changed.\n'
            };
            transporter.sendMail(mailOptions, function (err) {
                // req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function (err) {
        res.redirect('/calendar');
    });
});

app.get("/confirmed/:token", function (req, res) {
    var ans = "SELECT email FROM patients WHERE token = '" + req.params.token + "'";
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            con.query("UPDATE patients SET token = 0, confirmed = 1 WHERE email = ?", result[0].email, function (err, result) {
                console.log("account confimred 1");
                return res.redirect("/calendar");
            });
            return 0;
        } else {
            console.log("nothing")
        }
    });
    var ans = "SELECT email FROM doctors WHERE token = '" + req.params.token + "'";
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            con.query("UPDATE doctors SET token = 0, confirmed = 1 WHERE email = ?", result[0].email, function (err, result) {
                console.log("account confimred 2");
                return res.redirect("/calendar");
            });
            return 0;
        } else {
            console.log("nothing")
        }
    });
    var ans = "SELECT email FROM clinics WHERE token = '" + req.params.token + "'";
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            con.query("UPDATE clinics SET token = 0, confirmed = 1 WHERE email = ?", result[0].email, function (err, result) {
                console.log("account confimred 3");
                return res.redirect("/calendar");
            });
            return 0;
        } else {
            console.log("nothing")
        }
    });

});

function profileLogin(type, requestBody, done) {
    var answer = 'SELECT * FROM ' + type + 's WHERE email = ?';
    con.query(answer, requestBody.email, function (err, result, fields) {
        if (err) {
            console.log(err);
        }
        else {
            if (result.length > 0) {
                bcrypt.compare(requestBody.password, result[0].password, function (err, compare) {
                    if (compare === true) {
                        var answer2 = 'SELECT confirmed FROM ' + type + 's WHERE email = ?';
                        con.query(answer2, requestBody.email, function (err, confirmed) {
                            if (confirmed[0].confirmed === 1) {
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

function verificationEmail(email, token) {
    transporter.sendMail({
        from: "DocCal",
        to: email,
        subject: "User Verification",
        text: "Hello, Thank you for registration in app DocCal! To finish you registration please confirm you email by clicking below link: http://localhost:3000/confirmed/" + token
    });
}

function isLoggedin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${PORT}`);
});