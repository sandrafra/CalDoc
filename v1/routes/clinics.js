var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");
var async = require("async");

router.get('/register', function (req, res) {
    res.render("clinics/registercln");
});

router.post("/register", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT id FROM clinics WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
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
                    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.zipcode, req.body.city, req.body.street,req.body.openhour,req.body.endhour,hash, token];

                    con.query('INSERT INTO clinics (name, email, phone, zipcode, city, street,openhour, endhour, password, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)', clinic, function (err) {
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
            res.render("clinics/doctors", { doctors: doctors, name: name });
        }
    });
});

router.get('/', function (req, res) {
    con.query("SELECT id, name, email, phone, city, zipcode, street, openhour, endhour FROM clinics WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            console.log(result)
            res.render('clinics/clinic', { clinic: result[0] });
        }
    });
});

router.post('/:id', function (req, res) {
    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.city, req.body.zipcode, req.body.street,req.body.openhour, req.body.endhour, req.params.id];
    con.query("UPDATE clinics SET name =  ?, email= ?, phone = ?, city = ?, zipcode = ?, street = ?, openhour = ?, endhour =? WHERE id = ?", clinic, function (err) {
        if (err) throw err;
        else {
            req.flash("success", "Profile settings has been updated succefuly");
            res.redirect("/clinics/clinic");
        }
    });
});

router.get("/password", middleware.isClinic, middleware.isLoggedin, function (req, res) {
    con.query("SELECT id, name, email FROM clinics WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("clinics/editpass", { clinic: result[0] });
        }
    });

});

router.post("/:id/password", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT password FROM clinics WHERE id = ?", req.params.id, function (err, result) {
        if (result.length > 0) {
            if (req.body.password === req.body.password2) {
                bcrypt.compare(req.body.currentpassword, result[0].password, function (err, compare) {
                    if (compare === true) {
                        bcrypt.hash(req.body.password, 8, function (err, hash) {
                            if (err) throw err
                            else {
                                var update = "UPDATE clinics SET password = '" + hash + "' WHERE id = '" + req.params.id + "'";
                                con.query(update, function (err) {
                                    if (err) {
                                        req.flash("error", "Cannot update the password");
                                        return res.redirect("/clinics/clinic");

                                    } else {
                                        req.flash("success", "Password changed");
                                        return res.redirect("/clinics/clinic/password");
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
            res.redirect("/clinics/clinic");
        }
    });
});

router.get("/delete", function (req, res) {
    con.query("SELECT id, name FROM clinics WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("clinics/delete", { clinic: result[0] });
        }
    });
});
router.post("/:id/delete", function (req, res) {
    con.query("DELETE FROM clinics WHERE id =? ", req.params.id, function (err) {
        if (err) throw err;
        else {
            req.flash("error", "Account deleted");
            req.logout();
            res.redirect('/home');
        }
    });
});


module.exports = router;