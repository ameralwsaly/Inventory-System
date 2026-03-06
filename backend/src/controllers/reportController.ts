import { Request, Response } from 'express';
import { query } from '../config/db';

const roleLabel = (role: string) => {
    const map: Record<string, string> = {
        admin: 'مدير النظام',
        manager: 'مدير الإدارة',
        gm_supply: 'مدير عام التموين',
        storekeeper: 'أمين المستودع',
        requester: 'طالب المادة',
    };
    return map[role] || role;
};

export const getReportRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const { startDate, endDate, departmentId } = req.query;
        // The token is not explicitly parsed in the route currently, let's assume we can get user info or we just apply dates for now.
        // Wait, the reports route might not have auth context if we didn't add the middleware.
        // I will add the date filters.

        let sql = `
            SELECT r.id, r.created_at, r.updated_at, r.status,
                   u.name as requester_name, u.identity_number as requester_identity, u.phone as requester_phone,
                   d.name as department_name,
                   s.name as storekeeper_name,
                   (SELECT name FROM users WHERE role = 'admin' LIMIT 1) as admin_name
            FROM requests r
            JOIN users u ON r.requester_id = u.id
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN users s ON r.storekeeper_id = s.id
            WHERE r.status = 'fulfilled'
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (startDate) {
            sql += ` AND r.updated_at >= $${paramIndex}`;
            params.push(`${startDate} 00:00:00`);
            paramIndex++;
        }

        if (endDate) {
            sql += ` AND r.updated_at <= $${paramIndex}`;
            params.push(`${endDate} 23:59:59`);
            paramIndex++;
        }

        if (departmentId && departmentId !== 'all') {
            sql += ` AND d.id = $${paramIndex}`;
            params.push(departmentId);
            paramIndex++;
        }

        sql += ` ORDER BY r.updated_at DESC`;

        const { rows } = await query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching report requests:', err);
        res.status(500).json({ error: 'Error fetching report requests' });
    }
};

export const generateVoucher = async (req: Request, res: Response): Promise<void> => {
    const { request_id, voucher_type } = req.body;

    try {
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

        if (reqRows.length === 0) {
            res.status(404).json({ error: 'Request not found' });
            return;
        }

        const requestData = reqRows[0];

        const { rows: itemRows } = await query(
            `SELECT i.name as item_name, i.unit, ri.requested_qty, ri.approved_qty
             FROM request_items ri
             JOIN items i ON ri.item_id = i.id
             WHERE ri.request_id = $1`,
            [request_id]
        );

        const dateStr = new Date(requestData.request_date).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const itemsHtml = itemRows.map((item: any, idx: number) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${item.item_name}</td>
                <td>${item.unit || 'وحدة'}</td>
                <td>${item.requested_qty}</td>
                <td>${item.approved_qty ?? item.requested_qty}</td>
            </tr>
        `).join('');

        const voucherTitle = voucher_type === 'issue' ? 'سند صرف مواد' : 'سند استلام مواد';

        const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${voucherTitle} - طلب #${request_id}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Cairo', Arial, sans-serif; direction: rtl; background: #fff; color: #1a1a2e; padding: 20px; }
        .voucher { max-width: 800px; margin: 0 auto; border: 2px solid #1a3a5c; padding: 30px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { font-size: 22px; font-weight: 900; color: #1a3a5c; }
        .header h2 { font-size: 16px; color: #555; margin-top: 4px; }
        .badge { display: inline-block; background: #1a3a5c; color: white; padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-top: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .info-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; }
        .info-box label { font-size: 11px; color: #888; display: block; margin-bottom: 2px; }
        .info-box span { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #1a3a5c; color: white; padding: 10px 12px; text-align: center; font-size: 13px; }
        td { padding: 9px 12px; text-align: center; border-bottom: 1px solid #eee; font-size: 13px; }
        tr:nth-child(even) td { background: #f8f9fa; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
        .sig-box { text-align: center; }
        .sig-box .sig-line { border-top: 1px solid #333; margin-top: 40px; margin-bottom: 6px; }
        .sig-box label { font-size: 11px; color: #888; }
        .sig-box span { font-size: 13px; font-weight: 700; display: block; margin-top: 2px; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #aaa; }
        @media print {
            body { padding: 0; }
            .voucher { border: none; }
            .no-print { display: none; }
        }
        .print-btn { 
            display: block; text-align: center; margin: 0 auto 20px; 
            background: #1a3a5c; color: white; border: none; 
            padding: 10px 30px; border-radius: 6px; font-size: 15px; 
            cursor: pointer; font-family: Cairo, Arial, sans-serif;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ طباعة السند</button>
    <div class="voucher">
        <div class="header">
            <h1>إدارة التموين - نظام المستودعات العام</h1>
            <h2>${voucherTitle}</h2>
            <span class="badge">رقم الطلب: #${request_id}</span>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <label>اسم المستلم</label>
                <span>${requestData.recipient_name || 'غير محدد'}</span>
            </div>
            <div class="info-box">
                <label>رقم الهوية</label>
                <span>${requestData.recipient_identity || '-'}</span>
            </div>
            <div class="info-box">
                <label>الجوال</label>
                <span>${requestData.recipient_phone || '-'}</span>
            </div>
            <div class="info-box">
                <label>الإدارة / الجهة الطالبة</label>
                <span>${requestData.department_name || 'غير محددة'}</span>
            </div>
            <div class="info-box">
                <label>تاريخ الطلب</label>
                <span>${dateStr}</span>
            </div>
            <div class="info-box">
                <label>نوع السند</label>
                <span>${voucherTitle}</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>اسم الصنف</th>
                    <th>الوحدة</th>
                    <th>الكمية المطلوبة</th>
                    <th>الكمية المعتمدة</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="signatures">
            <div class="sig-box">
                <div class="sig-line"></div>
                <label>أمين المستودع</label>
                <span>${requestData.storekeeper_name || '___________'}</span>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <label>المستلم</label>
                <span>${requestData.recipient_name || '___________'}</span>
            </div>
            <div class="sig-box">
                <div class="sig-line"></div>
                <label>مدير النظام</label>
                <span>${requestData.admin_name || '___________'}</span>
            </div>
        </div>

        <div class="footer">تم إصدار هذا السند بتاريخ ${new Date().toLocaleDateString('ar-SA')} - نظام إدارة المستودعات المتكامل</div>
    </div>
</body>
</html>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (err) {
        console.error('Error generating voucher:', err);
        res.status(500).json({ error: 'Error generating voucher' });
    }
};
