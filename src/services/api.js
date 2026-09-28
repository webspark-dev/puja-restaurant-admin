import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me')
};

export const dashboardAPI = {
  stats: () => api.get('/api/admin/dashboard/stats'),
  daybook: (date) => api.get(`/api/admin/dashboard/daybook?date=${date}`)
};

export const ordersAPI = {
  live: () => api.get('/api/admin/orders/live'),
  cashPending: () => api.get('/api/admin/orders/cash-pending'),
  history: (limit = 50, offset = 0) => 
    api.get(`/api/admin/orders/history?limit=${limit}&offset=${offset}`),
  confirmCash: (orderId, cashReceived) => 
    api.post(`/api/admin/orders/${orderId}/confirm-cash`, { cash_received: cashReceived }),
  updateStatus: (orderId, status, note) => 
    api.patch(`/api/admin/orders/${orderId}/status`, { status, note }),
  getBillUrl: (orderId) => `${API_URL}/api/admin/orders/${orderId}/bill`
};

export const kitchenAPI = {
  orders: () => api.get('/api/admin/kitchen/orders')
};

export const menuAPI = {
  getMenu: () => api.get('/api/menu?restaurant_id=' + (localStorage.getItem('restaurantId') || 'b07af312-2c05-46c9-bf85-044e2620aacf')),
  getCategories: () => api.get('/api/menu/categories'),
  createCategory: (data) => api.post('/api/menu/categories', data),
  updateCategory: (id, data) => api.put(`/api/menu/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/api/menu/categories/${id}`),
  createItem: (data) => api.post('/api/menu/items', data),
  updateItem: (id, data) => api.put(`/api/menu/items/${id}`, data),
  deleteItem: (id) => api.delete(`/api/menu/items/${id}`),
  toggleItem: (id) => api.patch(`/api/menu/items/${id}/toggle`),
  
  // Image upload
  uploadImage: (file, itemName) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('item_name', itemName || 'item');
    
    return api.post('/api/menu/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteImage: (imageUrl) => api.post('/api/menu/delete-image', { image_url: imageUrl })
};

export const reportsAPI = {
  sales: (from, to) => api.get(`/api/reports/sales?from=${from}&to=${to}`),
  topItems: (from, to, limit = 20) => api.get(`/api/reports/top-items?from=${from}&to=${to}&limit=${limit}`),
  hourly: (date) => api.get(`/api/reports/hourly?date=${date}`),
  paymentBreakdown: (from, to) => api.get(`/api/reports/payment-breakdown?from=${from}&to=${to}`),
  rolling30: () => api.get('/api/reports/rolling-30')
};

export const settingsAPI = {
  get: () => api.get('/api/settings'),
  updateRestaurant: (data) => api.put('/api/settings/restaurant', data),
  updateBusiness: (data) => api.put('/api/settings/business', data),
  profile: () => api.get('/api/settings/profile'),
  updateProfile: (data) => api.put('/api/settings/profile', data),
  changePassword: (currentPassword, newPassword) => 
    api.post('/api/settings/change-password', { 
      current_password: currentPassword, 
      new_password: newPassword 
    }),
  getStaff: () => api.get('/api/settings/staff'),
  createStaff: (data) => api.post('/api/settings/staff', data),
  updateStaff: (id, data) => api.put(`/api/settings/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/api/settings/staff/${id}`),
  auditLog: (limit = 50) => api.get(`/api/settings/audit-log?limit=${limit}`)
};

export const orderingAPI = {
  toggle: (enabled, pauseMessage) => 
    api.post('/api/admin/ordering/toggle', { enabled, pause_message: pauseMessage }),
  status: () => api.get('/api/admin/ordering/status'),
  schedule: (data) => api.post('/api/admin/ordering/schedule', data)
};
export const backupAPI = {
  info: () => api.get('/api/backup/info'),
  exportUrl: (from, to) => {
    const baseURL = '';
    return `${baseURL}/api/backup/export?from=${from}&to=${to}`;
  }
};