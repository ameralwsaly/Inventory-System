import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        let sql = `
      SELECT r.*, u.name as requester_name, d.name as department_name 
      FROM requests r
      JOIN users u ON r.requester_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
    `;
        const params: any[] = [];

        // Filters based on role
        if (user.role === 'requester') {
            sql += ` WHERE r.requester_id = $1 ORDER BY r.created_at DESC`;
            params.push(user.id);
        } else if (user.role === 'manager') {
            // Manager sees requests from their department users only
            sql += ` WHERE u.department_id = (SELECT department_id FROM users WHERE id = $1)
               AND r.status = 'pending_manager' 
               OR r.requester_id = $1
               ORDER BY r.created_at DESC`;
            params.push(user.id);
        } else if (user.role === 'gm_supply') {
            sql += ` WHERE r.status = 'pending_gm' ORDER BY r.created_at DESC`;
        } else if (user.role === 'storekeeper') {
            sql += ` WHERE r.status = 'pending_storekeeper' ORDER BY r.created_at DESC`;
        } else {
            // admin sees everything
            sql += ` ORDER BY r.created_at DESC`;
        }

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching requests' });
    }
};

export const getRequestItems = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const { rows } = await query(
            `SELECT ri.*, i.name as item_name 
             FROM request_items ri 
             JOIN items i ON ri.item_id = i.id 
             WHERE ri.request_id = $1`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching request items' });
    }
};

export const createRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const { items } = req.body; // [{ item_id, requested_qty }]
    const requester_id = req.user!.id;

    try {
        const result = await query(
            `INSERT INTO requests (requester_id, status) VALUES ($1, 'pending_manager') RETURNING id`,
            [requester_id]
        );
        const request_id = result.rows[0].id;

        for (const item of items) {
            await query(
                `INSERT INTO request_items (request_id, item_id, requested_qty) VALUES ($1, $2, $3)`,
                [request_id, item.item_id, item.requested_qty]
            );
        }

        res.status(201).json({ id: request_id, message: 'Request created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating request' });
    }
};

export const approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, approved_items } = req.body; // status = pending_gm, pending_storekeeper, etc.
    const user = req.user!;

    try {
        let updateFields = '';
        const params: any[] = [status, id];

        if (user.role === 'manager') {
            updateFields = ', manager_id = $3';
            params.push(user.id);
        } else if (user.role === 'gm_supply') {
            updateFields = ', gm_id = $3';
            params.push(user.id);
        }

        await query(`UPDATE requests SET status = $1 ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, params);

        // Update approved quantities if provided
        if (approved_items && Array.isArray(approved_items)) {
            for (const item of approved_items) {
                await query(
                    `UPDATE request_items SET approved_qty = $1 WHERE request_id = $2 AND item_id = $3`,
                    [item.approved_qty, id, item.item_id]
                );
            }
        }

        res.json({ message: 'Request approved and advanced.' });
    } catch (err) {
        res.status(500).json({ error: 'Error approving request' });
    }
};

export const fulfillRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = req.user!;

    try {
        // First get the request items
        const { rows: reqItems } = await query(
            `SELECT item_id, COALESCE(approved_qty, requested_qty) as qty FROM request_items WHERE request_id = $1`,
            [id]
        );

        // Deduct from inventory and create transactions
        for (const item of reqItems) {
            // Deduct
            await query(`UPDATE items SET quantity = quantity - $1 WHERE id = $2`, [item.qty, item.item_id]);
            // Log transaction
            await query(
                `INSERT INTO transactions (type, item_id, qty, user_id, reference_id) VALUES ('out', $1, $2, $3, $4)`,
                [item.item_id, item.qty, user.id, id]
            );
        }

        // Mark request as fulfilled
        await query(`UPDATE requests SET status = 'fulfilled', storekeeper_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [user.id, id]);

        res.json({ message: 'Request fulfilled beautifully.' });
    } catch (err) {
        res.status(500).json({ error: 'Error fulfilling request.' });
    }
};
