var mysql = require('mysql2');
require("dotenv").config();

var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DATABASE
});

// con.connect(function (err) {
//     if (err) throw err;
//     console.log("Connected!");
// });

module.exports = con;