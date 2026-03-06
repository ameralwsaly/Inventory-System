import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle, XCircle, Clock, PackageCheck } from 'lucide-react';
import api from '../services/api';

const Requests: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [expandedReqId, setExpandedReqId] = useState<number | null>(null);
    const [reqItems, setReqItems] = useState<any[]>([]);
    const [editedQtys, setEditedQtys] = useState<{ [itemId: number]: number }>({});
    const [selectedItems, setSelectedItems] = useState([{ item_id: '', requested_qty: 1 }]);

    useEffect(() => {
        fetchRequests();
        if (user?.role === 'requester') {
            fetchItemsForDropdown();
        }
    }, [user]);

    const fetchRequests = async () => {
        try {
            const res = await api.get('/requests');
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch requests', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchItemsForDropdown = async () => {
        try {
            const res = await api.get('/items');
            setItems(res.data.filter((i: any) => i.quantity > 0)); // Only items with stock
        } catch (err) {
            console.error('Error fetching items', err);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Filter out empty rows
            const validItems = selectedItems.filter(i => i.item_id !== '' && i.requested_qty > 0);
            if (validItems.length === 0) return alert('يرجى اختيار صنف واحد على الأقل');

            await api.post('/requests', { items: validItems });
            setShowModal(false);
            setSelectedItems([{ item_id: '', requested_qty: 1 }]);
            fetchRequests();
        } catch (err) {
            console.error('Error creating request', err);
            alert('حدث خطأ أثناء الإرسال');
        }
    };

    const fetchRequestItems = async (reqId: number) => {
        try {
            const res = await api.get(`/requests/${reqId}/items`);
            setReqItems(res.data);

            // Initialize edited quantities
            const initialQtys: any = {};
            res.data.forEach((i: any) => {
                initialQtys[i.item_id] = i.approved_qty ?? i.requested_qty;
            });
            setEditedQtys(initialQtys);
        } catch (err) {
            console.error('Failed to fetch request items', err);
        }
    };

    const toggleExpand = (reqId: number) => {
        if (expandedReqId === reqId) {
            setExpandedReqId(null);
            setReqItems([]);
            setEditedQtys({});
        } else {
            setExpandedReqId(reqId);
            fetchRequestItems(reqId);
        }
    };

    const handleAction = async (id: number, action: 'approve' | 'fulfill', nextStatus?: string) => {
        try {
            if (action === 'approve') {
                const approved_items = Object.keys(editedQtys).map(itemId => ({
                    item_id: parseInt(itemId),
                    approved_qty: editedQtys[parseInt(itemId)]
                }));
                await api.put(`/requests/${id}/approve`, { status: nextStatus, approved_items });
            } else {
                await api.put(`/requests/${id}/fulfill`);
            }
            fetchRequests();
        } catch (err) {
            console.error('Action failed', err);
            alert('فشلت العملية');
        }
    };

    const handlePrintVoucher = async (id: number) => {
        try {
            const res = await api.post('/reports/voucher', { request_id: id }, { responseType: 'text' });
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(res.data);
                newWindow.document.close();
            }
        } catch (err) {
            console.error('Failed to print', err);
            alert('فشلت الطباعة');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_manager': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock size={12} /> بانتظار المدير المباشر</span>;
            case 'pending_gm': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"><Clock size={12} /> بانتظار مدير التموين</span>;
            case 'pending_storekeeper': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><PackageCheck size={12} /> بانتظار الصرف</span>;
            case 'fulfilled': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle size={12} /> تم الصرف</span>;
            case 'rejected': return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle size={12} /> مرفوض</span>;
            default: return status;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{user?.role === 'requester' ? 'طلباتي' : 'إدارة الطلبات والموافقات'}</h1>
                    <p className="text-slate-500 mt-1 text-sm">متابعة ومعالجة طلبات صرف المواد.</p>
                </div>
                {user?.role === 'requester' && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={18} />
                        طلب مبدئي جديد
                    </button>
                )}
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">رقم الطلب</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">مقدم الطلب</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الإدارة/القسم</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">التاريخ</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الحالة</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">الإجراء</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                                        <Clock className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-lg font-medium text-slate-600">لا توجد طلبات لعرضها.</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <React.Fragment key={req.id}>
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">#{req.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{req.requester_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{req.department_name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(req.created_at).toLocaleDateString('ar-SA')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(req.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <div className="flex justify-end gap-2 items-center">
                                                    <button onClick={() => toggleExpand(req.id)} className="text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                                                        {expandedReqId === req.id ? 'إخفاء' : 'تفاصيل'}
                                                    </button>
                                                    {req.status === 'pending_manager' && user?.role === 'manager' && (
                                                        <>
                                                            <button onClick={() => handleAction(req.id, 'approve', 'pending_gm')} className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm">موافقة ورفع</button>
                                                            <button onClick={() => handleAction(req.id, 'approve', 'rejected')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200 shadow-sm">رفض</button>
                                                        </>
                                                    )}
                                                    {req.status === 'pending_gm' && user?.role === 'gm_supply' && (
                                                        <>
                                                            <button onClick={() => handleAction(req.id, 'approve', 'pending_storekeeper')} className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm">اعتماد نهائي</button>
                                                            <button onClick={() => handleAction(req.id, 'approve', 'rejected')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200 shadow-sm">رفض</button>
                                                        </>
                                                    )}
                                                    {req.status === 'pending_storekeeper' && user?.role === 'storekeeper' && (
                                                        <>
                                                            <button onClick={() => handleAction(req.id, 'fulfill')} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-bold border border-indigo-200 shadow-sm">تنفيذ وصرف</button>
                                                            <button onClick={() => handlePrintVoucher(req.id)} className="text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm">طباعة معاينة</button>
                                                        </>
                                                    )}
                                                    {req.status === 'fulfilled' && user?.role === 'storekeeper' && (
                                                        <button onClick={() => handlePrintVoucher(req.id)} className="text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm">طباعة السند</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedReqId === req.id && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={6} className="px-6 py-4">
                                                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                                        <table className="min-w-full divide-y divide-slate-100">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">الصنف</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">الكمية المطلوبة</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">الكمية المعتمدة</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {reqItems.map(item => (
                                                                    <tr key={item.item_id}>
                                                                        <td className="px-4 py-3 text-sm text-slate-700">{item.item_name}</td>
                                                                        <td className="px-4 py-3 text-center text-sm text-slate-600 bg-slate-50/50">{item.requested_qty}</td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {/* Only let admin or gm_supply change approved qty when it's pending them */}
                                                                            {(['admin', 'gm_supply'].includes(user?.role || '') && req.status === 'pending_gm') ? (
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    className="w-20 px-2 py-1 text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                                                                    value={editedQtys[item.item_id] ?? item.requested_qty}
                                                                                    onChange={(e) => setEditedQtys({ ...editedQtys, [item.item_id]: parseInt(e.target.value) || 0 })}
                                                                                />
                                                                            ) : (
                                                                                <span className="font-bold text-slate-800">{item.approved_qty ?? item.requested_qty}</span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Request Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-lg font-bold text-slate-800">إنشاء طلب مواد جديد</h3>
                                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
                            </div>
                            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                                {selectedItems.map((item, index) => (
                                    <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">تحديد الصنف</label>
                                            <select
                                                value={item.item_id}
                                                onChange={(e) => {
                                                    const newArr = [...selectedItems];
                                                    newArr[index].item_id = e.target.value;
                                                    setSelectedItems(newArr);
                                                }}
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                            >
                                                <option value="" disabled>اختر الصنف المطلوب...</option>
                                                {items.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-28">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">الكمية</label>
                                            <input
                                                type="number" min="1" required
                                                value={item.requested_qty}
                                                onChange={(e) => {
                                                    const newArr = [...selectedItems];
                                                    newArr[index].requested_qty = parseInt(e.target.value) || 1;
                                                    setSelectedItems(newArr);
                                                }}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        {selectedItems.length > 1 && (
                                            <button type="button" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))} className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg mb-0.5">
                                                <XCircle size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button type="button" onClick={() => setSelectedItems([...selectedItems, { item_id: '', requested_qty: 1 }])} className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1 mt-2">
                                    <Plus size={16} /> إضافة صنف آخر
                                </button>

                                <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                                    <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">إرسال الطلب للاعتماد</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Requests;
