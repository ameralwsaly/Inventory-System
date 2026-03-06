import React, { useEffect, useState } from 'react';
import { PackageSearch, FolderOutput, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalItems: 0,
        lowStockCount: 0,
        pendingRequests: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch low stock items & total items only if user is admin/storekeeper
                if (user?.role === 'admin' || user?.role === 'storekeeper' || user?.role === 'gm_supply') {
                    const itemsRes = await api.get('/items');
                    const items = itemsRes.data;
                    const lowStock = items.filter((item: any) => item.quantity <= item.min_limit);

                    setStats(prev => ({
                        ...prev,
                        totalItems: items.length,
                        lowStockCount: lowStock.length,
                    }));
                }

                // Fetch pending requests
                const reqRes = await api.get('/requests');
                const pendingCount = reqRes.data.filter((r: any) => r.status.includes('pending')).length;

                setStats(prev => ({ ...prev, pendingRequests: pendingCount }));
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [user]);

    const StatCard = ({ title, value, icon, colorClass, subtitle }: any) => (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
                </div>
                {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
            </div>
            <div className={`p-4 rounded-2xl ${colorClass}`}>
                {icon}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">أهلاً بك، {user?.name} 👋</h1>
                    <p className="text-slate-500 mt-1">إليك نظرة عامة على حالة النظام اليوم.</p>
                </div>
                <div className="text-sm px-4 py-2 bg-white rounded-full font-medium shadow-sm border border-slate-200">
                    <span className="text-slate-500 mr-2">تاريخ اليوم:</span>
                    <span className="text-slate-800">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-slate-200 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(user?.role === 'admin' || user?.role === 'storekeeper' || user?.role === 'gm_supply') && (
                        <>
                            <StatCard
                                title="إجمالي الأصناف"
                                value={stats.totalItems}
                                icon={<PackageSearch size={24} className="text-primary-600" />}
                                colorClass="bg-primary-50 text-blue-100"
                                subtitle="في جميع المستودعات"
                            />
                            <StatCard
                                title="أصناف وصلت للحد الأدنى"
                                value={stats.lowStockCount}
                                icon={<AlertTriangle size={24} className="text-amber-600" />}
                                colorClass="bg-amber-50"
                                subtitle="تتطلب إعادة طلب فورية"
                            />
                        </>
                    )}

                    <StatCard
                        title="الطلبات المعلقة"
                        value={stats.pendingRequests}
                        icon={<Clock size={24} className="text-indigo-600" />}
                        colorClass="bg-indigo-50"
                        subtitle={user?.role === 'requester' ? 'طلباتك بانتظار الموافقة' : 'بانتظار الإجراء'}
                    />
                </div>
            )}

            <div className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 min-h-[400px]">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 rounded-lg">
                        <FolderOutput size={20} className="text-slate-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">نشاطات أخيرة</h3>
                </div>
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                    <FolderOutput size={48} className="mb-4 text-slate-200" />
                    <p>لا توجد نشاطات حديثة لعرضها حالياً</p>
                    <p className="text-sm mt-2">ستظهر آخر التحركات والطلبات المعالجة هنا.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
