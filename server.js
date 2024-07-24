const express = require('express');
const app = express();
const mysql = require('mysql2');

const bcrypt = require('bcrypt');
const dotenv = require('dotenv');


const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:4000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cors());
dotenv.config();

app.get('/', (req, res) => {
    res.send("Welcome to my page");
});

// Connection to the database
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'expense_manager' // Ensure the database is specified here
});

db.connect((err) => {
    if (err) {
        console.error("Error connecting to MYSQL", err);
        return;
    }
    console.log("Connected to MYSQL as id:", db.threadId);
});

// Create a database if not exists
db.query('CREATE DATABASE IF NOT EXISTS expense_manager', (err) => {
    if (err) {
        console.error("Error creating database", err);
        return;
    }
    console.log("Database expense_manager created/checked");

    // Change to our database
    db.changeUser({ database: 'expense_manager' }, (err) => {
        if (err) {
            console.error("Error changing database", err);
            return;
        }
        console.log("Using expense_manager database");

        // Create users table
        const usersTable = `
            CREATE TABLE IF NOT EXISTS users(
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL UNIQUE,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            )
        `;

        // Create expenses table
        const expensesTable = `
            CREATE TABLE IF NOT EXISTS expenses(
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                amount DECIMAL(10, 2),
                description VARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `;

        db.query(usersTable, (err) => {
            if (err) {
                console.error("Error creating users table", err);
                return;
            }
            console.log("Users table created/checked");
        });

        db.query(expensesTable, (err) => {
            if (err) {
                console.error("Error creating expenses table", err);
                return;
            }
            console.log("Expenses table created/checked");
        });
    });
});

// User registration route
app.post('/api/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        if (!email || !username || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const userQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
        db.query(userQuery, [email, username], async (err, data) => {
            if (err) {
                console.error("Error querying users", err);
                return res.status(500).json({ message: "Something went wrong during user query" });
            }

            if (data.length) {
                return res.status(409).json({ message: "User already exists" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUserQuery = 'INSERT INTO users (email, username, password) VALUES (?, ?, ?)';
            const values = [email, username, hashedPassword];

            db.query(newUserQuery, values, (err) => {
                if (err) {
                    console.error("Error inserting user", err);
                    return res.status(500).json({ message: "Something went wrong during user insertion" });
                }
                return res.status(200).json({ message: "User created successfully" });
            });
        });
    } catch (err) {
        console.error("Internal Server Error", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
