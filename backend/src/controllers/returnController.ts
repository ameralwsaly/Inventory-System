import { Request, Response } from 'express';
import { query } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getReturns = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = req.user!;
        let sql = `
            SELECT r.*, u.name as requester_name, d.name as department_name 
            FROM returns r
            JOIN users u ON r.requester_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
        `;
        const params: any[] = [];

        // Filters based on role
        if (user.role === 'requester') {
            sql += ` WHERE r.requester_id = $1 ORDER BY r.created_at DESC`;
            params.push(user.id);
        } else if (user.role === 'manager') {
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
            sql += ` ORDER BY r.created_at DESC`;
        }

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching returns' });
    }
};

export const getReturnItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { rows } = await query(
            `SELECT ri.*, i.name as item_name, i.unit 
             FROM return_items ri
             JOIN items i ON ri.item_id = i.id
             WHERE ri.return_id = $1`,
            [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching return items' });
    }
};

export const createReturn = async (req: AuthRequest, res: Response): Promise<void> => {
    const { items } = req.body; // [{ item_id, return_type, requested_qty, requester_reason }]
    const requester_id = req.user!.id;

    try {
        const result = await query(
            `INSERT INTO returns (requester_id, status) VALUES ($1, 'pending_manager') RETURNING id`,
            [requester_id]
        );
        const return_id = result.rows[0].id;

        for (const item of items) {
            await query(
                `INSERT INTO return_items (return_id, item_id, return_type, requested_qty, requester_reason) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [return_id, item.item_id, item.return_type, item.requested_qty, item.requester_reason || '']
            );
        }

        res.status(201).json({ id: return_id, message: 'Return request created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating return request' });
    }
};

export const approveReturn = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body; // status = pending_gm, pending_storekeeper, rejected
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

        await query(`UPDATE returns SET status = $1 ${updateFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, params);
        res.json({ message: 'Return request status updated.' });
    } catch (err) {
        res.status(500).json({ error: 'Error approving return request' });
    }
};

export const fulfillReturn = async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { approved_items } = req.body; // [{ item_id, approved_qty, storekeeper_notes }]
    const user = req.user!;

    try {
        await query('BEGIN'); // Start transaction

        // 1. Process each item (Return vs Damage logic)
        for (const item of approved_items) {
            // Update return_items with final qty and notes
            const updateResult = await query(
                `UPDATE return_items SET approved_qty = $1, storekeeper_notes = $2 WHERE return_id = $3 AND item_id = $4 RETURNING return_type`,
                [item.approved_qty, item.storekeeper_notes || '', id, item.item_id]
            );

            const returnType = updateResult.rows[0].return_type;

            if (returnType === 'return') {
                // Return to stock
                await query(`UPDATE items SET quantity = quantity + $1 WHERE id = $2`, [item.approved_qty, item.item_id]);

                // Log transaction
                await query(
                    `INSERT INTO transactions (type, item_id, qty, user_id, reference_id, notes) VALUES ('return', $1, $2, $3, $4, $5)`,
                    [item.item_id, item.approved_qty, user.id, id, 'Returned from custody']
                );
            } else if (returnType === 'damage') {
                // For Damage: We do not add to stock. It is removed from the user's custody (conceptually handled, here we just log it as a damage transaction).
                await query(
                    `INSERT INTO transactions (type, item_id, qty, user_id, reference_id, notes) VALUES ('damage', $1, $2, $3, $4, $5)`,
                    [item.item_id, item.approved_qty, user.id, id, 'Damaged item return']
                );
            }
        }

        // 2. Mark Returns request as fulfilled
        await query(
            `UPDATE returns SET status = 'fulfilled', storekeeper_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [user.id, id]
        );

        await query('COMMIT');
        res.json({ message: 'Return/Damage request successfully fulfilled and stock adjusted.' });
    } catch (err) {
        await query('ROLLBACK');
        console.error('Error fulfilling return request:', err);
        res.status(500).json({ error: 'Error fulfilling return request.' });
    }
};
