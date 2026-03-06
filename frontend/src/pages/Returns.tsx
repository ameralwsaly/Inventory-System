import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, X as XIcon, RefreshCcw, AlertOctagon } from 'lucide-react';
import api from '../services/api';

const Returns: React.FC = () => {
    const { user } = useAuth();
    const [returnsList, setReturnsList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]); // For creating new return

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // Expand states
    const [expandedReturnId, setExpandedReturnId] = useState<number | null>(null);
    const [returnItems, setReturnItems] = useState<any[]>([]);
    const [editedQtys, setEditedQtys] = useState<Record<number, number>>({});
    const [editedNotes, setEditedNotes] = useState<Record<number, string>>({});

    useEffect(() => {
        fetchReturns();
        if (user?.role === 'requester' || user?.role === 'admin') {
            fetchItems();
        }
    }, [user]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const res = await api.get('/returns');
            setReturnsList(res.data);
        } catch (err) {
            console.error('Failed to fetch returns', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get('/items');
            setItems(res.data);
        } catch (err) {
            console.error('Failed to fetch items', err);
        }
    };

    const fetchReturnItems = async (returnId: number) => {
        try {
            const res = await api.get(`/returns/${returnId}/items`);
            setReturnItems(res.data);

            // Initialize edit states for storekeeper
            if (user?.role === 'storekeeper') {
                const qtys: Record<number, number> = {};
                const notes: Record<number, string> = {};
                res.data.forEach((item: any) => {
                    qtys[item.item_id] = item.approved_qty ?? item.requested_qty;
                    notes[item.item_id] = item.storekeeper_notes || '';
                });
                setEditedQtys(qtys);
                setEditedNotes(notes);
            }
        } catch (err) {
            console.error('Failed to fetch return items', err);
        }
    };

    const toggleExpand = (returnId: number) => {
        if (expandedReturnId === returnId) {
            setExpandedReturnId(null);
            setReturnItems([]);
        } else {
            setExpandedReturnId(returnId);
            fetchReturnItems(returnId);
        }
    };

    const handleCreateReturn = async () => {
        if (selectedItems.length === 0) return alert('الرجاء إضافة أصناف قبل إرسال الطلب');

        const itemsToSubmit = selectedItems.map(item => ({
            item_id: item.id,
            return_type: item.return_type || 'return',
            requested_qty: item.requested_qty,
            requester_reason: item.requester_reason || ''
        }));

        try {
            await api.post('/returns', { items: itemsToSubmit });
            setIsCreateModalOpen(false);
            setSelectedItems([]);
            fetchReturns();
            alert('تم إرسال الطلب بنجاح');
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء الإرسال');
        }
    };

    const handleApprove = async (returnId: number, status: string) => {
        try {
            await api.put(`/returns/${returnId}/approve`, { status });
            fetchReturns();
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء إجراء الموافقة');
        }
    };

    const handleFulfill = async (returnId: number) => {
        try {
            const approved_items = returnItems.map(item => ({
                item_id: item.item_id,
                approved_qty: editedQtys[item.item_id] ?? item.requested_qty,
                storekeeper_notes: editedNotes[item.item_id] || ''
            }));

            await api.put(`/returns/${returnId}/fulfill`, { approved_items });
            fetchReturns();
            alert('تم التنفيذ بنجاح');
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء التنفيذ');
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, JSX.Element> = {
            pending_manager: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">بانتظار الإدارة</span>,
            pending_gm: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">بانتظار مدير التموين</span>,
            pending_storekeeper: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">بانتظار أمين المستودع</span>,
            fulfilled: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">مكتمل</span>,
            rejected: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">مرفوض</span>,
        };
        return badges[status] || <span>{status}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">طلبات الرجيع والتالف</h1>
                    <p className="text-slate-500 mt-1 text-sm">إدارة إعادة وتكعيب المواد إلى المستودع.</p>
                </div>
                {(user?.role === 'requester' || user?.role === 'admin') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl transition-all font-medium shadow-sm shadow-primary-500/30"
                    >
                        <Plus size={18} />
                        طلب رجيع/تالف جديد
                    </button>
                )}
            </div>

            {/* List Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">الرقم</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">مقدم الطلب</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">تاريخ الطلب</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">الحالة</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : returnsList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <p>لا توجد طلبات رجيع أو تالف.</p>
                                    </td>
                                </tr>
                            ) : (
                                returnsList.map(ret => (
                                    <React.Fragment key={ret.id}>
                                        <tr className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">#{ret.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{ret.requester_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(ret.created_at).toLocaleDateString('ar-SA')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(ret.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                                <div className="flex justify-end gap-2 items-center">
                                                    <button onClick={() => toggleExpand(ret.id)} className="text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                                                        {expandedReturnId === ret.id ? 'إخفاء' : 'تفاصيل'}
                                                    </button>
                                                    {ret.status === 'pending_manager' && user?.role === 'manager' && (
                                                        <>
                                                            <button onClick={() => handleApprove(ret.id, 'pending_gm')} className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">موافقة</button>
                                                            <button onClick={() => handleApprove(ret.id, 'rejected')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200">رفض</button>
                                                        </>
                                                    )}
                                                    {ret.status === 'pending_gm' && user?.role === 'gm_supply' && (
                                                        <>
                                                            <button onClick={() => handleApprove(ret.id, 'pending_storekeeper')} className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200">اعتماد</button>
                                                            <button onClick={() => handleApprove(ret.id, 'rejected')} className="text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors border border-red-200">رفض</button>
                                                        </>
                                                    )}
                                                    {ret.status === 'pending_storekeeper' && user?.role === 'storekeeper' && (
                                                        <button onClick={() => handleFulfill(ret.id)} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors font-bold border border-indigo-200">استلام وإيداع</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedReturnId === ret.id && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                                                        <table className="min-w-full divide-y divide-slate-100">
                                                            <thead className="bg-slate-50">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">الصنف</th>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">النوع</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">الكمية المسلمة</th>
                                                                    <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">الكمية المقبولة</th>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">السبب</th>
                                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">ملاحظات المستودع</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {returnItems.map(item => (
                                                                    <tr key={item.item_id}>
                                                                        <td className="px-4 py-3 text-sm text-slate-700">{item.item_name}</td>
                                                                        <td className="px-4 py-3 text-sm text-slate-600">
                                                                            {item.return_type === 'damage' ?
                                                                                <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><AlertOctagon size={12} />تالف</span> :
                                                                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1"><RefreshCcw size={12} />رجيع بحالة جيدة</span>
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{item.requested_qty}</td>
                                                                        <td className="px-4 py-3 text-center">
                                                                            {/* Storekeeper Edit Qty */}
                                                                            {(user?.role === 'storekeeper' && ret.status === 'pending_storekeeper') ? (
                                                                                <input
                                                                                    type="number" min="0"
                                                                                    className="w-16 px-2 py-1 text-center border border-slate-200 rounded-lg outline-none"
                                                                                    value={editedQtys[item.item_id] ?? item.requested_qty}
                                                                                    onChange={(e) => setEditedQtys({ ...editedQtys, [item.item_id]: parseInt(e.target.value) || 0 })}
                                                                                />
                                                                            ) : (
                                                                                <span className="font-bold">{item.approved_qty ?? item.requested_qty}</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate" title={item.requester_reason}>{item.requester_reason || '-'}</td>
                                                                        <td className="px-4 py-3 text-sm text-slate-500">
                                                                            {/* Storekeeper Add Notes */}
                                                                            {(user?.role === 'storekeeper' && ret.status === 'pending_storekeeper') ? (
                                                                                <input
                                                                                    type="text"
                                                                                    className="w-full px-2 py-1 border border-slate-200 rounded-lg outline-none"
                                                                                    placeholder="ملاحظات..."
                                                                                    value={editedNotes[item.item_id] || ''}
                                                                                    onChange={(e) => setEditedNotes({ ...editedNotes, [item.item_id]: e.target.value })}
                                                                                />
                                                                            ) : (
                                                                                <span>{item.storekeeper_notes || '-'}</span>
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

            {/* Create Return Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">إنشاء طلب رجيع أو تالف</h3>
                                <p className="text-slate-500 text-sm mt-1">إرجاع المواد الفائضة أو التالفة إلى عهدة المستودع.</p>
                            </div>
                            <button onClick={() => { setIsCreateModalOpen(false); setSelectedItems([]); }} className="text-slate-400 hover:text-slate-600 bg-white p-2 text-center rounded-xl hover:bg-slate-100 transition-colors">
                                <XIcon size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Selected Items */}
                            {selectedItems.length > 0 && (
                                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <h4 className="font-semibold text-slate-700">الأصناف المضافة للطلب ({selectedItems.length})</h4>
                                    <div className="space-y-3">
                                        {selectedItems.map((item, index) => (
                                            <div key={`${item.id}-${index}`} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-800">{item.name}</p>
                                                    <div className="flex gap-4 mt-2">
                                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`type-${item.id}`}
                                                                checked={item.return_type === 'return'}
                                                                onChange={() => {
                                                                    const arr = [...selectedItems]; arr[index].return_type = 'return'; setSelectedItems(arr);
                                                                }}
                                                                className="text-primary-600"
                                                            />
                                                            <span className="inline-flex items-center gap-1"><RefreshCcw size={14} /> رجيع سليم</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`type-${item.id}`}
                                                                checked={item.return_type === 'damage'}
                                                                onChange={() => {
                                                                    const arr = [...selectedItems]; arr[index].return_type = 'damage'; setSelectedItems(arr);
                                                                }}
                                                                className="text-red-600"
                                                            />
                                                            <span className="inline-flex items-center gap-1"><AlertOctagon size={14} /> تالف</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="w-24">
                                                    <label className="text-xs text-slate-500 mb-1 block">الكمية</label>
                                                    <input
                                                        type="number" min="1"
                                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-primary-500"
                                                        value={item.requested_qty}
                                                        onChange={(e) => {
                                                            const arr = [...selectedItems]; arr[index].requested_qty = parseInt(e.target.value) || 1; setSelectedItems(arr);
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-slate-500 mb-1 block">سبب الإرجاع / التلف</label>
                                                    <input
                                                        type="text"
                                                        placeholder="اذكر السبب..."
                                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-primary-500"
                                                        value={item.requester_reason || ''}
                                                        onChange={(e) => {
                                                            const arr = [...selectedItems]; arr[index].requester_reason = e.target.value; setSelectedItems(arr);
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== index))}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1 mt-5" title="إزالة"
                                                >
                                                    <XIcon size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Item Form */}
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-3">أضف صنف</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {items.map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                if (!selectedItems.find(i => i.id === item.id)) {
                                                    setSelectedItems([...selectedItems, { ...item, requested_qty: 1, return_type: 'return', requester_reason: '' }]);
                                                }
                                            }}
                                            disabled={selectedItems.some(i => i.id === item.id)}
                                            className="text-right p-3 rounded-xl border border-slate-200 bg-white hover:border-primary-300 hover:shadow-md transition-all flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="font-bold text-sm text-slate-800 truncate">{item.name}</p>
                                            </div>
                                            <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                {selectedItems.some(i => i.id === item.id) ? <Check size={16} className="text-emerald-500" /> : <Plus size={16} />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors font-medium">إلغاء</button>
                            <button
                                onClick={handleCreateReturn}
                                disabled={selectedItems.length === 0}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                إرسال الطلب للاعتماد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Returns;
