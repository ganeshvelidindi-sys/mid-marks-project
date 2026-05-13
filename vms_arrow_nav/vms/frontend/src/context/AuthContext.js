import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token     = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const parsedUser = JSON.parse(savedUser);
      // Restore HOD dept header if they were logged in as HOD
      if (parsedUser.role === 'hod' && parsedUser.department?._id) {
        axios.defaults.headers.common['x-hod-dept'] = parsedUser.department._id;
      }
      setUser(parsedUser);
    }
    setLoading(false);
  }, []);

  // loginAs: 'faculty' | 'hod' (optional, for dual-role users)
  // hodDeptId: specific dept ID when acting as HOD of specific dept
  const login = async (rollNumber, password, tabType, loginAs, hodDeptId) => {
    const res = await axios.post('/api/auth/login', { rollNumber, password, tabType, loginAs, hodDeptId });
    const data = res.data;

    // Not yet authenticated — need role/dept selection
    if (data.requiresRoleSelection || data.requiresDeptSelection) {
      return data;
    }

    const { token, user: userData } = data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // If logging in as HOD, set dept header for HOD API calls
    if (userData.role === 'hod' && userData.department?._id) {
      axios.defaults.headers.common['x-hod-dept'] = userData.department._id;
    }
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['x-hod-dept'];
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res     = await axios.get('/api/auth/me');
      const updated = res.data.user;
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch (_) {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
