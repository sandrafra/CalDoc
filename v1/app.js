var express = require("express"),
    app = express(),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    bcrypt = require("bcrypt"),
    flash = require("connect-flash"),
    passport = require("passport"),
    patientsRoutes = require("./routes/patients"),
    doctorsRoutes = require("./routes/doctors"),
    clinicsRoutes = require("./routes/clinics"),
    indexRoutes = require("./routes/index"),
    middleware = require("./middleware"),
    con = require('./db'),
    path = require('path'),
    methodOverride = require("method-override");

app.locals.user = "";

var options = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE
};

var MySQLStore = require('express-mysql-session')(session);
var LocalStrategy = require('passport-local').Strategy;
require("dotenv").config();

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
    function (req, email, password, done) {
        middleware.profileLogin(req,req.body.user, req.body, done);
    }
));

app.use(function (req, res, next) {
    res.locals.currentUserID = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.type = app.locals.user;
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");

app.use(methodOverride("_method"));

app.use(indexRoutes);
app.use("/patients/patient", patientsRoutes);
app.use("/doctors/doctor", doctorsRoutes);
app.use("/clinics/clinic", clinicsRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`pp is running on port ${PORT}`);
});