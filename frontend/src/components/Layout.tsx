import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Package,
    ClipboardList,
    LogOut,
    FileText,
    Users,
    Building2,
    RefreshCcw
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItemClass = (isActive: boolean) =>
        twMerge(
            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium',
            isActive
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        );

    const roleDisplayName = () => {
        switch (user?.role) {
            case 'admin': return 'مدير النظام';
            case 'gm_supply': return 'مدير عام التموين';
            case 'manager': return 'مدير الإدارة';
            case 'storekeeper': return 'أمين المستودع';
            default: return 'طالب المادة';
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-800">
            {/* Sidebar */}
            <div className="w-72 bg-white border-l border-slate-200 shadow-sm flex flex-col pt-6 pb-4">
                <div className="px-6 mb-8 flex items-center justify-center">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 text-center">إدارة التموين</h1>
                        <p className="text-xs text-slate-500 text-center">نظام المستودعات العام</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                    <NavLink to="/" end className={({ isActive }) => navItemClass(isActive)}>
                        <LayoutDashboard size={20} />
                        لوحة القيادة
                    </NavLink>

                    {(['admin', 'storekeeper', 'manager', 'gm_supply'].includes(user?.role || '')) && (
                        <NavLink to="/inventory" className={({ isActive }) => navItemClass(isActive)}>
                            <Package size={20} />
                            المخزون والأصناف
                        </NavLink>
                    )}

                    <NavLink to="/requests" className={({ isActive }) => navItemClass(isActive)}>
                        <ClipboardList size={20} />
                        {user?.role === 'requester' ? 'طلباتي' : 'إدارة الطلبات'}
                    </NavLink>

                    {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'gm_supply') && (
                        <NavLink to="/reports" className={({ isActive }) => navItemClass(isActive)}>
                            <FileText size={20} />
                            التقارير وسجل الحركة
                        </NavLink>
                    )}

                    <NavLink to="/returns" className={({ isActive }) => navItemClass(isActive)}>
                        <RefreshCcw size={20} />
                        الرجيع والتالف
                    </NavLink>

                    {/* Admin-only section */}
                    {user?.role === 'admin' && (
                        <>
                            <div className="pt-3 pb-1 px-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إدارة النظام</p>
                            </div>
                            <NavLink to="/users" className={({ isActive }) => navItemClass(isActive)}>
                                <Users size={20} />
                                المستخدمون
                            </NavLink>
                            <NavLink to="/departments" className={({ isActive }) => navItemClass(isActive)}>
                                <Building2 size={20} />
                                الإدارات والجهات
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="px-4 mt-auto">
                    <div className="p-4 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                        <p className="text-sm font-semibold truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{roleDisplayName()}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100"
                    >
                        <LogOut size={18} />
                        تسجيل الخروج
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-800">نظام إدارة المستودعات المتكامل</h2>
                </header>
                <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
