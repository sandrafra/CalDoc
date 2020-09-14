var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");
var async = require("async");
var crypto = require("crypto");


router.get('/register', function (req, res) {
    res.render("clinics/registercln");
});

router.post("/register", function (req, res) {
    var confirmedPass = req.body.password2;
    con.query("SELECT id FROM clinics WHERE email= ? UNION ALL SELECT id FROM doctors WHERE email= ? UNION ALL SELECT id FROM clinics WHERE email= ?", [req.body.email, req.body.email, req.body.email], function (err, result) {
        if (err) {
            console.log(err);
            console.log("ten sam")
        } else {
            if (result.length > 0) {
                console.log("ten sam")
                req.flash("error", "E-mail is already used");
                res.redirect("back");
            } else if (req.body.password !== confirmedPass) {
                console.log("ten sam")
                req.flash("error", "Passwords do not match");
                res.redirect("back");
            } else {
                console.log("ten sam")
                bcrypt.hash(req.body.password, 10, function (err, hash) {
                    var token = crypto.randomBytes(64).toString('hex');
                    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.zipcode, req.body.city, req.body.street, req.body.openhour, req.body.endhour, hash, token];

                    con.query('INSERT INTO clinics (name, email, phone, zipcode, city, street,openhour, endhour, password, token) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)', clinic, function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            middleware.verificationEmail(req.body.email, token);
                            req.flash("success", "New clinic account created. To confirm account please click link which was send to your e-mail");
                            res.redirect("/home");
                        }
                    });
                });
            }
        }
    });
});

router.get('/', function (req, res) {
    console.log(req.user)
    con.query("SELECT id, name, email, phone, city, zipcode, street, openhour, endhour FROM clinics WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render('clinics/clinic', { clinic: result[0] });
        }
    });
});

router.post('/:id', middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    var clinic = [req.body.name, req.body.email, req.body.phone, req.body.city, req.body.zipcode, req.body.street, req.body.openhour, req.body.endhour, req.params.id];
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

router.get("/delete", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT id, name FROM clinics WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("clinics/delete", { clinic: result[0] });
        }
    });
});
router.post("/:id/delete", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("DELETE FROM clinics WHERE id =? ", req.params.id, function (err) {
        if (err) throw err;
        else {
            req.flash("error", "Account deleted");
            req.logout();
            res.redirect('/home');
        }
    });
});

router.get('/:id/calendar',middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT event.id, clinics.name as clinic,event.type, event.startslot, event.endslot, event.idDC, patients.name, patients.surname, clinics.openhour, clinics.endhour, doctors.id as docid, doctors.name as docname, doctors.surname as docsurname FROM ((((event INNER JOIN clinics ON clinics.id = ?)INNER JOIN docclin ON docclin.IdC = clinics.id and event.idDC = docclin.id) INNER JOIN patients ON patients.id = event.idP) inner join doctors on doctors.id = docclin.IdD)", res.locals.currentUserID, function (err, results) {
        if (err) {
            throw err;
        }
        else {
            res.render("clinics/calendar", { clinevents: results })
        }
    })
});

router.get('/:id/doctors', middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT doctors.id, doctors.name, doctors.surname, doctors.email, docclin.starthour, docclin.endhour, specialization.specialization FROM ((doctors INNER JOIN docclin ON docclin.IdC = ? and docclin.IdD = doctors.id) INNER JOIN specialization ON specialization.id = doctors.specialization)", req.params.id, function (err, results) {
        if (err) {
            throw err;
        }
        else {
            res.render("clinics/doctors", { doctors: results })
        }
    })
})

router.get("/:id/doctors/new", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("select doctors.id, doctors.name, doctors.surname, doctors.email, specialization.specialization from doctors INNER JOIN specialization ON doctors.specialization = specialization.id where doctors.id NOT IN (select docclin.IdD from docclin where docclin.IdC = ? and docclin.IdD is not null)", req.params.id, function (err, results) {
        if (err) throw err;
        else {
            res.render('clinics/docnew', { doctors: results });
        }
    });
});

router.get("/:id/:idD/vacation", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    console.log(req.params.idD)
    con.query("SELECT event.id, event.idP, event.idDC, event.startslot, event.endslot, event.type, clinics.name as clinic, docclin.starthour, docclin.endhour, patients.name, patients.surname FROM (((event INNER JOIN docclin ON docclin.id = event.idDC and docclin.IdD = ? and docclin.IdC = ?) INNER JOIN clinics ON clinics.id = docclin.IdC) INNER JOIN patients ON patients.id = event.idP or event.idP is null)", [req.params.idD, res.locals.currentUserID], function (err, results) {
        if (err) throw err;
        else {
            res.render("clinics/vacation", { events: results, doctor: req.params.idD })
        }
    });
});

router.post("/:id/:idD/vacation", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("SELECT docclin.id, event.startslot FROM docclin INNER JOIN event ON event.idDC = docclin.id where docclin.IdD= ? and docclin.IdC = ?", [req.params.idD, res.locals.currentUserID], function (err, results) {
        if (err) throw err;
        else {
            con.query("INSERT INTO event (idP, idDC, startslot, endslot, type) VALUES (NULL, ?, ?, ?, 'vacation')", [results[0].id, req.body.vacationstart, req.body.vacationend], function (err) {
                if (err) throw err;
                else {
                    var date = new Date();
                    results.forEach(function (result) {
                        if (result.startslot > date) {
                            con.query("DELETE FROM event WHERE event.idDC = ?", result.id, function (err) {
                                if (err) throw err;
                                else {
                                    res.redirect('back');
                                }
                            });
                        }
                        else{
                            res.redirect('back');
                        }
                    });
                }
            });
        }
    })

})

router.post('/:id/doctor/:idD/hours',  middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("UPDATE docclin SET starthour = ?, endhour = ? WHERE IdD = ?", [req.body.starthour, req.body.endhour, req.params.idD], function (err, results) {
        if (err) {
            throw err;
        }
        else {
            res.redirect("back");
        }
    })
});

router.post("/:id/doctors/new", middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("INSERT INTO docclin (IdC, IdD, starthour, endhour) VALUES (?,?,?,?)", [req.params.id, req.body.doctor, req.body.starthour, req.body.endhour], function (err, results) {
        if (err) throw err;
        else {
            res.redirect('back');
        }
    });
});

router.post('/:id/doctor/:idD/delete',  middleware.isClinic, middleware.isLoggedin, middleware.checkAuth, function (req, res) {
    con.query("UPDATE docclin SET idD = NULL WHERE IdD = ? and IdC = ?", [req.params.idD, res.locals.currentUserID], function (err) {
        if (err) throw err
        else {
            con.query("SELECT * FROM event inner join docclin on docclin.id = event.idDC where docclin.IdC = ? and docclin.IdD is null", res.locals.currentUserID, function (err, results) {
                if (results.length > 0) {
                    var date = new Date();
                    results.forEach(function (result) {
                        if (result.startslot > date) {
                            con.query("DELETE FROM event WHERE event.idDC = ?", result.id, function (err) {
                                if (err) throw err;
                                else {
                                    res.redirect('back');
                                }
                            });
                        }
                    })
                } else {
                    res.redirect('back');
                }
            })
        }
    })
});



module.exports = router;