import { Request, Response } from 'express';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.identity_number, u.role, d.name as department_name, u.department_id
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const result = await query(`
      SELECT u.id, u.name, u.email, u.phone, u.identity_number, u.role, d.name as department_name, u.department_id
      FROM users u 
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1
    `, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching user' });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, phone, identity_number, role, department_id } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await query(
            `INSERT INTO users (name, email, password_hash, phone, identity_number, role, department_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email`,
            [name, email, hash, phone, identity_number, role, department_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
        } else {
            res.status(500).json({ error: 'Error creating user' });
        }
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, email, phone, identity_number, role, department_id, password } = req.body;
    try {
        let sql: string;
        let params: any[];

        if (password && password.trim() !== '') {
            const hash = await bcrypt.hash(password, 10);
            sql = `UPDATE users SET name=$1, email=$2, phone=$3, identity_number=$4, role=$5, department_id=$6, password_hash=$7 WHERE id=$8 RETURNING id, name, email, role`;
            params = [name, email, phone, identity_number, role, department_id || null, hash, id];
        } else {
            sql = `UPDATE users SET name=$1, email=$2, phone=$3, identity_number=$4, role=$5, department_id=$6 WHERE id=$7 RETURNING id, name, email, role`;
            params = [name, email, phone, identity_number, role, department_id || null, id];
        }

        const result = await query(sql, params);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') {
            res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
        } else {
            res.status(500).json({ error: 'Error updating user' });
        }
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const result = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting user' });
    }
};
