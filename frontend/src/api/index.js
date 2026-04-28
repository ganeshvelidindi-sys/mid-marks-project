import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('vemu_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// AUTH
export const login = (data) => API.post('/auth/login', data);
export const changePassword = (data) => API.post('/auth/change-password', data);

// USERS
export const getUsers = (params) => API.get('/users', { params });
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const deleteUser = (id) => API.delete(`/users/${id}`);
export const getFacultyList = () => API.get('/users/by-role/faculty');
export const getClassTeacherList = () => API.get('/users/by-role/classteacher');
export const assignClassTeacher = (data) => API.post('/users/assign-classteacher', data);
export const removeClassTeacher = (data) => API.post('/users/remove-classteacher', data);

// STUDENTS
export const getStudents = (params) => API.get('/students', { params });
export const createStudent = (data) => API.post('/students', data);
export const bulkCreateStudents = (data) => API.post('/students/bulk', data);
export const updateStudent = (id, data) => API.put(`/students/${id}`, data);
export const deleteStudent = (id) => API.delete(`/students/${id}`);

// MARKS
export const getMarks = (params) => API.get('/marks', { params });
export const getMyMarks = () => API.get('/marks/student/me');
export const saveMarks = (data) => API.post('/marks/save', data);
export const submitMarks = (data) => API.post('/marks/submit', data);
export const approveMarks = (data) => API.post('/marks/approve', data);
export const rejectMarks = (data) => API.post('/marks/reject', data);
export const getMarkStats = () => API.get('/marks/stats/summary');

// SETTINGS
export const getSettings = () => API.get('/settings');
export const updateSettings = (data) => API.put('/settings', data);

// REPORTS
export const getClassReport = (params) => API.get('/reports/class', { params });
export const getSubjectReport = (params) => API.get('/reports/subject', { params });
export const getDepartmentReport = () => API.get('/reports/department');

// ACTIVITY MONITOR
export const getActivityOnline = () => API.get('/activity/online');
export const getActivityUsers = (params) => API.get('/activity/users', { params });
export const getActivityLogs = (params) => API.get('/activity/logs', { params });
export const getActivityStats = () => API.get('/activity/stats');

export default API;
