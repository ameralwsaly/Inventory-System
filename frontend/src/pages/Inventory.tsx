import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Archive, Upload, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Inventory: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState<any>({ id: null, name: '', description: '', quantity: 0, unit: 'حبة', min_limit: 0 });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await api.get('/items');
            setItems(res.data);
        } catch (err) {
            console.error('Failed to fetch items', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await api.put(`/items/${formData.id}`, formData);
            } else {
                await api.post('/items', formData);
            }
            setShowModal(false);
            fetchItems();
        } catch (err: any) {
            console.error('Error saving item', err);
            alert(err?.response?.data?.error || 'حدث خطأ أثناء حفظ الصنف');
        }
    };

    const openEditModal = (item: any) => {
        setFormData({ ...item });
        setShowModal(true);
    };

    const openAddModal = () => {
        setFormData({ id: null, name: '', description: '', quantity: 0, unit: 'حبة', min_limit: 0 });
        setShowModal(true);
    };

    const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportStatus('جاري الاستيراد...');
        const fd = new FormData();
        fd.append('file', file);

        try {
            const res = await api.post('/items/import', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportStatus(res.data.message || 'تم الاستيراد بنجاح ✅');
            fetchItems();
        } catch (err: any) {
            setImportStatus(err?.response?.data?.error || 'فشل الاستيراد ❌');
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setTimeout(() => setImportStatus(null), 4000);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const canManage = ['admin', 'storekeeper', 'manager', 'gm_supply'].includes(user?.role || '');

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">المخزون والأصناف</h1>
                    <p className="text-slate-500 mt-1 text-sm">إدارة الأصناف والكميات في المستودع.</p>
                </div>
                {canManage && (
                    <div className="flex gap-2 flex-wrap">
                        {user?.role === 'admin' && (
                            <>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    className="hidden"
                                    onChange={handleExcelImport}
                                />
                                <button
                                    onClick={() => alert('ترتيب أعمدة الإكسل المطلوبة:\n1. اسم الصنف (إجباري)\n2. الوصف\n3. الكمية (الافتتاحية)\n4. الوحدة (مثل: حبة، كرتون)\n5. الحد الأدنى')}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                                    title="تعليمات استيراد الإكسل"
                                >
                                    <span className="font-bold">?</span>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Upload size={18} />
                                    استيراد من Excel
                                </button>
                            </>
                        )}
                        <button
                            onClick={openAddModal}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shadow-sm shadow-primary-600/20"
                        >
                            <Plus size={18} />
                            إضافة صنف جديد
                        </button>
                    </div>
                )}
            </div>

            {importStatus && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium">
                    <CheckCircle size={20} />
                    {importStatus}
                </div>
            )}

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pr-12 pl-4 py-3 bg-slate-50 border-transparent rounded-xl focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-500 sm:text-sm transition-all text-slate-900"
                        placeholder="ابحث عن صنف بالاسم أو الوصف..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الرقم</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">اسم الصنف</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الوصف</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الرصيد المتوفر</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الوحدة</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">الحد الأدنى</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                                        <Archive className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-lg font-medium text-slate-600">لا توجد أصناف مطابقة.</p>
                                        <p className="text-sm text-slate-400 mt-1">الرجاء تغيير كلمات البحث أو إضافة صنف جديد.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">#{item.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-slate-800">{item.name}</div>
                                            {item.quantity <= item.min_limit && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                                                    رصيد منخفض
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">{item.description || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-full text-sm font-bold ${item.quantity > item.min_limit ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-600">{item.unit || 'حبة'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-500">{item.min_limit}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                                            {canManage && (
                                                <button onClick={() => openEditModal(item)} className="text-indigo-600 hover:text-indigo-900 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                                    <Edit2 size={16} className="inline mr-1" /> تعديل
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">{formData.id ? 'تعديل صنف' : 'إضافة صنف جديد'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">اسم الصنف *</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow resize-none" rows={3}></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الكمية الافتتاحية</label>
                                    <input
                                        type="number" required min="0"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow"
                                        disabled={!!formData.id}
                                    />
                                    {!!formData.id && <p className="text-xs text-slate-400 mt-1">تعديل الكمية يتم عبر العمليات.</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الوحدة</label>
                                    <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="مثال: حبة، كرتون، لتر" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow" />
                                </div>
                            </div>
                            {!formData.id && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">الحد الأدنى للمخزون</label>
                                    <input type="number" min="0" value={formData.min_limit} onChange={e => setFormData({ ...formData, min_limit: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-shadow" />
                                    <p className="text-xs text-slate-400 mt-1">اتركه 0 ليُحسب تلقائياً (10% من الكمية)</p>
                                </div>
                            )}
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">إلغاء</button>
                                <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm">{formData.id ? 'حفظ التعديلات' : 'إضافة الصنف'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
