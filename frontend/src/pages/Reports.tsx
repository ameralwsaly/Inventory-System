import React, { useState, useEffect } from 'react';
import { FileText, Printer } from 'lucide-react';
import api from '../services/api';

const Reports: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [departmentId, setDepartmentId] = useState('all');
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [startDate, endDate, departmentId]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments', err);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/reports', {
                params: { startDate, endDate, departmentId: departmentId === 'all' ? undefined : departmentId }
            });
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch report requests', err);
        } finally {
            setLoading(false);
        }
    };

    const printVoucher = async (reqId: number, type: string) => {
        try {
            const response = await api.post('/reports/voucher', { request_id: reqId, voucher_type: type }, {
                responseType: 'text',
            });
            const html = response.data;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
            } else {
                alert('يرجى السماح للمتصفح بفتح نوافذ جديدة لطباعة السند.');
            }
        } catch (err) {
            console.error('Error generating voucher:', err);
            alert('حدث خطأ أثناء إنشاء السند');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">التقارير وسجل الحركة</h1>
                    <p className="text-slate-500 mt-1 text-sm">طباعة سندات الصرف للطلبات المنفذة.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={departmentId}
                        onChange={e => setDepartmentId(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white text-slate-700 font-medium"
                    >
                        <option value="all">كل الإدارات والأقسام</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white text-slate-700 [color-scheme:light]"
                        title="من تاريخ"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="px-4 py-2 border border-slate-200 rounded-xl outline-none bg-white text-slate-700 [color-scheme:light]"
                        title="إلى تاريخ"
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">رقم الطلب</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">اسم الموظف</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الإدارة / القسم</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">تاريخ التنفيذ</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">طباعة السند</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                                        <FileText className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-lg font-medium text-slate-600">لا توجد طلبات منفذة حالياً.</p>
                                        <p className="text-sm text-slate-400 mt-1">ستظهر الطلبات هنا بعد تنفيذها من أمين المستودع.</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">#{req.id}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">{req.requester_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.department_name || <span className="text-slate-300">-</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {new Date(req.updated_at).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            <button
                                                onClick={() => printVoucher(req.id, 'issue')}
                                                className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                            >
                                                <Printer size={15} />
                                                طباعة سند الصرف
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;
