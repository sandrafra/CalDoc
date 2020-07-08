var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");

router.get("/register", function (req, res) {
    res.render("registerpat", { message: "" });
});
router.post("/register", function (req, res) {
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

router.get('/', middleware.isLoggedin, middleware.isPatient, function (req, res) {
    con.query("SELECT id, name, surname, email FROM patients WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render('patients/patient', { patient: result[0] });
        }
    });
});

router.post('/:id', middleware.isLoggedin, middleware.isPatient, middleware.checkAuth, function (req, res) {
            var patient = [req.body.name, req.body.surname, req.body.email, req.params.id];
            console.log(patient)
            con.query("UPDATE patients SET name =  ?, surname = ?, email= ? WHERE id = ?", patient, function (err) {
                if (err) throw err;
                else {
                    req.flash("success", "Profile settings has been updated succefuly");
                    res.redirect("/patients/patient");
                }
            });
});

router.get("/password", middleware.isPatient, middleware.isLoggedin, function (req, res) {
    con.query("SELECT id, name, surname, email FROM patients WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("patients/editpass", { patient: result[0] });
        }
    });

});

router.post("/:id/password", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT password FROM patients WHERE id = ?", req.params.id, function (err, result) {
        if (result.length > 0) {
            if (req.body.password === req.body.password2) {
                bcrypt.compare(req.body.currentpassword, result[0].password, function (err, compare) {
                    if (compare === true) {
                        bcrypt.hash(req.body.password, 8, function (err, hash) {
                            if (err) throw err
                            else {
                                var update = "UPDATE patients SET password = '" + hash + "' WHERE id = '" + req.params.id + "'";
                                con.query(update, function (err) {
                                    if (err) {
                                        req.flash("error", "Cannot update the password");
                                        return res.redirect("/patients/patient");

                                    } else {
                                        req.flash("success", "Password changed");
                                        return res.redirect("/patients/patient/password");
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
        res.redirect("/patients/patient");
        }
    });
});

module.exports = router;