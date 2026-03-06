import { query } from './src/config/db';

async function test() {
    try {
        const request_id = 4;
        const { rows: reqRows } = await query(
            `SELECT r.*, r.created_at as request_date,
                    u.name as recipient_name, u.identity_number as recipient_identity, u.phone as recipient_phone,
                    d.name as department_name,
                    s.name as storekeeper_name, s.role as storekeeper_role,
                    (SELECT name FROM users WHERE role = 'admin' LIMIT 1) as admin_name
             FROM requests r
             JOIN users u ON r.requester_id = u.id
             LEFT JOIN departments d ON u.department_id = d.id
             LEFT JOIN users s ON r.storekeeper_id = s.id
             WHERE r.id = $1`,
            [request_id]
        );
        console.log("query 1 success:", reqRows.length);

        const { rows: itemRows } = await query(
            `SELECT i.name as item_name, i.unit, ri.requested_qty, ri.approved_qty
             FROM request_items ri
             JOIN items i ON ri.item_id = i.id
             WHERE ri.request_id = $1`,
            [request_id]
        );
        console.log("query 2 success, item count:", itemRows.length);
    } catch (e) {
        console.error("error:", e);
    } finally {
        process.exit();
    }
}
test();
