import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

const ROLES = [
    { value: 'admin', label: 'مدير النظام' },
    { value: 'manager', label: 'مدير الإدارة' },
    { value: 'gm_supply', label: 'مدير عام التموين' },
    { value: 'storekeeper', label: 'أمين المستودع' },
    { value: 'requester', label: 'طالب المادة' },
];

const roleLabel = (role: string) => ROLES.find(r => r.value === role)?.label || role;

const roleBadgeClass = (role: string) => {
    const map: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-700',
        manager: 'bg-blue-100 text-blue-700',
        gm_supply: 'bg-indigo-100 text-indigo-700',
        storekeeper: 'bg-amber-100 text-amber-700',
        requester: 'bg-emerald-100 text-emerald-700',
    };
    return map[role] || 'bg-slate-100 text-slate-600';
};

const emptyForm = {
    name: '', email: '', password: '', phone: '', identity_number: '', role: 'requester', department_id: ''
};

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState<any | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, deptsRes] = await Promise.all([api.get('/users'), api.get('/departments')]);
            setUsers(usersRes.data);
            setDepartments(deptsRes.data);
        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditUser(null);
        setForm({ ...emptyForm });
        setError('');
        setShowPassword(false);
        setShowModal(true);
    };

    const openEditModal = (user: any) => {
        setEditUser(user);
        setForm({
            name: user.name, email: user.email, password: '',
            phone: user.phone || '', identity_number: user.identity_number || '',
            role: user.role, department_id: user.department_id || ''
        });
        setError('');
        setShowPassword(false);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.email || !form.role) { setError('يرجى تعبئة الاسم والبريد والرتبة'); return; }
        if (!editUser && !form.password) { setError('كلمة المرور مطلوبة عند إضافة مستخدم جديد'); return; }
        setSaving(true);
        setError('');
        try {
            const payload = { ...form, department_id: form.department_id || null };
            if (editUser) {
                await api.put(`/users/${editUser.id}`, payload);
            } else {
                await api.post('/users', payload);
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.error || 'حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف المستخدم "${name}"؟`)) return;
        try {
            await api.delete(`/users/${id}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'حدث خطأ أثناء الحذف');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة المستخدمين</h1>
                    <p className="text-slate-500 mt-1 text-sm">إضافة وتعديل وحذف مستخدمي النظام وضبط رتبهم وإداراتهم.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-primary-500/25 hover:shadow-primary-500/40"
                >
                    <Plus size={18} />
                    إضافة مستخدم
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الاسم</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">البريد الإلكتروني</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الرتبة</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الإدارة</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">الجوال</th>
                                <th className="px-5 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">رقم الهوية</th>
                                <th className="px-5 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">جاري التحميل...</td></tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                                        <UsersIcon className="mx-auto h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-lg font-medium text-slate-600">لا يوجد مستخدمون بعد.</p>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap font-semibold text-slate-800 text-sm">{user.name}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">{user.email}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                                                {roleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{user.department_name || <span className="text-slate-300">-</span>}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{user.phone || <span className="text-slate-300">-</span>}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{user.identity_number || <span className="text-slate-300">-</span>}</td>
                                        <td className="px-5 py-4 whitespace-nowrap text-left text-sm">
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => openEditModal(user)} className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors" title="تعديل">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(user.id, user.name)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="حذف">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 p-8 z-10 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800">{editUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الاسم الكامل *</label>
                                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                    placeholder="أدخل الاسم الكامل" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">البريد الإلكتروني *</label>
                                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                    placeholder="example@domain.com" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    كلمة المرور {editUser ? '(اتركها فارغة إذا لا تريد تغييرها)' : '*'}
                                </label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                        placeholder="أدخل كلمة المرور" dir="ltr" />
                                    <button type="button" onClick={() => setShowPassword(s => !s)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الرتبة *</label>
                                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white">
                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">الإدارة</label>
                                <select value={form.department_id} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent bg-white">
                                    <option value="">-- بدون إدارة --</option>
                                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">رقم الجوال</label>
                                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                    placeholder="05XXXXXXXX" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">رقم الهوية</label>
                                <input value={form.identity_number} onChange={e => setForm(f => ({ ...f, identity_number: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                                    placeholder="10XXXXXXXX" dir="ltr" />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-7">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
                                {saving ? 'جاري الحفظ...' : (editUser ? 'حفظ التعديلات' : 'إضافة المستخدم')}
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

export default Users;
