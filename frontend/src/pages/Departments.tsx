import React, { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2, X, Users, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../services/api';

const ROLES: Record<string, string> = {
    admin: 'مدير النظام', manager: 'مدير الإدارة', gm_supply: 'مدير عام التموين',
    storekeeper: 'أمين المستودع', requester: 'طالب المادة',
};

const Departments: React.FC = () => {
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editDept, setEditDept] = useState<any | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [expandedDept, setExpandedDept] = useState<number | null>(null);
    const [deptUsers, setDeptUsers] = useState<Record<number, any[]>>({});
    const [loadingUsers, setLoadingUsers] = useState<number | null>(null);

    useEffect(() => { fetchDepartments(); }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments', err);
        } finally {
            setLoading(false);
        }
    };

    const openAdd = () => { setEditDept(null); setName(''); setError(''); setShowModal(true); };
    const openEdit = (dept: any) => { setEditDept(dept); setName(dept.name); setError(''); setShowModal(true); };

    const handleSave = async () => {
        if (!name.trim()) { setError('يرجى إدخال اسم الإدارة'); return; }
        setSaving(true); setError('');
        try {
            if (editDept) {
                await api.put(`/departments/${editDept.id}`, { name });
            } else {
                await api.post('/departments', { name });
            }
            setShowModal(false);
            fetchDepartments();
        } catch (err: any) {
            setError(err.response?.data?.error || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, deptName: string) => {
        if (!confirm(`هل أنت متأكد من حذف إدارة "${deptName}"؟`)) return;
        try {
            await api.delete(`/departments/${id}`);
            fetchDepartments();
        } catch (err: any) {
            alert(err.response?.data?.error || 'حدث خطأ أثناء الحذف');
        }
    };

    const toggleUsers = async (deptId: number) => {
        if (expandedDept === deptId) { setExpandedDept(null); return; }
        setExpandedDept(deptId);
        if (!deptUsers[deptId]) {
            setLoadingUsers(deptId);
            try {
                const res = await api.get(`/departments/${deptId}/users`);
                setDeptUsers(prev => ({ ...prev, [deptId]: res.data }));
            } catch { }
            setLoadingUsers(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">الإدارات والجهات الطالبة</h1>
                    <p className="text-slate-500 mt-1 text-sm">إضافة وتعديل وحذف الإدارات وعرض منسوبيها.</p>
                </div>
                <button onClick={openAdd}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/25">
                    <Plus size={18} />
                    إضافة إدارة
                </button>
            </div>

            {loading ? (
                <div className="text-center py-16 text-slate-500">جاري التحميل...</div>
            ) : departments.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 py-16 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                    <p className="text-lg font-medium text-slate-600">لا توجد إدارات بعد.</p>
                    <p className="text-sm text-slate-400 mt-1">ابدأ بإضافة إدارة جديدة.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {departments.map((dept) => (
                        <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                        <Building2 size={20} className="text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-800">{dept.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{dept.user_count} مستخدم</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleUsers(dept.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                                        <Users size={15} />
                                        المنسوبون
                                        {expandedDept === dept.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    <button onClick={() => openEdit(dept)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="تعديل">
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(dept.id, dept.name)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="حذف">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Users inside dept */}
                            {expandedDept === dept.id && (
                                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                                    {loadingUsers === dept.id ? (
                                        <p className="text-sm text-slate-400 text-center py-2">جاري التحميل...</p>
                                    ) : (deptUsers[dept.id] || []).length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-2">لا يوجد مستخدمون في هذه الإدارة.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(deptUsers[dept.id] || []).map((u: any) => (
                                                <div key={u.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-slate-100">
                                                    <div>
                                                        <p className="font-semibold text-slate-700 text-sm">{u.name}</p>
                                                        <p className="text-xs text-slate-400">{u.email}</p>
                                                    </div>
                                                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                                                        {ROLES[u.role] || u.role}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 p-8 z-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{editDept ? 'تعديل إدارة' : 'إضافة إدارة جديدة'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم الإدارة *</label>
                            <input value={name} onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                placeholder="مثال: إدارة الموارد البشرية" autoFocus />
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
                                {saving ? 'جاري الحفظ...' : (editDept ? 'حفظ التعديلات' : 'إضافة الإدارة')}
                            </button>
                            <button onClick={() => setShowModal(false)}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Departments;
