const mysql = require("promise-mysql");
const dotenv = require("dotenv");
dotenv.config()

const connection = mysql.createConnection({
    host:process.env.HOST,
    database:process.env.DATABASE,
    user:process.env.USER,
    password:process.env.PASSWORD
})

const getConnection = async ()=> await connection;

module.exports = {
    getConnection
}