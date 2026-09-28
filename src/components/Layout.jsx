import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { connectSocket } from '../services/socket';
import { orderingAPI } from '../services/api';

export default function Layout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orderingEnabled, setOrderingEnabled] = useState(true);

  const user = JSON.parse(localStorage.getItem('adminUser') || '{}');

  useEffect(() => {
    connectSocket();
    loadOrderingStatus();
  }, []);

  const loadOrderingStatus = async () => {
    try {
      const res = await orderingAPI.status();
      setOrderingEnabled(res.data.ordering_enabled);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleOrdering = async () => {
    const newState = !orderingEnabled;
    const msg = newState
      ? 'Open ordering?'
      : 'Pause ordering? Customers will not be able to place orders.';

    if (!window.confirm(msg)) return;

    try {
      const res = await orderingAPI.toggle(newState);
      setOrderingEnabled(res.data.ordering_enabled);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/orders', label: 'Live Orders', icon: '📋' },
    { path: '/cash-pending', label: 'Cash Pending', icon: '💵' },
    { path: '/menu', label: 'Menu', icon: '🍔' },
    { path: '/reports', label: 'Reports', icon: '📈' },
    { path: '/staff', label: 'Staff', icon: '👥' },
    { path: '/activity-log', label: 'Activity Log', icon: '🔐' },
    { path: '/token-display', label: 'Token Display', icon: '🎟️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7' }}>

      {/* Top Header */}
      <div style={{
        background: '#fff',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              fontSize: '22px',
              padding: '4px 8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ☰
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: '800' }}>
            {title || 'Admin'}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleToggleOrdering}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              background: orderingEnabled ? '#dcfce7' : '#fee2e2',
              color: orderingEnabled ? '#16a34a' : '#dc2626',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {orderingEnabled ? '🟢 Open' : '🔴 Closed'}
          </button>

          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#333'
          }}>
            {user.name || 'Admin'}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '260px',
            height: '100vh',
            background: '#fff',
            boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
            zIndex: 201,
            padding: '20px',
            overflowY: 'auto'
          }}>
            <div style={{
              paddingBottom: '16px',
              borderBottom: '1px solid #eee',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '800' }}>
                🍽️ PUJA
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                Admin Panel
              </div>
            </div>

            {menuItems.map(item => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginBottom: '4px',
                  borderRadius: '10px',
                  background: location.pathname === item.path ? '#dbeafe' : 'transparent',
                  color: location.pathname === item.path ? '#2563eb' : '#333',
                  fontSize: '14px',
                  fontWeight: location.pathname === item.path ? '700' : '600',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '12px 14px',
                marginTop: '20px',
                borderRadius: '10px',
                background: '#fee2e2',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '700',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </>
      )}

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}