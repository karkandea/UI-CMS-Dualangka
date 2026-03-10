const Dashboard = () => {
    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Works</p>
                    <p className="text-3xl font-bold text-slate-900">12</p>
                </div>
                <div className="flex flex-col justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Published Articles</p>
                    <p className="text-3xl font-bold text-slate-900">45</p>
                </div>
                <div className="flex flex-col justify-center p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Active Drafts</p>
                    <p className="text-3xl font-bold text-slate-900">3</p>
                </div>
            </div>

            <div className="flex items-center justify-center h-64 mb-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <p className="text-lg text-slate-400 font-medium">Analytics Chart Placeholder</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex items-center justify-center h-48 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-slate-400 font-medium">Recent Activity</p>
                </div>
                <div className="flex items-center justify-center h-48 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-slate-400 font-medium">System Status</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;