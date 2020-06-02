var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser"),
    mysql       = require("mysql");

    

var con = mysql.createConnection({
    host: "mysql.agh.edu.pl",
    user: "sandraf1",
    password: "LxWTeuWU92S1ZfvX",
    database: "sandraf1"
});

con.connect(function(err){
    if(err) throw err;
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

app.get("/", function(req,res){
    res.render("landing");
});
app.get("/login", function(req,res){
    res.render("login");
});
app.post("/login", function(req,res){
    var user = [req.body.email, req.body.password];
    console.log(req.body)
    if(req.body.user === 'doctor'){
        console.log("doctor");
    } else {
        console.log("patinet");
    }
    
});
app.get("/signup", function(req,res){
    res.render("signup");
});
app.get("/registerdoc", function(req,res){
    res.render("registerdoc");
})
app.get("/registerpat", function(req,res){
    res.render("registerpat");
});
app.post("/registerpat", function(req, res){
    var patient = [req.body.name,req.body.surname,req.body.email, req.body.password];
    con.query('INSERT INTO patients (name, surname, email, password) VALUES (?, ?, ?, ?)', patient, function(err){
        if (err){
            console.log(err);
        } else {
            console.log("added new patinent");
            res.redirect("/calendar");
        }
    });
});
app.get("/calendar", function(req,res){
    res.render("index");
});
app.listen(3000, function(){
    console.log("Server connected");
});