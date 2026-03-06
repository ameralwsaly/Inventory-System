import { initializeDatabase } from './config/initDb';
import authRoutes from './routes/authRoutes';
import departmentRoutes from './routes/departmentRoutes';
import userRoutes from './routes/userRoutes';
import itemRoutes from './routes/itemRoutes';
import requestRoutes from './routes/requestRoutes';
import reportRoutes from './routes/reportRoutes';
import returnRoutes from './routes/returnRoutes';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { pool } from './config/db';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/returns', returnRoutes);

const PORT = process.env.PORT || 5000;

const runSeed = async () => {
    try {
        const seedPath = path.join(__dirname, '../../seed.sql');
        if (fs.existsSync(seedPath)) {
            const sql = fs.readFileSync(seedPath, 'utf8');
            await pool.query(sql);
            console.log('Database seeded with test users and items.');
        }
    } catch (e) {
        console.error('Seeding error', e);
    }
};

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await initializeDatabase();
    await runSeed();
});
