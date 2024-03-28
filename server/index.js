var dot = require('dotenv')
dot.config();

var express = require('express');
var app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

var AES = require('./aes');
const secretKey = process.env.SECRET_KEY || "1234567890abcdef"
console.log("secretKey: ", secretKey);
AES.init(secretKey);

const mysql = require('mysql2');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Matkhau@123',
    database: 'baomat'
});
connection.connect();

const { sampleData } = require('./sample_data');

// create table if not exists
connection.query(
    'CREATE TABLE IF NOT EXISTS users (citizenIdentificationCard VARCHAR(255) PRIMARY KEY, userName VARCHAR(255), password VARCHAR(255), gender VARCHAR(255), dateOfBirth VARCHAR(255), address VARCHAR(255), phoneNumber VARCHAR(255))'
    , function (err, results) {
    if (err) {
        return console.log(err.message);
    }

    console.log("Create table users success");

    let isErrorOccurred = false;

    // insert sample data
    sampleData.forEach(user => {
        const { userName, password, citizenIdentificationCard, gender, dateOfBirth, address, phoneNumber } = user;

        // insert user to database
        const query = `INSERT INTO users (citizenIdentificationCard, userName, password, gender, dateOfBirth, address, phoneNumber) VALUES ('${citizenIdentificationCard}', '${userName}', '${password}', '${gender}', '${dateOfBirth}', '${address}', '${phoneNumber}')`;

        connection.query(query, function (err) {
            if (err) {
                isErrorOccurred = true;
                // console.log(err.message);
                return;
            }
        });
    });

    if (!isErrorOccurred) {
        console.log("Insert sample data success");
    }
});

app.post('/auth/sign-up', function (req, res) {
    const encryptedData = req.body

    console.log("encryptedData: ", encryptedData);

    const rawData = {};
    for (let key in encryptedData) {
        rawData[key] = AES.decrypt(encryptedData[key]);
    }

    console.log("rawData: ", rawData);

    const { userName, password, citizenIdentificationCard, gender, dateOfBirth, address, phoneNumber } = rawData;

    // insert user to database
    const query = `INSERT INTO users (citizenIdentificationCard, userName, password, gender, dateOfBirth, address, phoneNumber) VALUES ('${citizenIdentificationCard}', '${userName}', '${password}', '${gender}', '${dateOfBirth}', '${address}', '${phoneNumber}')`;

    connection.query(query, function (err, results, fields) {
        if (err) {
            // check if user exists
            if (err.errno === 1062) {
                res.status(500).send("Người dùng đã tồn tại");
            } else {
                res.status(500).send("Sign up failed");
            }
            return console.log(err.message);
        }

        console.log("Insert user success");
        res.status(200).send("Sign up success");
    });
});

app.post('/auth/sign-in', function (req, res) {
    const encryptedData = req.body

    console.log("encryptedData: ", encryptedData);

    const rawData = {};
    for (let key in encryptedData) {
        rawData[key] = AES.decrypt(encryptedData[key]);
    }

    // get user from database
    console.log("rawData: ", rawData);

    const { citizenIdentificationCard, password } = rawData;

    const query = `SELECT * FROM users WHERE citizenIdentificationCard='${citizenIdentificationCard}' AND password='${password}'`;

    connection.query(query, function (err, results) {
        if (err) {
            res.status(500).send("Sign in failed");
            return console.log(err.message);
        }

        if (results.length === 0) {
            res.status(403).send("Tài khoản hoặc mật khẩu không đúng");
            return;
        }

        res.status(200).send("Sign in success");
    });
});

app.get('/user/fetch-all-users/:userId', function (req, res) {

    const userId = req.params.userId;

    const query = `SELECT 
        citizenIdentificationCard, 
        CASE WHEN citizenIdentificationCard = '${userId}' THEN userName ELSE '*****' END AS userName,
        CASE WHEN citizenIdentificationCard = '${userId}' THEN password ELSE '*****' END AS password, 
        CASE WHEN citizenIdentificationCard = '${userId}' THEN gender ELSE '*****' END AS gender, 
        CASE WHEN citizenIdentificationCard = '${userId}' THEN dateOfBirth ELSE '*****' END AS dateOfBirth, 
        CASE WHEN citizenIdentificationCard = '${userId}' THEN address ELSE '*****' END AS address, 
        CASE WHEN citizenIdentificationCard = '${userId}' THEN phoneNumber ELSE '*****' END AS phoneNumber 
        FROM users`;

    connection.query(query, function (err, results) {
        if (err) {
            res.status(500).send("Get users failed");
            return console.log(err.message);
        }

        res.status(200).send(results);
    });
});

app.listen(8080, function () {
    // const cipherText = AES.encrypt("Có mã hóa được Tiếng Việt không?");
    // const plainText = AES.decrypt(cipherText);
    // console.log("plainText: ", plainText);
    console.log('Example app listening on port 8080!');
});