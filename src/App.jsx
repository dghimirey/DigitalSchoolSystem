import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Login from './components/auth/Login';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import ParentDashboard from './components/parent/ParentDashboard';
import { io } from 'socket.io-client';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      // Decode or fetch user info if needed
      // For now we assume user object is stored in localStorage
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser) {
        setUser(storedUser);
      }
    }
  }, [token]);

  useEffect(() => {
    if (user && user.role === 'parent') {
      const newSocket = io(window.location.origin);
      newSocket.emit('join_parent', user.id);
      setSocket(newSocket);
      return () => newSocket.close();
    }
  }, [user]);

  const login = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const updateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (user && user.firstLogin) {
      setShowPasswordChange(true);
    }
  }, [user]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        setShowPasswordChange(false);
        const updatedUser = { ...user, firstLogin: false };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        alert('Password updated successfully');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Navbar user={user} onLogout={logout} />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/login" element={!user ? <Login onLogin={login} /> : <Navigate to="/" />} />
            <Route path="/" element={
              user ? (
                user.role === 'admin' ? <AdminDashboard /> :
                user.role === 'teacher' ? <TeacherDashboard user={user} onUpdateUser={updateUser} /> :
                <ParentDashboard user={user} socket={socket} onUpdateUser={updateUser} />
              ) : <Navigate to="/login" />
            } />
          </Routes>
        </main>

        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2">Secure Your Account</h2>
              <p className="text-gray-500 mb-8">This is your first login. Please set a new personal password to continue.</p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <input 
                  type="password" 
                  required 
                  placeholder="Enter New Password"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-center text-lg"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">
                  Update & Continue
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}
