import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Plus, RefreshCw, AlertCircle, LayoutGrid } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState('checking');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [students, setStudents] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', role: 'teacher', name: '', mobile: '' });
  const [newStudent, setNewStudent] = useState({ name: '', class_id: '', parent_id: '', roll_number: '' });
  const [newClass, setNewClass] = useState({ name: '', section: 'A', teacher_id: '' });

  const token = localStorage.getItem('token');

  const fetchData = async () => {
    try {
      const [uRes, cRes, sRes, hRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/classes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/admin/students', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/health')
      ]);
      
      const [uData, cData, sData, hData] = await Promise.all([uRes.json(), cRes.json(), sRes.json(), hRes.json()]);
      
      setUsers(Array.isArray(uData) ? uData : []);
      setClasses(Array.isArray(cData) ? cData : []);
      setStudents(Array.isArray(sData) ? sData : []);
      setDbStatus(hData.db === 'connected' ? 'connected' : 'error');
    } catch (err) {
      console.error(err);
      setDbStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setShowAddUser(false);
        setNewUser({ username: '', role: 'teacher', name: '', mobile: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [seedMessage, setSeedMessage] = useState(null);

  const handleSeedData = async () => {
    setSeedMessage({ type: 'info', text: 'Seeding in progress...' });
    try {
      const res = await fetch('/api/admin/seed-demo', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage({ type: 'success', text: data.message });
        fetchData();
        setTimeout(() => setSeedMessage(null), 5000);
      } else {
        setSeedMessage({ type: 'error', text: data.error || 'Server error' });
      }
    } catch (err) {
      setSeedMessage({ type: 'error', text: 'Network error while seeding.' });
    }
  };

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  const SidebarItem = ({ icon: Icon, label, id }) => (
    <button
      onClick={() => setActiveView(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
        activeView === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
          : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="font-bold">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      {/* Sidebar */}
      <div className="w-full lg:w-64 space-y-2">
        <SidebarItem icon={LayoutGrid} label="Dashboard" id="overview" />
        <SidebarItem icon={Users} label="Teachers" id="teachers" />
        <SidebarItem icon={Users} label="Parents" id="parents" />
        <SidebarItem icon={GraduationCap} label="Students" id="students" />
        <SidebarItem icon={BookOpen} label="Classes" id="classes" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8">
        {seedMessage && (
          <div className={`fixed top-20 right-4 z-[100] px-6 py-4 rounded-2xl shadow-xl transition-all border ${
            seedMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
            seedMessage.type === 'info' ? 'bg-blue-50 text-blue-600 border-blue-100' :
            'bg-green-50 text-green-600 border-green-100'
          }`}>
            <p className="font-bold">{seedMessage.text}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 italic serif tracking-tight capitalize">
              {activeView === 'overview' ? 'Admin Control Center' : `${activeView} Management`}
            </h1>
            <p className="text-gray-500">
              {activeView === 'overview' ? 'Manage the digital ecosystem and stakeholders' : `Manage and monitor all ${activeView} in the system`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {dbStatus === 'error' && (
              <div className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium animate-pulse">
                <AlertCircle className="h-4 w-4 mr-2" />
                DB Error
              </div>
            )}
            <button 
              onClick={handleSeedData}
              className="flex items-center space-x-2 bg-amber-50 text-amber-600 border border-amber-100 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-amber-100 transition-all disabled:opacity-50"
              disabled={dbStatus === 'checking' || (seedMessage && seedMessage.type === 'info')}
            >
              <RefreshCw className={`h-4 w-4 ${seedMessage?.type === 'info' ? 'animate-spin' : ''}`} />
              <span>Seed Demo</span>
            </button>
            <button 
              onClick={() => setShowAddClass(true)}
              className="flex items-center space-x-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Class</span>
            </button>
            <button 
              onClick={() => setShowAddStudent(true)}
              className="flex items-center space-x-2 bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Student</span>
            </button>
            <button 
              onClick={() => setShowAddUser(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>User</span>
            </button>
          </div>
        </div>

        {activeView === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={<Users className="text-blue-500" />} label="Total Faculty" value={users.filter(u => u.role === 'teacher').length} />
              <StatCard icon={<GraduationCap className="text-purple-500" />} label="Total Parents" value={users.filter(u => u.role === 'parent').length} />
              <StatCard icon={<BookOpen className="text-orange-500" />} label="Active Classes" value={classes.length} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h2 className="font-bold text-xl">Recent Faculty & Parents</h2>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.slice(0, 5).map(user => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{user.name}</td>
                        <td className="px-6 py-4 text-xs font-bold uppercase">{user.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50">
                  <h2 className="font-bold text-xl">Registered Students</h2>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Student Name</th>
                      <th className="px-6 py-4">Class</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.slice(0, 5).map(student => (
                      <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium">{student.name}</td>
                        <td className="px-6 py-4 text-sm font-bold uppercase">{student.class_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeView === 'teachers' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h2 className="text-2xl font-bold">Faculty Members</h2>
                <p className="text-gray-500">List of all teaching staff in the system</p>
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-8 py-5">Name</th>
                    <th className="px-8 py-5">Mobile (Username)</th>
                    <th className="px-8 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => u.role === 'teacher').map(t => (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-8 py-6 font-bold text-gray-800">{t.name}</td>
                      <td className="px-8 py-6 font-mono text-indigo-600">{t.mobile}</td>
                      <td className="px-8 py-6">
                        {t.first_login ? <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold">Pending</span> : <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-xs font-bold">Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {activeView === 'parents' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h2 className="text-2xl font-bold">Parents Directory</h2>
                <p className="text-gray-500">Parent accounts linked to active students</p>
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-8 py-5">Name</th>
                    <th className="px-8 py-5">Mobile</th>
                    <th className="px-8 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => u.role === 'parent').map(p => (
                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-8 py-6 font-bold text-gray-800">{p.name}</td>
                      <td className="px-8 py-6 font-mono text-indigo-600">{p.mobile}</td>
                      <td className="px-8 py-6">
                        {p.first_login ? <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-xs font-bold">Pending</span> : <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-xs font-bold">Active</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {activeView === 'students' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-8 border-b border-gray-50">
                <h2 className="text-2xl font-bold">Students Record</h2>
                <p className="text-gray-500">Official student enrollment data</p>
             </div>
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-8 py-5">Student Name</th>
                    <th className="px-8 py-5">Grade / Section</th>
                    <th className="px-8 py-5">Roll No.</th>
                    <th className="px-8 py-5">Parent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-8 py-6 font-bold text-gray-800">{s.name}</td>
                      <td className="px-8 py-6 font-medium text-indigo-600 uppercase italic text-xs">{s.class_name} - {s.section}</td>
                      <td className="px-8 py-6 font-mono text-gray-500">{s.roll_number}</td>
                      <td className="px-8 py-6 text-gray-600 font-medium">{s.parent_name}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}

        {activeView === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map(c => {
               const teacher = users.find(u => u.id === c.teacher_id);
               const studentCount = students.filter(s => s.class_id === c.id).length;
               return (
                <div key={c.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-indigo-50 p-4 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-black text-gray-100 group-hover:text-indigo-100 transition-colors">SEC {c.section}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{c.name}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2" />
                      <span>{studentCount} Students Enrolled</span>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Class Teacher</p>
                      <p className="font-bold text-indigo-600">{teacher ? teacher.name : 'Unassigned'}</p>
                    </div>
                  </div>
                </div>
               );
            })}
          </div>
        )}
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">Register New User</h3>
            {/* ... form content here ... */}
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mobile Number (Username)</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none"
                  value={newUser.mobile}
                  onChange={e => setNewUser({...newUser, mobile: e.target.value, username: e.target.value})}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Register User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">Enroll New Student</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/students', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(newStudent)
                });
                if (res.ok) {
                  setShowAddStudent(false);
                  setNewStudent({ name: '', class_id: '', parent_id: '', roll_number: '' });
                  fetchData();
                }
              } catch (err) { console.error(err); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Student Name</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Class</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.class_id} onChange={e => setNewStudent({...newStudent, class_id: e.target.value})}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Parent</label>
                  <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.parent_id} onChange={e => setNewStudent({...newStudent, parent_id: e.target.value})}>
                    <option value="">Select Parent</option>
                    {users.filter(u => u.role === 'parent').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Roll Number</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newStudent.roll_number} onChange={e => setNewStudent({...newStudent, roll_number: e.target.value})} />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddStudent(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddClass && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">Create New Class</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/classes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(newClass)
                });
                if (res.ok) {
                  setShowAddClass(false);
                  setNewClass({ name: '', section: 'A', teacher_id: '' });
                  fetchData();
                }
              } catch (err) { console.error(err); }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Grade / Class Name</label>
                <select required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})}>
                  <option value="">Select Grade</option>
                  {['ECD', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                    <option key={g} value={`Class ${g}`}>Class {g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input type="text" required placeholder="e.g. A, B, Blue, Red" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.section} onChange={e => setNewClass({...newClass, section: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Class Teacher</label>
                <select className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 outline-none" value={newClass.teacher_id} onChange={e => setNewClass({...newClass, teacher_id: e.target.value})}>
                  <option value="">Select Teacher (Optional)</option>
                  {users.filter(u => u.role === 'teacher').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setShowAddClass(false)} className="flex-1 py-4 bg-gray-100 rounded-xl font-bold text-gray-600 focus:ring-2 focus:ring-gray-300">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold text-white shadow-lg shadow-indigo-100 transform active:scale-95 transition-all">Create Class</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4">
      <div className="p-4 bg-gray-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
