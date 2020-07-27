var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");
var crypto = require("crypto");

router.get("/register", function (req, res) {
    con.query("SELECT * FROM specialization", function (err, result) {
        res.render("doctors/registerdoc", {specializations: result});
    });
});

router.post("/register", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
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
                            middleware.verificationEmail(req.body.email, token);
                            req.flash("success", "New account created. To confirm account please click link which was send to your e-mail");
                            res.redirect("/home");
                        }
                    });
                });
            }
        }
    });
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
            res.render("doctors/clinics", { clinics: clinics, name: name });
        }
    });
});

router.get('/', function (req, res) {
    con.query("SELECT doctors.id, doctors.name, doctors.surname, doctors.email, specialization.specialization FROM doctors INNER JOIN specialization ON specialization.id = doctors.specialization and doctors.id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            con.query("SELECT * FROM specialization", function (err, spec) {
                res.render('doctors/doctor', { doctor: result[0], specializations: spec });
            });
           
        }
    });
});

router.post('/:id', middleware.isLoggedin, middleware.isDoctor, middleware.checkAuth, function (req, res) {
    var doctor = [req.body.name, req.body.surname, req.body.email, req.body.specialization, req.params.id];
    con.query("UPDATE doctors SET name =  ?, surname = ?, email= ?, specialization = ? WHERE id = ?", doctor, function (err) {
        if (err) throw err;
        else {
            req.flash("success", "Profile settings has been updated succefuly");
            res.redirect("/doctors/doctor");
        }
    });
});

router.get("/password", middleware.isDoctor, middleware.isLoggedin, function (req, res) {
    con.query("SELECT doctors.id, doctors.name, doctors.surname, doctors.email, specialization.specialization FROM doctors INNER JOIN specialization ON specialization.id = doctors.specialization and doctors.id = 1", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("doctors/editpass", { doctor: result[0] });
        }
    });

});

router.post("/:id/password", middleware.isDoctor, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT password FROM doctors WHERE id = ?", req.params.id, function (err, result) {
        if (result.length > 0) {
            if (req.body.password === req.body.password2) {
                bcrypt.compare(req.body.currentpassword, result[0].password, function (err, compare) {
                    if (compare === true) {
                        bcrypt.hash(req.body.password, 8, function (err, hash) {
                            if (err) throw err
                            else {
                                var update = "UPDATE doctors SET password = '" + hash + "' WHERE id = '" + req.params.id + "'";
                                con.query(update, function (err) {
                                    if (err) {
                                        req.flash("error", "Cannot update the password");
                                        return res.redirect("/doctors/doctor");

                                    } else {
                                        req.flash("success", "Password changed");
                                        return res.redirect("/doctors/doctor/password");
                                    }
                                });
                            }
                        });
                    } else {
                        req.flash("error", "Current password is incorrect");
                        res.redirect("back");
                    }
                });
            } else {
                req.flash("error", "Password are not the same");
                res.redirect("back");
            }
        } else {
            req.flash("success", "Profile settings has been updated succefuly");
            res.redirect("/doctors/doctor");
        }
    });
});

router.get("/delete", function (req, res) {
    con.query("SELECT id, name FROM doctors WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("doctors/delete", { doctor: result[0] });
        }
    });
});
router.post("/:id/delete", function (req, res) {
    con.query("DELETE FROM doctors WHERE id =? ", req.params.id, function (err) {
        if (err) throw err;
        else {
            req.flash("error", "Account deleted");
            req.logout();
            res.redirect('/home');
        }
    });
});

module.exports = router;