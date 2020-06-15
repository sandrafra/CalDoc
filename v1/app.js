var express = require("express"),
    app = express(),
    session = require("express-session"),
    bodyParser = require("body-parser"),
    mysql = require("mysql"),
    bcrypt = require("bcrypt");



var con = mysql.createConnection({
    host: "mysql.agh.edu.pl",
    user: "sandraf1",
    password: "LxWTeuWU92S1ZfvX",
    database: "sandraf1"
});

app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
    // con.query("CREATE TABLE doctors (id INT PRIMARY KEY AUTO_INCREMENT, specialization VARCHAR(255), name Varchar(255), surname VARCHAR(255), email VARCHAR(255), password VARCHAR(255))", function(err,result){
    //     if (err){
    //         console.log(err);
    //     }
    //     else{
    //         console.log("TABLE CREATED");
    //     }
    // })
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
app.post("/login", function (req, res) {
    var user = [req.body.email, req.body.password];
    console.log(req.body)
    if (req.body.user === 'doctor') {
        console.log("doctor");
        con.query('SELECT * FROM doctors WHERE email = ? AND password = ? ', user, function (err, result, fields) {
            if (err) {
                console.log(err);
            }
            else {
                if (result.length > 0) {
                    req.session.loggedin = true;
                    req.session.username = req.body.email;
                    res.redirect('/calendar');
                }
                else {
                    res.send("Incorrect")
                }
            }
        });
    } else {
        console.log("patinet");
        con.query('SELECT * FROM patients WHERE email = ? AND password = ? ', user, function (err, result, fields) {
            if (err) {
                console.log(err);
            }
            else {
                if (result.length > 0) {
                    req.session.loggedin = true;
                    req.session.username = req.body.email;
                    res.redirect('/calendar');
                }
                else {
                    res.send("Incorrect")
                }
            }
        });
    }

});
app.get("/signup", function (req, res) {
    res.render("signup");
});
app.get("/registerdoc", function (req, res) {
    res.render("registerdoc");
})
app.get("/registerpat", function (req, res) {
    res.render("registerpat", {message: ""});
});
app.post("/registerpat", function (req, res) {
    var patient = [req.body.name, req.body.surname, req.body.email, req.body.password];
    var confirmedPass = req.body.password2;
    con.query("SELECT email FROM patients WHERE email = ?", [req.body.email], function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if (result.length > 0 ) {
                return res.render("registerpat", {
                    message: "This email is already used!"
                });
            } else if (req.body.password !== confirmedPass) {
                return res.render("registerpat", {
                    message: "Passwords do not match!"
                });
            } else {
                con.query('INSERT INTO patients (name, surname, email, password) VALUES (?, ?, ?, ?)', patient, function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("added new patinent");
                        res.redirect("/calendar");
                    }
                });
            }
        }
    });
});

    app.get("/calendar", function (req, res) {
    res.render("index");
});
app.listen(3000, function () {
    console.log("Server connected");
});