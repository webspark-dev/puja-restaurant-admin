import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsAPI } from '../services/api';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    try {
      const res = await settingsAPI.getStaff();
      setStaff(res.data.staff || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name}?`)) return;
    try {
      await settingsAPI.deleteStaff(id);
      setStaff(prev => prev.filter(s => s.id !== id));
      setToast({ type: 'success', message: 'Staff removed' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed'
      });
    }
  };

  const handleToggleActive = async (member) => {
    try {
      await settingsAPI.updateStaff(member.id, { active: !member.active });
      setStaff(prev => prev.map(s =>
        s.id === member.id ? { ...s, active: !s.active } : s
      ));
      setToast({ type: 'success', message: 'Updated' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed' });
    }
  };

  const roleInfo = {
    owner: { label: '👑 Owner', color: '#7c3aed', bg: '#ede9fe' },
    manager: { label: '👔 Manager', color: '#2563eb', bg: '#dbeafe' },
    cashier: { label: '💰 Cashier', color: '#16a34a', bg: '#dcfce7' },
    kitchen: { label: '👨‍🍳 Kitchen', color: '#ea580c', bg: '#ffedd5' },
    waiter: { label: '🍽️ Waiter', color: '#0891b2', bg: '#cffafe' }
  };

  if (loading) {
    return (
      <Layout title="Staff">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Staff">

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
            Total Staff
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#2563eb' }}>
            {staff.length}
          </div>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          style={{
            padding: '12px 20px',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          + Add Staff
        </button>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '50px', marginBottom: '12px' }}>👥</div>
          <div>No staff members</div>
        </div>
      ) : (
        staff.map(member => {
          const role = roleInfo[member.role] || roleInfo.waiter;
          return (
            <div
              key={member.id}
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                opacity: member.active ? 1 : 0.55
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '800',
                  flexShrink: 0
                }}>
                  {member.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    marginBottom: '2px'
                  }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {member.email}
                  </div>
                  {member.phone && (
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      📱 {member.phone}
                    </div>
                  )}
                </div>
                <span style={{
                  background: role.bg,
                  color: role.color,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap'
                }}>
                  {role.label}
                </span>
              </div>

              {!member.active && (
                <div style={{
                  background: '#fef3c7',
                  color: '#92400e',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginBottom: '10px'
                }}>
                  ⏸️ Inactive
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleToggleActive(member)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: member.active ? '#fef3c7' : '#dcfce7',
                    color: member.active ? '#b45309' : '#16a34a',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {member.active ? '⏸️ Disable' : '▶️ Enable'}
                </button>
                <button
                  onClick={() => setModal({ mode: 'edit', member })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(member.id, member.name)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Remove
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Modal */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          member={modal.member}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            loadData();
            setToast({
              type: 'success',
              message: modal.mode === 'create' ? 'Staff added' : 'Staff updated'
            });
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff',
          padding: '14px 24px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 2000,
          maxWidth: '90%'
        }}>
          {toast.type === 'success' ? '✅ ' : '❌ '}
          {toast.message}
        </div>
      )}

    </Layout>
  );
}

function StaffModal({ mode, member, onClose, onSave }) {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(member?.role || 'cashier');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    { value: 'manager', label: '👔 Manager — Full access except settings' },
    { value: 'cashier', label: '💰 Cashier — Cash confirm, print bill' },
    { value: 'kitchen', label: '👨‍🍳 Kitchen — Order status update' },
    { value: 'waiter', label: '🍽️ Waiter — View orders only' }
  ];

  const handleSave = async () => {
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Name and Email required');
      return;
    }

    if (mode === 'create' && !password) {
      setError('Password required');
      return;
    }

    if (mode === 'create' && password.length < 6) {
      setError('Password must be 6+ chars');
      return;
    }

    setSaving(true);

    try {
      if (mode === 'create') {
        await settingsAPI.createStaff({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role
        });
      } else {
        await settingsAPI.updateStaff(member.id, {
          name: name.trim(),
          phone: phone.trim(),
          role
        });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '24px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
            {mode === 'create' ? '➕ Add Staff' : '✏️ Edit Staff'}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', fontSize: '24px', color: '#666',
            padding: '4px 8px', border: 'none', cursor: 'pointer'
          }}>✕</button>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: '600',
            marginBottom: '6px', color: '#555'
          }}>Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%', padding: '12px',
              border: '1.5px solid #e5e5e5', borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: '600',
            marginBottom: '6px', color: '#555'
          }}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={mode === 'edit'}
            style={{
              width: '100%', padding: '12px',
              border: '1.5px solid #e5e5e5', borderRadius: '10px',
              fontSize: '14px',
              background: mode === 'edit' ? '#f5f5f5' : '#fff'
            }}
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: '600',
            marginBottom: '6px', color: '#555'
          }}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: '100%', padding: '12px',
              border: '1.5px solid #e5e5e5', borderRadius: '10px',
              fontSize: '14px'
            }}
          />
        </div>

        {mode === 'create' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: '600',
              marginBottom: '6px', color: '#555'
            }}>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              style={{
                width: '100%', padding: '12px',
                border: '1.5px solid #e5e5e5', borderRadius: '10px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block', fontSize: '13px', fontWeight: '600',
            marginBottom: '6px', color: '#555'
          }}>Role *</label>
          {roles.map(r => (
            <div
              key={r.value}
              onClick={() => setRole(r.value)}
              style={{
                padding: '12px',
                marginBottom: '6px',
                borderRadius: '10px',
                border: `2px solid ${role === r.value ? '#2563eb' : '#e5e5e5'}`,
                background: role === r.value ? '#dbeafe' : '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: role === r.value ? '700' : '500',
                color: role === r.value ? '#1e40af' : '#333'
              }}
            >
              {r.label}
            </div>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#dc2626',
            padding: '12px', borderRadius: '10px',
            fontSize: '13px', marginBottom: '16px'
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '14px', background: '#f0f0f0', color: '#333',
            border: 'none', borderRadius: '12px', fontSize: '15px',
            fontWeight: '700', cursor: 'pointer'
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '14px',
            background: saving ? '#94a3b8' : '#16a34a',
            color: '#fff', border: 'none', borderRadius: '12px',
            fontSize: '15px', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}>{saving ? '⏳ Saving...' : '✓ Save'}</button>
        </div>
      </div>
    </div>
  );
}