import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsAPI } from '../services/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await settingsAPI.auditLog(100);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const actionInfo = {
    LOGIN: { icon: '🔓', label: 'Login', color: '#16a34a', bg: '#dcfce7' },
    LOGOUT: { icon: '🔒', label: 'Logout', color: '#666', bg: '#f0f0f0' },
    TOGGLE_ORDERING: { icon: '🔄', label: 'Ordering Toggle', color: '#b45309', bg: '#fef3c7' },
    UPDATE_RESTAURANT_INFO: { icon: '🏪', label: 'Restaurant Update', color: '#2563eb', bg: '#dbeafe' },
    CHANGE_PASSWORD: { icon: '🔐', label: 'Password Change', color: '#dc2626', bg: '#fee2e2' },
    ROTATE_CODE: { icon: '🎟️', label: 'Code Rotate', color: '#7c3aed', bg: '#ede9fe' },
    CREATE_STAFF: { icon: '👤', label: 'Staff Created', color: '#0891b2', bg: '#cffafe' },
    DELETE_STAFF: { icon: '🗑️', label: 'Staff Deleted', color: '#dc2626', bg: '#fee2e2' },
    UPDATE_STAFF: { icon: '✏️', label: 'Staff Updated', color: '#2563eb', bg: '#dbeafe' }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.action === filter;
  });

  const getAction = (action) => {
    return actionInfo[action] || {
      icon: '📋',
      label: action?.replace(/_/g, ' ') || 'Action',
      color: '#666',
      bg: '#f0f0f0'
    };
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================
  // Format details (JSON → Human readable)
  // ============================================
  const formatDetails = (action, details) => {
    if (!details || Object.keys(details).length === 0) return null;

    const items = [];

    // TOGGLE_ORDERING
    if (action === 'TOGGLE_ORDERING') {
      if (details.enabled !== undefined) {
        items.push({
          icon: details.enabled ? '🟢' : '🔴',
          label: 'Status',
          value: details.enabled ? 'Ordering Enabled' : 'Ordering Paused'
        });
      }
      if (details.pause_message) {
        items.push({
          icon: '💬',
          label: 'Message',
          value: details.pause_message
        });
      }
    }

    // UPDATE_RESTAURANT_INFO
    else if (action === 'UPDATE_RESTAURANT_INFO') {
      const labels = {
        name: 'Name',
        tagline: 'Tagline',
        address: 'Address',
        phone: 'Phone',
        gstin: 'GSTIN',
        fssai: 'FSSAI',
        logo_url: 'Logo'
      };
      Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          items.push({
            icon: '📝',
            label: labels[key] || key,
            value: String(value).length > 50
              ? String(value).substring(0, 50) + '...'
              : String(value)
          });
        }
      });
    }

    // CHANGE_PASSWORD
    else if (action === 'CHANGE_PASSWORD') {
      items.push({ icon: '🔐', label: 'Action', value: 'Password changed' });
    }

    // ROTATE_CODE
    else if (action === 'ROTATE_CODE') {
      if (details.new_code) {
        items.push({ icon: '🎟️', label: 'New Code', value: details.new_code });
      }
    }

    // CREATE_STAFF / UPDATE_STAFF / DELETE_STAFF
    else if (action?.includes('STAFF')) {
      if (details.name) items.push({ icon: '👤', label: 'Name', value: details.name });
      if (details.email) items.push({ icon: '📧', label: 'Email', value: details.email });
      if (details.role) items.push({ icon: '👔', label: 'Role', value: details.role });
      if (details.phone) items.push({ icon: '📱', label: 'Phone', value: details.phone });
    }

    // Default fallback
    else {
      Object.entries(details).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const label = key.replace(/_/g, ' ');
        let val = value;
        if (typeof value === 'object') val = JSON.stringify(value);
        items.push({
          icon: '•',
          label,
          value: String(val).length > 50
            ? String(val).substring(0, 50) + '...'
            : String(val)
        });
      });
    }

    return items.length > 0 ? items : null;
  };

  if (loading) {
    return (
      <Layout title="Activity Log">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Activity Log">

      {/* Summary */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            Recent Actions
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#2563eb' }}>
            {logs.length}
          </div>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: '10px 16px',
            background: '#f0f0f0',
            color: '#333',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        marginBottom: '16px',
        paddingBottom: '4px'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'TOGGLE_ORDERING', label: '🔄 Ordering' },
          { key: 'LOGIN', label: '🔓 Login' },
          { key: 'UPDATE_RESTAURANT_INFO', label: '🏪 Restaurant' },
          { key: 'CREATE_STAFF', label: '👤 Staff' },
          { key: 'CHANGE_PASSWORD', label: '🔐 Password' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 14px',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
              background: filter === f.key ? '#2563eb' : '#fff',
              color: filter === f.key ? '#fff' : '#666',
              fontSize: '12px',
              fontWeight: '700',
              border: '1px solid #e5e5e5',
              cursor: 'pointer'
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '50px', marginBottom: '12px' }}>📋</div>
          <div>No activity found</div>
        </div>
      ) : (
        filteredLogs.map((log, idx) => {
          const info = getAction(log.action);
          return (
            <div
              key={log.id || idx}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: info.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0
              }}>
                {info.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: info.color
                  }}>
                    {info.label}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#999',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatTime(log.created_at)}
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                  {log.user_name ? (
                    <>By: <strong>{log.user_name}</strong></>
                  ) : (
                    <>By: <strong>System</strong></>
                  )}
                </div>

                {(() => {
                  const detailItems = formatDetails(log.action, log.details);
                  if (!detailItems || detailItems.length === 0) return null;
                  return (
                    <div style={{
                      background: '#fafafa',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      marginTop: '6px'
                    }}>
                      {detailItems.map((item, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: '6px',
                          fontSize: '12px',
                          padding: '3px 0',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{ flexShrink: 0 }}>{item.icon}</span>
                          <span style={{
                            color: '#888',
                            fontWeight: '600',
                            minWidth: '70px',
                            flexShrink: 0
                          }}>
                            {item.label}:
                          </span>
                          <span style={{
                            color: '#1a1a1a',
                            fontWeight: '600',
                            wordBreak: 'break-word'
                          }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                
              </div>
            </div>
          );
        })
      )}

    </Layout>
  );
}