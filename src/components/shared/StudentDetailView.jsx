import React from 'react';
import { Award, Star, TrendingUp, Zap, Target, CheckCircle2, History, Brain, Calendar, Bell, GraduationCap, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

export default function StudentDetailView({ student, stats }) {
  if (!student || !stats) return null;

  // Derived Analytics & Gamification
  const streak = stats.streak || 0;
  
  const getAssignmentStats = () => {
    const assignments = Array.isArray(stats.assignments) ? stats.assignments : [];
    const done = parseInt(assignments.find(a => a.status === 'submitted')?.count || 0);
    const total = stats.totalAssignments || assignments.reduce((acc, curr) => acc + parseInt(curr.count), 0);
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  const homeworkRate = getAssignmentStats();

  const getStreakLabel = () => {
    if (streak >= 30) return "Legendary";
    if (streak >= 14) return "Unstoppable";
    if (streak >= 7) return "On Fire";
    if (streak >= 3) return "Steady";
    return streak > 0 ? "Building" : "Restarting";
  };

  const getImprovement = () => {
    const marks = Array.isArray(stats.marks) ? stats.marks : [];
    if (marks.length < 2) return null;
    const last = marks[marks.length - 1];
    const prev = marks[marks.length - 2];
    const lastPct = (last.score / (last.total_marks || 100)) * 100;
    const prevPct = (prev.score / (prev.total_marks || 100)) * 100;
    return Math.round(lastPct - prevPct);
  };

  const improvement = getImprovement();

  const getBadgeTier = (value, milestones) => {
    const tiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const earnedIdx = milestones.filter(m => value >= m).length - 1;
    const nextIdx = milestones.findIndex(m => value < m);
    
    return {
      tier: earnedIdx >= 0 ? tiers[earnedIdx] : null,
      nextGoal: nextIdx !== -1 ? milestones[nextIdx] : milestones[milestones.length - 1],
      isMaxed: nextIdx === -1
    };
  };

  const streakMilestones = [3, 7, 14, 30];
  const scoreMilestones = [80, 90, 95, 100];
  const hwMilestones = [60, 80, 90, 100];
  const growthMilestones = [5, 10, 15, 20];

  const marks = Array.isArray(stats.marks) ? stats.marks : [];
  
  const maxScoreObj = marks.length > 0 
    ? marks.reduce((prev, curr) => {
        const prevPct = (prev.score / (prev.total_marks || 100)) * 100;
        const currPct = (curr.score / (curr.total_marks || 100)) * 100;
        return (currPct > prevPct) ? curr : prev;
      })
    : null;
  const maxScoreValue = maxScoreObj ? Math.round((maxScoreObj.score / (maxScoreObj.total_marks || 100)) * 100) : 0;
  const peakSubject = maxScoreObj?.subject || 'N/A';

  const streakInfo = getBadgeTier(streak, streakMilestones);
  const scoreInfo = getBadgeTier(maxScoreValue, scoreMilestones);
  const hwInfo = getBadgeTier(homeworkRate, hwMilestones);
  const growthInfo = getBadgeTier(improvement || 0, growthMilestones);
  
  const badges = [
    { 
      id: 'stellar', 
      label: 'Stellar Attendee', 
      earned: streakInfo.tier !== null,
      tier: streakInfo.tier,
      icon: <Zap className={`h-5 w-5 ${streakInfo.tier ? 'text-orange-500' : 'text-gray-400'}`} />,
      desc: streakInfo.tier ? `${streakInfo.tier} • ${streak} Days` : `Goal: ${streakInfo.nextGoal} Days`,
      subDesc: `Recent Attendance Streak`,
      progress: (streak / streakInfo.nextGoal) * 100
    },
    { 
      id: 'highflyer', 
      label: 'High Flyer', 
      earned: scoreInfo.tier !== null,
      tier: scoreInfo.tier,
      icon: <Award className={`h-5 w-5 ${scoreInfo.tier ? 'text-indigo-500' : 'text-gray-400'}`} />,
      desc: scoreInfo.tier ? `${scoreInfo.tier} • ${maxScoreValue}%` : `Goal: ${scoreInfo.nextGoal}%`,
      subDesc: `Peak: ${peakSubject}`,
      progress: Math.min(100, (maxScoreValue / scoreInfo.nextGoal) * 100)
    },
    { 
      id: 'disciplined', 
      label: 'Disciplined', 
      earned: hwInfo.tier !== null,
      tier: hwInfo.tier,
      icon: <CheckCircle2 className={`h-5 w-5 ${hwInfo.tier ? 'text-green-500' : 'text-gray-400'}`} />,
      desc: hwInfo.tier ? `${hwInfo.tier} • ${homeworkRate}%` : `Goal: ${hwInfo.nextGoal}%`,
      subDesc: 'Assignment Completion',
      progress: Math.min(100, (homeworkRate / hwInfo.nextGoal) * 100)
    },
    { 
      id: 'rising', 
      label: 'Rising Star', 
      earned: growthInfo.tier !== null,
      tier: growthInfo.tier,
      icon: <TrendingUp className={`h-5 w-5 ${growthInfo.tier ? 'text-blue-500' : 'text-gray-400'}`} />,
      desc: growthInfo.tier ? `${growthInfo.tier} • +${improvement || 0}%` : `Goal: +${growthInfo.nextGoal}%`,
      subDesc: 'Growth Rate',
      progress: Math.min(100, ((improvement || 0) / growthInfo.nextGoal) * 100)
    }
  ];

  const earnedCount = badges.filter(b => b.earned).length;

  const attendance = Array.isArray(stats.attendance) ? stats.attendance : [];
  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.find(a => a.status === 'present')?.count || 0) / attendance.reduce((acc, curr) => acc + parseInt(curr.count), 0) * 100) 
    : 0;

  const averageScore = marks.length > 0
    ? (() => {
        const totalScore = marks.reduce((acc, curr) => acc + curr.score, 0);
        const totalMarksPossible = marks.reduce((acc, curr) => acc + (curr.total_marks || 100), 0);
        return totalMarksPossible > 0 ? Math.round((totalScore / totalMarksPossible) * 100) : 0;
      })()
    : 0;

  const processMarksForChart = () => {
    const dataByMonth = {};
    const subjects = new Set();
    marks.forEach(m => {
      if (!dataByMonth[m.exam_month]) {
        dataByMonth[m.exam_month] = { exam_month: m.exam_month };
      }
      const percentage = Math.round((m.score / (m.total_marks || 100)) * 100);
      dataByMonth[m.exam_month][m.subject] = percentage;
      subjects.add(m.subject);
    });
    return {
      chartData: Object.values(dataByMonth),
      subjectsList: Array.from(subjects)
    };
  };

  const { chartData, subjectsList } = processMarksForChart();
  const subjectColors = ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];

  const getHolisticProgress = () => {
    if (chartData.length === 0) return [];
    return chartData.map((monthData, idx) => {
      const subs = Object.keys(monthData).filter(k => k !== 'exam_month');
      const avgGPA = Math.round(subs.reduce((acc, sub) => acc + monthData[sub], 0) / (subs.length || 1));
      return {
        month: monthData.exam_month,
        GPA: avgGPA,
        Attendance: Math.min(100, 85 + (idx * 2)),
        Homework: Math.min(100, 70 + (idx * 5))
      };
    });
  };

  const holisticData = getHolisticProgress();

  const getRiskStatus = () => {
    const risks = [];
    if (attendanceRate > 0 && attendanceRate < 75) risks.push(`Critical Attendance: ${attendanceRate}% (Below 75%)`);
    if (averageScore > 0 && averageScore < 40) risks.push(`Low Academic Standing: ${averageScore}% Average`);
    if (improvement !== null && improvement < -10) risks.push(`Performance Slump: Scores dropped by ${Math.abs(improvement)}% recently`);
    return risks;
  };

  const riskFactors = getRiskStatus();
  const isAtRisk = riskFactors.length > 0;

  const getInsights = () => {
    if (marks.length === 0 || subjectsList.length === 0) return null;
    const subjectAves = {};
    const failureSubjects = [];

    subjectsList.forEach(sub => {
      const subMarks = marks.filter(m => m.subject === sub);
      const avg = subMarks.reduce((acc, curr) => acc + (curr.score / (curr.total_marks || 100)), 0) / subMarks.length;
      subjectAves[sub] = avg;

      // Check for failure in the latest exam
      const latestExam = subMarks[subMarks.length - 1];
      if (latestExam && latestExam.pass_marks && latestExam.score < latestExam.pass_marks) {
        failureSubjects.push({
          name: sub,
          score: latestExam.score,
          pass: latestExam.pass_marks,
          total: latestExam.total_marks
        });
      }
    });

    const sortedEntries = Object.entries(subjectAves).sort((a, b) => a[1] - b[1]);

    return {
      weakest: sortedEntries[0][0],
      strongest: sortedEntries[sortedEntries.length - 1][0],
      isImproving: improvement > 0,
      failures: failureSubjects
    };
  };
  const insights = getInsights();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2.5rem] p-4 sm:p-6 border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-600/5 -skew-x-12 translate-x-1/4 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-6">
          <div className="shrink-0 relative group">
            <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
            <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-5xl font-black italic shadow-2xl relative">
              {student.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-lg border border-gray-50">
               <GraduationCap className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div className="flex-1 text-center md:text-left space-y-6">
             <div>
                <div className="flex flex-col md:flex-row items-center md:items-end gap-3 mb-2">
                   <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase text-indigo-950 leading-none">{student.name}</h2>
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${attendanceRate > 85 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {attendanceRate > 85 ? 'Elite Rank' : 'Rising Rank'}
                   </span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                   <div className="px-4 py-2 bg-indigo-50/50 rounded-xl flex items-center gap-2 border border-indigo-100/50">
                      <Target className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-black text-indigo-900 uppercase">Class {student.class_name} • {student.section}</span>
                   </div>
                   <div className="px-4 py-2 bg-gray-50 rounded-xl flex items-center gap-2 border border-gray-100">
                      <History className="h-4 w-4 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Roll No: #{String(student.roll_number).padStart(3, '0')}</span>
                   </div>
                </div>
             </div>
             <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                   <div className="p-3 bg-orange-50 rounded-2xl">
                      <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Attendance</p>
                      <p className="text-2xl font-black text-indigo-950 italic leading-none">{attendanceRate}%</p>
                   </div>
                </div>
                <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                   <div className="p-3 bg-indigo-50 rounded-2xl">
                      <Award className="h-5 w-5 text-indigo-500" />
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Average</p>
                      <p className="text-2xl font-black text-indigo-950 italic leading-none">{averageScore}%</p>
                   </div>
                </div>
                {streak > 0 && (
                  <div className="flex items-center gap-5 bg-white p-5 rounded-[1.75rem] border border-gray-100 shadow-sm min-w-[160px] hover:scale-105 transition-transform duration-300">
                    <div className="p-3 bg-red-50 rounded-2xl">
                       <TrendingUp className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Streak</p>
                       <p className="text-2xl font-black text-indigo-950 italic leading-none">{streak}D</p>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {insights?.failures.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-center gap-3">
             <div className="p-3 bg-amber-500 rounded-2xl text-white">
                <Target size={24} />
             </div>
             <div>
                <h3 className="font-black text-xl uppercase tracking-tighter text-amber-900 italic">Needs Attention</h3>
                <p className="text-amber-700 text-xs font-bold uppercase tracking-widest">Pass marks not reached in some subjects</p>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.failures.map((f, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">{f.name}</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-red-500 italic leading-none">{f.score}</span>
                  <span className="text-xs font-bold text-gray-400 pb-1">/ {f.total}</span>
                </div>
                <p className="text-[9px] font-black text-amber-600 mt-2 uppercase tracking-tighter italic">Minimum: {f.pass} Required</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {isAtRisk && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-red-600 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-center gap-6 border-4 border-red-500 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150 pointer-events-none">
            <Bell size={120} />
          </div>
          <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md shrink-0">
            <TrendingUp className="h-10 w-10 text-white rotate-180" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xl font-black uppercase tracking-widest text-red-50 mb-1">Alert</h3>
            <p className="text-red-100 text-sm font-medium leading-relaxed max-w-md mx-auto sm:mx-0">
              {student.name}'s current performance shows some issues that need attention.
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              {riskFactors.map((risk, idx) => (
                <span key={idx} className="bg-red-800/40 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-red-400/30 backdrop-blur-sm">
                  • {risk}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Attendance" value={`${attendanceRate}%`} sub={attendanceRate > 75 ? 'Good' : 'Very Low'} trend={attendanceRate > 75 ? 'positive' : 'warning'} />
        <MetricCard label="Average" value={averageScore} sub="Academic Status" trend={improvement >= 0 ? 'positive' : 'negative'} />
        <div className={`p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl group relative overflow-hidden bg-white ${streak >= 7 ? 'ring-4 ring-orange-100' : ''}`}>
          {streak >= 7 && (
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
              <Zap size={100} className="text-orange-500 fill-orange-500" />
            </div>
          )}
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Streak</p>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-4xl font-black text-indigo-900 italic tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{streak}</p>
            <span className="text-xs font-black text-gray-400 uppercase tracking-tighter self-end pb-1 italic">Days</span>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${streak >= 7 ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : streak > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
               {streak >= 7 && <Zap size={10} className="fill-white" />}
               {getStreakLabel()}
            </div>
            {streak >= 7 && (
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-lg"
              >
                🔥
              </motion.div>
            )}
          </div>
        </div>
        <MetricCard label="Tasks" value={`${homeworkRate}%`} sub="Finished" trend={homeworkRate > 80 ? 'positive' : 'negative'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
           {/* Badges */}
           <div className="bg-indigo-50 p-6 sm:p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm space-y-6">
              <h3 className="font-black text-lg flex items-center gap-2 text-indigo-900 uppercase tracking-tighter italic">
                <Star className="text-amber-500 fill-amber-500 h-5 w-5" /> Achievements
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {badges.map(badge => (
                  <div key={badge.id} className={`relative bg-white p-5 rounded-2xl border transition-all duration-500 shadow-sm flex flex-col items-center text-center group ${badge.earned ? 'border-indigo-100 scale-100' : 'border-gray-50 bg-gray-50/30'}`}>
                    <div className={`p-3 rounded-full mb-3 ${badge.earned ? 'bg-indigo-50 animate-in fade-in zoom-in duration-700' : 'bg-gray-100 opacity-40'} group-hover:scale-110 transition-transform relative`}>
                      {React.cloneElement(badge.icon, { size: 20 })}
                      {badge.earned && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white"
                        >
                          <CheckCircle2 className="h-2 w-2 text-white" />
                        </motion.div>
                      )}
                    </div>
                    
                    <div className={badge.earned ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0 transition-all'}>
                      <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter leading-none">{badge.label}</p>
                      <p className="text-[9px] font-black text-indigo-600 mt-1 uppercase italic">{badge.desc}</p>
                      <p className="text-[7px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{badge.subDesc}</p>
                    </div>

                    {!badge.earned && (
                      <div className="w-full h-1 bg-gray-100 rounded-full mt-4 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${badge.progress}%` }}
                          className="h-full bg-indigo-300"
                        />
                      </div>
                    )}
                    
                    {badge.earned && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
           </div>

           {/* Live Feed */}
           <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
             <h3 className="font-black text-lg flex items-center gap-2 mb-6 uppercase tracking-tighter italic"><Bell className="text-red-500 h-5 w-5" /> Recent Updates</h3>
             <div className="space-y-4">
               {stats.alerts?.slice(0, 3).map((alert, i) => (
                 <div key={i} className="p-4 bg-gray-50 rounded-2xl text-[11px] font-bold border-l-4 border-indigo-500 leading-relaxed text-gray-600">
                   {alert.message}
                   <p className="text-[9px] mt-1 text-gray-400 font-medium">Recorded: {new Date(alert.created_at || Date.now()).toLocaleDateString()}</p>
                 </div>
               ))}
               {(!stats.alerts || stats.alerts.length === 0) && (
                 <div className="text-center py-8">
                   <CheckCircle2 className="h-10 w-10 text-gray-100 mx-auto mb-2" />
                   <p className="text-gray-300 text-xs font-black uppercase tracking-widest">No alerts</p>
                 </div>
               )}
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {/* Performance Chart */}
           <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
             <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-lg uppercase tracking-tighter italic">Marks Chart</h3>
               <div className="flex gap-1">
                 {subjectColors.slice(0, subjectsList.length).map((c, i) => (
                   <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }}></div>
                 ))}
               </div>
             </div>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                   <XAxis 
                     dataKey="exam_month" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                     dy={10} 
                   />
                   <YAxis 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} 
                     domain={[0, 100]} 
                   />
                   <Tooltip 
                     contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                     itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                   />
                   {subjectsList.map((sub, i) => (
                     <Line 
                       key={sub} 
                       type="monotone" 
                       dataKey={sub} 
                       stroke={subjectColors[i % subjectColors.length]} 
                       strokeWidth={4} 
                       dot={{r: 5, fill: subjectColors[i % subjectColors.length], strokeWidth: 2, stroke: '#fff'}} 
                       activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff' }}
                     />
                   ))}
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Growth Analytics */}
           <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
             <h3 className="font-black text-lg mb-8 flex items-center gap-2 uppercase tracking-tighter italic"><TrendingUp className="text-indigo-600 h-5 w-5" /> Progress Chart</h3>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={holisticData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                   <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} domain={[0, 100]} />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)' }}
                   />
                   <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                   <Bar dataKey="GPA" fill="#6366f1" radius={[10, 10, 0, 0]} barSize={24} />
                   <Bar dataKey="Attendance" fill="#f59e0b" radius={[10, 10, 0, 0]} barSize={24} />
                   <Bar dataKey="Homework" fill="#10b981" radius={[10, 10, 0, 0]} barSize={24} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>
        </div>
      </div>

      {/* Attendance Roadmap */}
      <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <h3 className="font-black text-lg mb-8 flex items-center gap-2 uppercase tracking-tighter italic"><Calendar className="text-indigo-600 h-5 w-5" /> Attendance Calendar</h3>
        <div className="grid grid-cols-7 gap-2">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">{d}</div>
          ))}
          {(() => {
            const today = new Date();
            const month = today.getMonth();
            const year = today.getFullYear();
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const attendanceMap = {};
            (stats.recentAttendance || []).forEach(a => {
              const d = new Date(a.date);
              const key = d.getUTCDate();
              attendanceMap[key] = a.status;
            });

            const cells = [];
            for(let i=0; i<firstDay; i++) cells.push(<div key={`e-${i}`} className="h-10 sm:h-12"></div>);
            for(let d=1; d<=daysInMonth; d++) {
              const status = attendanceMap[d];
              let color = 'bg-gray-50 text-gray-300 border-gray-100';
              if (status === 'present') color = 'bg-green-500 text-white border-green-400';
              else if (status === 'absent') color = 'bg-red-500 text-white border-red-400';
              else if (status === 'late') color = 'bg-yellow-400 text-white border-yellow-300';
              
              cells.push(
                <div key={d} className={`h-10 sm:h-12 rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black border shadow-sm transition-all hover:scale-110 ${color}`}>
                  {d}
                </div>
              );
            }
            return cells;
          })()}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, trend }) {
  const trendColor = trend === 'positive' ? 'text-green-500' : trend === 'warning' ? 'text-amber-500' : 'text-red-500';
  const bgColor = trend === 'positive' ? 'bg-green-50/50' : trend === 'warning' ? 'bg-amber-50/50' : 'bg-red-50/50';
  
  return (
    <div className={`p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all duration-500 hover:shadow-xl group relative overflow-hidden bg-white`}>
      <div className={`absolute bottom-0 left-0 h-1 w-full opacity-0 group-hover:opacity-100 transition-opacity ${trend === 'positive' ? 'bg-green-500' : trend === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-4xl font-black mt-2 text-indigo-900 italic tracking-tighter leading-none group-hover:scale-105 transition-transform origin-left">{value}</p>
      <div className="flex items-center gap-2 mt-4">
        <div className={`w-2 h-2 rounded-full ${trend === 'positive' ? 'bg-green-500' : trend === 'warning' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'}`}></div>
        <p className={`text-[9px] font-black uppercase italic tracking-tighter ${trendColor}`}>{sub}</p>
      </div>
    </div>
  );
}
