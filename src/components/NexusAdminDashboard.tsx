import React, { useState } from 'react';
import { Users, Activity, DollarSign, Settings, LogOut, Search, Bell, Menu, X } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

export const NexusAdminDashboard = () => {
  const { currentUser, logout } = useCRM();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const stats = [
    { title: 'Total Users', value: '1,248', icon: Users, change: '+12%', changeType: 'positive' },
    { title: 'Active Sessions', value: '42', icon: Activity, change: '+5%', changeType: 'positive' },
    { title: 'MRR', value: '$12,400', icon: DollarSign, change: '+18%', changeType: 'positive' },
  ];

  const recentUsers = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', role: 'Manager', status: 'Active' },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Active' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'Manager', status: 'Active' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className={`bg-gray-900 text-white w-64 flex-shrink-0 transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-20 h-full`}>
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wider">NEXUS ADMIN</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="mt-8">
          <a href="#" className="flex items-center px-6 py-3 bg-gray-800 text-white border-l-4 border-indigo-500">
            <Activity className="mr-3" size={20} />
            Overview
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <Users className="mr-3" size={20} />
            User Management
          </a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <Settings className="mr-3" size={20} />
            System Settings
          </a>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
          <button onClick={logout} className="flex items-center w-full px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors">
            <LogOut className="mr-3" size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className={`mr-4 text-gray-500 hover:text-gray-700 md:hidden ${isSidebarOpen ? 'hidden' : 'block'}`}>
                <Menu size={24} />
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-gray-600 relative">
                <Bell size={20} />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {currentUser?.name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{currentUser?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
            <p className="text-gray-500 text-sm mt-1">Welcome back, {currentUser?.name}. Here's what's happening today.</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Icon size={24} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <span className={`font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-gray-500 ml-2">from last month</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Users Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Recent Users</h3>
              <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Role</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
