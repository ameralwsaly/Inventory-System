import { Request, Response } from 'express';
import { query } from '../config/db';

export const getDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query(`
            SELECT d.*, COUNT(u.id)::int as user_count 
            FROM departments d 
            LEFT JOIN users u ON u.department_id = d.id 
            GROUP BY d.id 
            ORDER BY d.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching departments' });
    }
};

export const getDepartmentUsers = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const result = await query(`
            SELECT id, name, email, role, phone, identity_number 
            FROM users 
            WHERE department_id = $1 
            ORDER BY name ASC
        `, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching department users' });
    }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body;
    try {
        const result = await query('INSERT INTO departments (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error creating department' });
    }
};

export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const result = await query('UPDATE departments SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Department not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error updating department' });
    }
};

export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const { rows } = await query('SELECT COUNT(*) FROM users WHERE department_id = $1', [id]);
        if (parseInt(rows[0].count) > 0) {
            res.status(400).json({ error: 'لا يمكن حذف الإدارة - يوجد مستخدمون مرتبطون بها' });
            return;
        }
        const result = await query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Department not found' });
            return;
        }
        res.json({ message: 'Department deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting department' });
    }
};
