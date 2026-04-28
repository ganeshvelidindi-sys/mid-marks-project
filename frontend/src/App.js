import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import HODDashboard from './pages/HODDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import ClassTeacherDashboard from './pages/ClassTeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#001852',color:'#c9973a',fontSize:'18px',fontFamily:'Outfit,sans-serif'}}>Loading VEMU System…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/*" element={<PrivateRoute roles={['admin']}><AdminDashboard /></PrivateRoute>} />
      <Route path="/hod/*" element={<PrivateRoute roles={['hod']}><HODDashboard /></PrivateRoute>} />
      <Route path="/faculty/*" element={<PrivateRoute roles={['faculty', 'classteacher', 'hod']}><FacultyDashboard /></PrivateRoute>} />
      <Route path="/classteacher/*" element={<PrivateRoute roles={['classteacher']}><ClassTeacherDashboard /></PrivateRoute>} />
      <Route path="/student/*" element={<PrivateRoute roles={['student']}><StudentDashboard /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'Outfit,sans-serif', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' },
          success: { iconTheme: { primary: '#001852', secondary: '#fff' } }
        }} />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
