import { Request, Response } from 'express';
import { query } from '../config/db';
import NodeFormData from 'form-data';
import fs from 'fs';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export const getItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await query('SELECT * FROM items ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching items' });
    }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    const { name, description, quantity, unit, min_limit } = req.body;
    let actualMinLimit = min_limit;
    if (min_limit === undefined || min_limit === null || min_limit === 0) {
        actualMinLimit = Math.floor((quantity || 0) * 0.10); // 10% of initial if not provided
    }

    try {
        const result = await query(
            `INSERT INTO items (name, description, quantity, min_limit, unit) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description || '', quantity || 0, actualMinLimit, unit || 'حبة']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error creating item' });
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, quantity, unit, min_limit } = req.body;

    try {
        const result = await query(
            `UPDATE items SET name=$1, description=$2, quantity=$3, unit=$4, min_limit=$5, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$6 RETURNING *`,
            [name, description, quantity, unit, min_limit, id]
        );
        if (result.rowCount === 0) {
            res.status(404).json({ error: 'Item not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error updating item' });
    }
};

export const importItemsExcel = async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const filePath = req.file.path;

    try {
        const formData = new NodeFormData();
        formData.append('file', fs.createReadStream(filePath), {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const pyRes = await fetch(`${PYTHON_SERVICE_URL}/import-excel`, {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders(),
        });

        const data: any = await pyRes.json();

        fs.unlink(filePath, () => { });

        if (!pyRes.ok) {
            res.status(pyRes.status).json({ error: data.detail || 'Import failed' });
            return;
        }

        res.json({ message: 'تم الاستيراد بنجاح', details: data });
    } catch (err) {
        console.error('Error importing excel:', err);
        fs.unlink(filePath, () => { });
        res.status(500).json({ error: 'Error importing excel' });
    }
};
