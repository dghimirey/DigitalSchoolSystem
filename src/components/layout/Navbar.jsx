import React from 'react';
import { LogOut, GraduationCap, LayoutDashboard, Brain, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center group">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="ml-3 font-black italic text-xl tracking-tighter uppercase text-indigo-900 hidden sm:inline-block">Digital School System</span>
          </Link>

          {user && (
            <div className="flex items-center space-x-6">
              <div className="hidden md:flex items-center space-x-1 text-sm font-medium text-gray-600">
                <LayoutDashboard className="h-4 w-4" />
                <span>{user.role.toUpperCase()}</span>
              </div>
              <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.username}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
