import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ChangePasswordModal from './components/ChangePasswordModal';

import Login             from './pages/Login';
import AdminDashboard    from './pages/admin/AdminDashboard';
import AdminDepartments  from './pages/admin/AdminDepartments';
import AdminUsers        from './pages/admin/AdminUsers';
import AdminReports      from './pages/admin/AdminReports';
import AdminSections     from './pages/admin/AdminSections';
import HodDashboard      from './pages/hod/HodDashboard';
import HodSubjects       from './pages/hod/HodSubjects';
import HodMarks          from './pages/hod/HodMarks';
import HodPromote        from './pages/hod/HodPromote';
import HodReports        from './pages/hod/HodReports';
import FacultyDashboard   from './pages/faculty/FacultyDashboard';
import FacultyEnterMarks  from './pages/faculty/FacultyEnterMarks';
import FacultyViewMarks   from './pages/faculty/FacultyViewMarks';
import FacultyFinalMarks  from './pages/faculty/FacultyFinalMarks';
import FacultyReports     from './pages/faculty/FacultyReports';
import StudentDashboard  from './pages/student/StudentDashboard';
import StudentMarks      from './pages/student/StudentMarks';
import StudentReports    from './pages/student/StudentReports';
import Layout            from './components/Layout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!user)   return <Navigate to="/login" replace />;
  // Support faculty acting as HOD (role stored as 'hod' in session)
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  if (user.mustChangePassword) {
    return <ChangePasswordModal forced={true} />;
  }
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const routes = { admin: '/admin', hod: '/hod', faculty: '/faculty', student: '/student' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/"      element={<RoleRedirect />} />

      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
        <Route index              element={<AdminDashboard />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="users"       element={<AdminUsers />} />
        <Route path="sections"    element={<AdminSections />} />
        <Route path="reports"     element={<AdminReports />} />
      </Route>

      {/* HOD routes — role in session is 'hod' (faculty acting as HOD) */}
      <Route path="/hod" element={<ProtectedRoute roles={['hod']}><Layout /></ProtectedRoute>}>
        <Route index          element={<HodDashboard />} />
        <Route path="subjects" element={<HodSubjects />} />
        <Route path="marks"    element={<HodMarks />} />
        <Route path="promote"  element={<HodPromote />} />
        <Route path="reports"  element={<HodReports />} />
      </Route>

      <Route path="/faculty" element={<ProtectedRoute roles={['faculty']}><Layout /></ProtectedRoute>}>
        <Route index               element={<FacultyDashboard />} />
        <Route path="enter-marks"  element={<FacultyEnterMarks />} />
        <Route path="view-marks"   element={<FacultyViewMarks />} />
        <Route path="final-marks"  element={<FacultyFinalMarks />} />
        <Route path="reports"      element={<FacultyReports />} />
      </Route>

      <Route path="/student" element={<ProtectedRoute roles={['student']}><Layout /></ProtectedRoute>}>
        <Route index       element={<StudentDashboard />} />
        <Route path="marks"   element={<StudentMarks />} />
        <Route path="reports" element={<StudentReports />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} />
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
