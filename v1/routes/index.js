var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var async = require("async");
var crypto = require("crypto");
var con = require("../db");
var nodemailer = require('nodemailer');
var bcrypt = require('bcrypt');





router.get("/", function (req, res) {
    res.render("landing");
});

router.get("/home", function (req, res) {
    res.render("index");
});

router.get("/login", function (req, res) {
    res.render("login");
});

router.post('/login',
    passport.authenticate('local', {
        successRedirect: '/home',
        failureRedirect: '/login'
    })
);

router.get("/signup", function (req, res) {
    res.render("signup");
});

router.get("/logout", function (req, res) {
    req.flash("success", "Logged you out");
    req.session.destroy();
    res.locals.type = '';
    res.locals.currentUserID = undefined;
    req.logout();
    res.render("index");
});

router.get('/forgot', function (req, res) {
    res.render('forgot');
});

router.post('/forgot', function (req, res, next) {
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
                    if (result.length > 0) {
                        type = "clinics";
                        done(err, token, type);
                    }
                });

            });
        },
        function (token, type, done) {

            var update = "UPDATE " + type + " SET resettoken = '" + token + "', resetexpires = '" + (Date.now() + 3600000) + "' WHERE email = '" + req.body.email + "'";
            con.query(update, function (err, result) {
                if (err) {
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
                if (err) {
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

router.get('/reset/:token', function (req, res) {
    var ans = "SELECT * FROM patients WHERE resettoken = '" + req.params.token + "'";
    console.log(ans);
    con.query(ans, function (err, result) {
        if (result.length > 0) {
            console.log(Date.now());
            console.log(result[0].resetexpires);
            if (result[0].resetexpires > Date.now()) {
                console.log("sds");
                return res.render('reset', { token: req.params.token, type: "patients" });
            }
        }
    });
    var ans2 = "SELECT * FROM doctors WHERE resettoken = '" + req.params.token + "'";
    con.query(ans2, function (err, result) {
        if (result.length > 0) {
            if (result[0].resetexpires > Date.now()) {
                return res.render('reset', { token: req.params.token, type: "doctors" });
            }
        }
    });
    var ans3 = "SELECT * FROM clinics WHERE resettoken = '" + req.params.token + "'";
    console.log(ans3);
    con.query(ans3, function (err, result) {
        if (result.length > 0) {
            console.log(result[0].resetexpires);
            if (result[0].resetexpires > Date.now()) {
                return res.render('reset', { token: req.params.token, type: "clinics" });
            }
        } else {
            console.log("nothing")
        }
    });
});

router.post('/reset/:token/:type', function (req, res) {
    async.waterfall([
        function (done) {
            if (req.body.password === req.body.confirm) {
                bcrypt.hash(req.body.password, 8, function (err, hash) {
                    var update = "UPDATE " + req.params.type + " SET resettoken = 0, resetexpires = 0, password = '" + hash + "' WHERE resettoken = '" + req.params.token + "'";
                    console.log(update)
                    con.query(update, function (err) {
                        if (err) {
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

router.get("/confirmed/:token", function (req, res) {
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

router.get("/allclinics", function (req, res) {
    con.query("SELECT id, name, city, zipcode, street, phone, email from clinics", function (err, result) {
        if (err) throw err;
        else {
            res.render('allclinics', { clinics: result });
        }
    })

});

router.get("/alldoctors", function (req, res) {
    con.query("SELECT doctors.id, doctors.name, doctors.surname, doctors.email, specialization.specialization FROM doctors INNER JOIN specialization ON specialization.id = doctors.specialization", function (err, result) {
        if (err) throw err;
        else {
            res.render('alldoctors', { doctors: result });
        }
    })
});

router.post("/:idD/clinics", function (req, res) {
    console.log(req.params.idD)
    con.query("SELECT IdC FROM docclin WHERE IdD = ?", req.params.idD, async function (err, results) {
        if (err) throw err;
        else {
            if (results.length > 0) {
                var clinics = [];
                var name = [];
                for (var i = 0; i < results.length; i++) {
                    var answer;
                    answer = "SELECT * FROM clinics WHERE id = '" + results[i].IdC + "'";
                    var rows = await con.promise().query(answer);
                    if (rows.length > 0) {
                        clinics.push(rows[0]);
                    }
                    con.query("SELECT name, surname FROM doctors WHERE id = ?", req.params.idD, function (err, names) {
                        if (err) throw err;
                        else {
                            name = [names[0].name, names[0].surname];
                        }
                    })

                }
            }
            res.render("clinics", { clinics: clinics, name: name });
        }
    });
});
router.post("/:idC/doctors", function (req, res) {

    con.query("SELECT IdD FROM docclin WHERE IdC= ?", req.params.idC, async function (err, results) {
        if (err) throw err;
        else {
            if (results.length > 0) {
                var doctors = [];
                var name = [];
                for (var i = 0; i < results.length; i++) {
                    var answer;
                    answer = "SELECT doctors.id, doctors.name, doctors.surname, doctors.email, specialization.specialization FROM doctors INNER JOIN specialization ON specialization.id = doctors.id and doctors.id = '" + results[i].IdD + "'";
                    var rows = await con.promise().query(answer);
                    if (rows.length > 0) {
                        doctors.push(rows[0]);
                }
                con.query("SELECT name FROM clinics WHERE id = ?", req.params.idC, function(err,names){
                    if (err) throw err;
                    else{
                         name = names[0].name;
                    }
                })
            }
        }
            res.render("doctors", { doctors: doctors, name: name });
        }
    });
});
module.exports = router;