import mysql from "mysql2/promise";

export const db = mysql.createPool({
    host: "localhost",
    user: "uploader",
    password: "Aka@0908",
    database: "chunk_upload",
    waitForConnections: true,
    connectionLimit: 10
});
