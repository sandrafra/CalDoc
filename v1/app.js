var express = require("express"),
    app = express(),
    nodemailer = require('nodemailer');
    session = require("express-session"),
    bodyParser = require("body-parser"),
    mysql = require("mysql"),
    bcrypt = require("bcrypt"),
    passport = require("passport");

var MySQLStore = require('express-mysql-session')(session);
var LocalStrategy = require('passport-local').Strategy;
require("dotenv").config();

  let transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USER, // generated ethereal user
      pass: process.env.MAIL_PASS, // generated ethereal password
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
        console.log(email);
        console.log(password);
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
                    var doctor = [req.body.specialization, req.body.name, req.body.surname, req.body.email, hash];
                    con.query('INSERT INTO doctors (specialization, name, surname, email, password) VALUES (?, ?, ?, ?, ?)', doctor, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
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
                    var patient = [req.body.name, req.body.surname, req.body.email, hash];
                    con.query('INSERT INTO patients (name, surname, email, password) VALUES (?, ?, ?, ?)', patient, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
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
                    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.zipcode, req.body.city, req.body.street, hash];
                    con.query('INSERT INTO clinics (name, email, phone, zipcode, city, street, password) VALUES (?, ?, ?, ?, ?, ?, ?)', clinic, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
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

function isLoggedin(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/");
}

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
                        return done(null, result[0].id);
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
}

// app.listen(3000, function () {
//     console.log("Server connected");
// });