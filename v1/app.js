var express = require("express"),
    app = express(),
    nodemailer = require('nodemailer'),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    mysql = require("mysql"),
    bcrypt = require("bcrypt"),
    crypto = require("crypto"),
    async = require("async"),
    flash = require("connect-flash"),
    google = require("googleapis"), 
    passport = require("passport");

app.locals.user = "";

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
app.use(flash());
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
    function (req, email, password,done) {
        profileLogin(req.body.user, req.body, done);
        }
));

app.use(function (req, res, next) {
    
    res.locals.currentUserID = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.type = app.locals.user;
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
        successRedirect: '/home',
        failureRedirect: '/login'
    })
);

app.get("/signup", function (req, res) {
    res.render("signup");
});
app.get("/registerdoc", function (req, res) {
    res.render("registerdoc");
});

app.post("/registerdoc", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT id FROM patients WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                req.flash("error", "E-mail is already used");
                res.redirect("back");
            } else if (req.body.password !== confirmedPass) {
                req.flash("error", "Passwords do not match");
                res.redirect("back");
            } else {

                bcrypt.hash(req.body.password, 8, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var doctor = [req.body.specialization, req.body.name, req.body.surname, req.body.email, hash, token];
                    con.query('INSERT INTO doctors (specialization, name, surname, email, password, token) VALUES (?, ?, ?, ?, ?, ?)', doctor, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            req.flash("success", "New account created. To confirm account please click link which was send to your e-mail");
                            res.redirect("/home");
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
    con.query("SELECT id FROM patients WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                req.flash("error", "E-mail is already used");
                res.redirect("back");
            } else if (req.body.password !== confirmedPass) {
                req.flash("error", "Passwords do not match");
                res.redirect("back");
            } else {
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var patient = [req.body.name, req.body.surname, req.body.email, hash, token];
                    con.query('INSERT INTO patients (name, surname, email, password, token) VALUES (?, ?, ?, ?, ?)', patient, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            req.flash("success", "New  doctor account created. To confirm account please click link which was send to your e-mail");
                            res.redirect("/home");
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
    con.query("SELECT id FROM patients WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0) {
                req.flash("error", "E-mail is already used");
                res.redirect("back");
            } else if (req.body.password !== confirmedPass) {
                req.flash("error", "Passwords do not match");
                res.redirect("back");
            } else {
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.zipcode, req.body.city, req.body.street, hash, token];

                    con.query('INSERT INTO clinics (name, email, phone, zipcode, city, street, password, token) VALUES (?, ?, ?, ?, ?, ?, ?,?)', clinic, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            verificationEmail(req.body.email, token);
                            req.flash("success", "New aclincccount created. To confirm account please click link which was send to your e-mail");
                            res.redirect("/home");
                        }
                    });
                });
            }
        }
    });
})
app.get("/logout", function (req, res) {
    req.logout();
    req.flash("success", "Logged you out");
    res.locals.currentUserID = undefined;
    req.session.destroy();
    res.redirect("/home");
});

app.get("/home", function (req, res) {
    res.render("index");
});

app.get('/patient', isLoggedin, isPatient, function (req, res) {
    con.query("SELECT id, name, surname, email FROM patients WHERE id = ?",req.user, function(err, result){
        if(err) throw err;
        else {
            res.render('patient', {patient: result[0]});
        }
    });
});

app.post('/patient/:id', isLoggedin, isPatient, function (req, res) {
    con.query("SELECT name, surname, email FROM patients WHERE id = ?",req.params.id, function(err, result){
        if(err) throw err;
        else {
            var patient = [req.body.name, req.body.surname, req.body.email, req.params.id];
            con.query("UPDATE patients SET name =  ?, surname = ?, email= ? WHERE id = ?", patient, function(err){
                if (err) throw err;
                else {
                    req.flash("success", "Profile settings has been updated succefuly");
                    res.redirect("/patient");
                }
            });
            
        }
    });
});

app.get("/patient/password", isPatient, isLoggedin, function(req,res){
    res.render("editpass");
})

app.get('/forgot', function (req, res) {
    res.render('forgot');
});

app.post('/forgot', function (req, res, next) {
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                var ans1 = "SELECT * FROM patients WHERE email = '" + req.body.email + "'";
                con.query(ans1, function (err, result) {
                    console.log(result)
                    if (result.length > 0) {
                        type = "patients";
                        done(err, token, type);
                    }
                });
                var ans2 = "SELECT * FROM doctors WHERE email = '" + req.body.email + "'";
                con.query(ans2, function (err, result) {
                    console.log(result)
                    if (result.length > 0) {
                        type = "doctors";
                        done(err, token, type);
                    }
                });
                var ans3 = "SELECT * FROM clinics WHERE email = '" + req.body.email + "'";
                con.query(ans3, function (err, result) {
                    console.log(result)
                    if (result.length > 0 ) {
                        type = "clinics";
                        done(err, token, type);
                    }
                });
                
            });
        },
        function (token, type,  done) {
            
            var update = "UPDATE " + type + " SET resettoken = '" + token + "', resetexpires = '" + (Date.now() + 3600000) + "' WHERE email = '" + req.body.email + "'";
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
                req.flash('success', 'An e-mail has been sent to ' + email + ' with further instructions.');
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
    var ans = "SELECT * FROM patients WHERE resettoken = '" + req.params.token + "'";
    console.log(ans);
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            console.log(Date.now());
            console.log(result[0].resetexpires);
            if(result[0].resetexpires > Date.now()){
                console.log("sds");
                return res.render('reset', { token: req.params.token, type: "patients"  });
               }
        } 
    });
    var ans2 = "SELECT * FROM doctors WHERE resettoken = '" + req.params.token + "'";
    con.query(ans2, function (err, result) {
        if (result.length > 0) {
            if(result[0].resetexpires > Date.now()){
                return res.render('reset', { token: req.params.token, type: "doctors" });
               }
        } 
    });
    var ans3 = "SELECT * FROM clinics WHERE resettoken = '" + req.params.token + "'";
    console.log(ans3);
    con.query(ans3, function (err, result) {
        if (result.length > 0) {
            console.log(result[0].resetexpires);
            if(result[0].resetexpires > Date.now()){
             return res.render('reset', { token: req.params.token, type: "clinics"  });
            }
        } else {
            console.log("nothing")
        }
    });
});

app.post('/reset/:token/:type', function (req, res) {
    async.waterfall([
        function (done) {
            if (req.body.password === req.body.confirm) {
                bcrypt.hash(req.body.password, 8, function (err, hash) {
                    var update = "UPDATE " + req.params.type + " SET resettoken = 0, resetexpires = 0, password = '" + hash + "' WHERE resettoken = '" + req.params.token + "'";
                    console.log(update)
                    con.query(update, function (err) {
                        if(err){
                            console.log("Cannot update a password");
                            return res.redirect("/home");
                            
                        } else {
                            done(err, email);
                        }
                    })
                });
            } else {
                req.flash("error", "Passwords do not match.");
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
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
    ], function (err) {
        res.redirect('/home');
    });
});

app.get("/confirmed/:token", function (req, res) {
    var ans = "SELECT email FROM patients WHERE token = '" + req.params.token + "'";
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            con.query("UPDATE patients SET token = 0, confirmed = 1 WHERE email = ?", result[0].email, function (err, result) {
                console.log("account confimred 1");
                return res.redirect("/home");
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
                return res.redirect("/home");
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
                return res.redirect("/home");
            });
            return 0;
        } else {
            console.log("nothing")
        }
    });

});

app.get("/clinics", function(req,res){
    con.query("SELECT name, city, zipcode, street, phone, email from clinics", function(err, result){
        if(err) throw err;
        else {
            res.render('clinics', {clinics: result});
        }
    })
    
});

app.get("/doctors", function(req,res){
    con.query("SELECT id, name, surname, email, specialization FROM doctors", function(err, result){
        if(err) throw err;
        else {
            res.render('doctors', {doctors: result});
        }
    })
});







//MIDDLEWARE

function profileLogin(type, requestBody, done) {
    var answer = 'SELECT * FROM ' + type + 's WHERE email = ?';
        console.log(app.locals.user);
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
                                app.locals.user = type;
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
    req.flash("error", "Please login first!");
    res.redirect("/login");
}

function isPatient(req,res,next) {
    if(app.locals.user == "patient"){
        return next();
    }
    res.redirect("/home");
}

function isDoctor(req,res,next) {
    if(app.locals.user == "doctor"){
        return next();
    }
    res.redirect("/home");
}

function isClinic(req,res,next) {
    if(app.locals.user == "clinic"){
        return next();
    }
    res.redirect("/home");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${PORT}`);
});