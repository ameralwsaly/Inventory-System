import { pool } from './db';
import fs from 'fs';
import path from 'path';

export const initializeDatabase = async () => {
    try {
        const schemaPath = path.join(__dirname, '../../schema.sql');
        if (fs.existsSync(schemaPath)) {
            const sql = fs.readFileSync(schemaPath, 'utf8');
            await pool.query(sql);
            console.log('Database initialized successfully with schema.');
        } else {
            console.warn('schema.sql not found at', schemaPath);
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};
