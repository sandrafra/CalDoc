var express = require("express");
var router = express.Router();
var passport = require("passport");
var middleware = require("../middleware");
var con = require("../db");
var bcrypt = require("bcrypt");
var crypto = require("crypto");

router.get("/register", function (req, res) {
    res.render("patients/registerpat");
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
                            middleware.verificationEmail(req.body.email, token);
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
router.get("/delete", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT id, name FROM patients WHERE id = ?", req.user, function (err, result) {
        if (err) throw err;
        else {
            res.render("patients/delete", { patient: result[0] });
        }
    });
});
router.post("/:id/delete", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("DELETE FROM patients WHERE id =? ", req.params.id, function(err){
        if (err) throw err;
        else {
            req.flash("error", "Account deleted");
            req.logout();
            res.redirect('/home');
        }
    });
});
router.get("/appointment/:id" , middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT * FROM event WHERE idP = ?", res.locals.currentUserID, function(err, results){
        if(err){
            throw err;
        } 
        else{

        res.render("patients/appointment", {patevents: results})
        }
    })
})
router.get("/appointment/:id/new",middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, async function(req,res){
    var clinics, specializations, docclin;
     clinics = await con.promise().query("SELECT * FROM clinics")
     specializations = await con.promise().query("SELECT * FROM specialization")
     docclin = await con.promise().query("SELECT * from docclin");
    res.render("patients/newappointment", {clinics: clinics[0], specializations: specializations[0], docclins: docclin[0], patient: req.params.id});
});

router.post("/appointment/:id/new", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT id FROM docclin WHERE IdC = '" + req.body.clinic + "' AND IdD = '"+ req.body.doctor+"'", function(err, result){
        var newevent= [req.params.id, result[0].id, req.body.start, req.body.end];
        con.query("INSERT INTO event (idP, idDC, startslot, endslot) values (?,?,?,?)", newevent, function(err){
            if (err){
                throw err;
            } else{
                res.redirect("back");
            }

        })
    });
});
router.get("/appointment/:id/past", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT event.id,event.startslot, event.endslot,  doctors.name as docname, doctors.surname, specialization.specialization, clinics.name as clinname, clinics.city, clinics.street FROM ((((event INNER JOIN docclin ON event.idP = ? and docclin.id = event.idDC) INNER JOIN doctors ON doctors.id = docclin.IdD or docclin.IdD is null) INNER JOIN specialization ON doctors.specialization = specialization.id) INNER JOIN clinics ON docclin.IdC = clinics.id)", res.locals.currentUserID, function(err, results){
        if(err){
            throw err;
        } 
        else{
            var date = new Date();
            var pastevents = []
            results.forEach(function(result){
                if(result.startslot < date){
                    pastevents.push(result)
                }
            })
            console.log(pastevents)
        res.render("patients/pastappointment", {pastevents: pastevents})
        }
    })
})
router.get("/appointment/:id/next", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT event.id, event.startslot, event.endslot,  doctors.name as docname, doctors.surname, specialization.specialization, clinics.name as clinname, clinics.city, clinics.street FROM ((((event INNER JOIN docclin ON event.idP = ? and docclin.id = event.idDC) INNER JOIN doctors ON doctors.id = docclin.IdD) INNER JOIN specialization ON doctors.specialization = specialization.id) INNER JOIN clinics ON docclin.IdC = clinics.id)", res.locals.currentUserID, function(err, results){
        if(err){
            throw err;
        } 
        else{
            var date = new Date();
            var nextevents = []
            results.forEach(function(result){
                if(result.startslot > date){
                    nextevents.push(result)
                }
            })
            console.log(nextevents.length)
        res.render("patients/nextappointment", {nextevents: nextevents})
        }
    });
});

router.get("/appointment/:eventid/delete", middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("DELETE FROM event WHERE id =? ", req.params.eventid, function(err){
        if (err) throw err;
        else{
            res.redirect("back")
        }
    })
});

//dynamic dropdown
router.get("/test",function(req,res){
    con.query("SELECT id, IdD FROM docclin WHERE IdC = '" + req.query.clinicId + "'", async function(err,result){
        if(err) throw err;
        var doctors = [];
        for(i = 0; i<result.length; i++){
         var newdoctor = await con.promise().query("SELECT id,name, surname FROM doctors WHERE specialization = '" + req.query.specId +"' and id= '" + result[i].IdD +"'")
         if (err) throw err;
            doctors.push(newdoctor[0]);
        }
        res.send(doctors);
    });
});

router.get("/event",  middleware.isPatient, middleware.isLoggedin, middleware.checkAuth, function(req,res){
    con.query("SELECT id, starthour, endhour FROM docclin WHERE IdC = '"+req.query.clinId+ "' AND IdD = '" +req.query.docId+"'", function(err,result){
            con.query("SELECT * FROM event WHERE idDC = '" + result[0].id+ "'", function(err, events){
                console.log(events)
                results = [result[0], events]
                res.send(results);
            });
        });   
})

module.exports = router;