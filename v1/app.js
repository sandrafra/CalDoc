var express     = require("express"),
    app         = express(),
    bodyParser  = require("body-parser");

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
    
});
app.get("/signup", function(req,res){
    res.render("signup");
});
app.get("/registerdoc", function(req,res){
    res.render("registerdoc");
})
app.get("/registerpat", function(req,res){
    res.render("registerpat");
})
app.get("/calendar", function(req,res){
    res.render("index");
});
app.listen(3000, function(){
    console.log("Server connected");
});