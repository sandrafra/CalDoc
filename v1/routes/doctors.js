var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");
var crypto = require("crypto");

router.get("/register", function (req, res) {
    con.query("SELECT * FROM specialization", function (err, result) {
        res.render("doctors/registerdoc", { specializations: result });
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

router.get('/:id/calendar', function (req, res) {
    con.query("SELECT event.id, clinics.name as clinic, event.startslot, event.endslot, event.idDC, docclin.starthour, docclin.endhour, patients.name, patients.surname FROM ((((event INNER JOIN docclin ON docclin.id = event.idDC) INNER JOIN doctors ON doctors.id = ? and docclin.IdD = doctors.id) INNER JOIN clinics ON docclin.IdC = clinics.id) INNER JOIN patients ON patients.id = event.idP)", req.params.id, function (err, results) {
        if (err) {
            throw err;
        }
        else {
                res.render("doctors/calendar", { docevents: results });
        }
    })
});

router.get('/appointment/new/:id', function (req, res) {
    con.query("SELECT event.id as idE,event.idP, event.startslot, event.endslot, patients.name, patients.surname, patients.email, patients.id FROM event INNER JOIN patients ON event.idP = patients.id and event.id =?", req.params.id, function (err, results) {
        if (err) throw err
        else {
            con.query("SELECT * FROM medicaments", function (err, medicaments) {
                if (err) throw err
                else {
                    con.query("SELECT * FROM examinations", function (err, examinations) {
                        if (err) throw err
                        else {
                            res.render("doctors/newappointment", { appointment: results, medicaments: medicaments, examinations: examinations })
                        }
                    })

                }
            })
        }
    })
});

router.get('/appointment/edit/:id', function (req, res) {
    con.query("SELECT event.id as idE,event.idP, event.startslot, event.endslot, patients.name, patients.surname, patients.email, patients.id FROM event INNER JOIN patients ON event.idP = patients.id and event.id =?", req.params.id, function (err, results) {
        if (err) throw err
        else {
            con.query("SELECT medicaments.name, medicaments.EAN, medicaments.package, medicamentsapp.dosage FROM medicaments INNER JOIN medicamentsapp ON medicamentsapp.IdM = medicaments.id and medicamentsapp.IdE = ?", req.params.id, function (err, medicaments) {
                if (err) throw err
                else {
                    con.query("SELECT examinations.name, examinationsapp.info FROM examinations INNER JOIN examinationsapp ON examinationsapp.idEx = examinations.id and examinationsapp.idE = ?", req.params.id, function (err, examinations) {
                        if (err) throw err
                        else {
                            con.query("SELECT diagnose FROM diagnoses WHERE idE =?", req.params.id, function (err, diagnose) {
                                if (err) throw err
                                else{
                                    console.log(diagnose)
                                    res.render("doctors/pastappointment", { appointment: results, medicaments: medicaments, examinations: examinations, diagnose: diagnose})
                        
                                }
                            });
                        }
                    });
                }
            });
        }
    });

});

router.post('/appointment/new/:idE', function (req, res) {
    var medlist = req.body.medlist
    console.log(typeof (medlist))
    if (medlist) {
        console.log(medlist)
        medlist.forEach(function (med) {
            var idmed = med.split(",")[0];
            var dosage = med.split(",")[1];
            con.query("INSERT INTO medicamentsapp (IdE, IdM, dosage) VALUES (?,?,?)", [req.params.idE, idmed, dosage], function (err) {
                if (err) throw err;
            })
        });
    }

    var examlist = req.body.examlist
    if (examlist) {
        examlist.forEach(function (exam) {
            var idexam = exam.split(",")[0];
            var info = exam.split(",")[1];
            con.query("INSERT INTO examinationsapp (idE, idEx, info) VALUES (?,?,?)", [req.params.idE, idexam, info], function (err) {
                if (err) throw err;
            })
        });
    }
    var diagnose = req.body.diagnose
        con.query("INSERT INTO diagnoses (idE, diagnose) VALUES (?,?)", [req.params.idE, diagnose], function (err) {
            if (err) throw err;
        })

    res.redirect("back");
});
router.post('/appointment/edit/:idE', function (req, res) {
    var diagnose = req.body.diagnose
    if (diagnose) {
        con.query("SELECT * FROM diagnoses WHERE idE = ?", req.params.idE, function(err, result){
            if(result.length >0){
                con.query("UPDATE diagnoses SET diagnose = ? WHERE idE = ?", [diagnose, req.params.idE], function (err) {
                    if (err) throw err;
                })
            } else{
                con.query("INSERT INTO diagnoses (idE, diagnose) VALUES (?,?)", [req.params.idE, diagnose], function(err){
                    if (err) throw err;
                });
            }
        })
    }
    var dosage = req.body.dosage
    if(dosage){
        con.query("UPDATE medicamentsapp SET dosage = ? WHERE IdE = ?",[dosage, req.params.idE], function(err){
            if (err) throw err;
        });
    }
    res.redirect("back")
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