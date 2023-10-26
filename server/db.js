const sqlite3 = require('sqlite3');

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./server/database/movies.db');

module.exports = db;