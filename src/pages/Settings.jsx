import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { settingsAPI, orderingAPI, backupAPI } from '../services/api';
export default function Settings() {
  const [activeTab, setActiveTab] = useState('restaurant');
  const [restaurant, setRestaurant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Restaurant form
  const [rName, setRName] = useState('');
  const [rTagline, setRTagline] = useState('');
  const [rAddress, setRAddress] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rGstin, setRGstin] = useState('');
  const [rFssai, setRFssai] = useState('');

  // Business form
  const [gstPercent, setGstPercent] = useState(5);
  const [cashTimeout, setCashTimeout] = useState(5);

  // Password form
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Ordering
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [pauseMessage, setPauseMessage] = useState('');

  const [saving, setSaving] = useState(false);
    const [backupInfo, setBackupInfo] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().split('T')[0];
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().split('T')[0]);

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
      const [settingsRes, profileRes, orderingRes, backupRes] = await Promise.all([
        settingsAPI.get(),
        settingsAPI.profile(),
        orderingAPI.status(),
        backupAPI.info()
      ]);
      
      setBackupInfo(backupRes.data);

      const r = settingsRes.data.restaurant;
      const s = settingsRes.data.settings;

      setRestaurant(r);
      setSettings(s);
      setProfile(profileRes.data.user);

      // Fill forms
      setRName(r?.name || '');
      setRTagline(r?.tagline || '');
      setRAddress(r?.address || '');
      setRPhone(r?.phone || '');
      setRGstin(r?.gstin || '');
      setRFssai(r?.fssai || '');

      setGstPercent(s?.gst_percent || 5);
      setCashTimeout(s?.cash_timeout_minutes || 5);

      setOrderingEnabled(orderingRes.data.ordering_enabled);
      setPauseMessage(orderingRes.data.pause_message || '');

    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: 'Load failed' });
    } finally {
      setLoading(false);
    }
  };

  const saveRestaurant = async () => {
    setSaving(true);
    try {
      const res = await settingsAPI.updateRestaurant({
        name: rName,
        tagline: rTagline,
        address: rAddress,
        phone: rPhone,
        gstin: rGstin,
        fssai: rFssai
      });
      setRestaurant(res.data.restaurant);
      setToast({ type: 'success', message: 'Restaurant updated ✓' });
    } catch (err) {
      setToast({ type: 'error', message: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const res = await settingsAPI.updateBusiness({
        gst_percent: parseFloat(gstPercent),
        cash_timeout_minutes: parseInt(cashTimeout)
      });
      setSettings(res.data.settings);
      setToast({ type: 'success', message: 'Business settings saved ✓' });
    } catch (err) {
      setToast({ type: 'error', message: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (newPass !== confirmPass) {
      setToast({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    if (newPass.length < 6) {
      setToast({ type: 'error', message: 'Password must be 6+ chars' });
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.changePassword(currentPass, newPass);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setToast({ type: 'success', message: 'Password changed ✓' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleOrdering = async () => {
    const newState = !orderingEnabled;
    try {
      await orderingAPI.toggle(newState, pauseMessage);
      setOrderingEnabled(newState);
      setToast({
        type: 'success',
        message: newState ? 'Ordering ON' : 'Ordering paused'
      });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed' });
    }
  };

  if (loading) {
    return (
      <Layout title="Settings">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings">

      {/* Ordering Toggle (top) */}
      <div style={{
        background: orderingEnabled
          ? 'linear-gradient(135deg, #16a34a, #0e7a37)'
          : 'linear-gradient(135deg, #dc2626, #991b1b)',
        borderRadius: '14px',
        padding: '20px',
        marginBottom: '16px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
      }}>
        <div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>
            Ordering Status
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900' }}>
            {orderingEnabled ? '🟢 OPEN' : '🔴 PAUSED'}
          </div>
        </div>
        <button
          onClick={toggleOrdering}
          style={{
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {orderingEnabled ? '⏸️ Pause' : '▶️ Open'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#fff',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflowX: 'auto'
      }}>
                {[
          { key: 'restaurant', label: '🏪 Restaurant' },
          { key: 'business', label: '⚙️ Business' },
          { key: 'profile', label: '👤 Profile' },
          { key: 'security', label: '🔐 Password' },
          { key: 'backup', label: '💾 Backup' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: '10px',
              background: activeTab === tab.key ? '#2563eb' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#666',
              fontWeight: '700',
              fontSize: '12px',
              border: 'none',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              minWidth: '100px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Restaurant Tab */}
      {activeTab === 'restaurant' && (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            🏪 Restaurant Information
          </h3>

          <Field label="Restaurant Name" value={rName} onChange={setRName} />
          <Field label="Tagline" value={rTagline} onChange={setRTagline} />
          <Field label="Address" value={rAddress} onChange={setRAddress} multiline />
          <Field label="Phone" value={rPhone} onChange={setRPhone} />
          <Field label="GSTIN" value={rGstin} onChange={setRGstin} />
          <Field label="FSSAI" value={rFssai} onChange={setRFssai} />

          <button
            onClick={saveRestaurant}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              background: saving ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {saving ? '⏳ Saving...' : '✓ Save Restaurant Info'}
          </button>
        </div>
      )}

      {/* Business Tab */}
      {activeTab === 'business' && (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            ⚙️ Business Settings
          </h3>

          <Field
            label="GST Percent (%)"
            value={gstPercent}
            onChange={setGstPercent}
            type="number"
          />
          <Field
            label="Cash Timeout (minutes)"
            value={cashTimeout}
            onChange={setCashTimeout}
            type="number"
          />

          <div style={{
            background: '#f0f9ff',
            borderLeft: '4px solid #0ea5e9',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#075985',
            marginBottom: '16px'
          }}>
            💡 Cash timeout = Cash order auto-cancel time
          </div>

          <button
            onClick={saveBusiness}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              background: saving ? '#94a3b8' : '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? '⏳ Saving...' : '✓ Save Business Settings'}
          </button>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1e40af)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '900',
            margin: '0 auto 16px'
          }}>
            {profile.name?.charAt(0).toUpperCase() || 'A'}
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>
            {profile.name}
          </h3>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            {profile.email}
          </div>

          <div style={{
            background: '#fafafa',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'left',
            fontSize: '13px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0'
            }}>
              <span style={{ color: '#666' }}>Role</span>
              <span style={{ fontWeight: '700' }}>
                {profile.role === 'owner' ? '👑 Owner' : profile.role}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0'
            }}>
              <span style={{ color: '#666' }}>Phone</span>
              <span style={{ fontWeight: '700' }}>{profile.phone || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '700',
            marginBottom: '16px'
          }}>
            🔐 Change Password
          </h3>

          <Field
            label="Current Password"
            value={currentPass}
            onChange={setCurrentPass}
            type="password"
          />
          <Field
            label="New Password"
            value={newPass}
            onChange={setNewPass}
            type="password"
          />
          <Field
            label="Confirm New Password"
            value={confirmPass}
            onChange={setConfirmPass}
            type="password"
          />

          <button
            onClick={changePassword}
            disabled={saving || !currentPass || !newPass || !confirmPass}
            style={{
              width: '100%',
              padding: '14px',
              background: saving ? '#94a3b8' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              marginTop: '8px',
              opacity: (!currentPass || !newPass || !confirmPass) ? 0.5 : 1
            }}
          >
            {saving ? '⏳ Changing...' : '🔐 Change Password'}
          </button>
        </div>
      )}
      {/* Backup Tab */}
      {activeTab === 'backup' && backupInfo && (
        <>
          {/* Storage Info */}
          <div style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '700',
              marginBottom: '16px'
            }}>
              💾 Storage Status
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <InfoCard
                label="Total Orders"
                value={backupInfo.total_orders}
                icon="📦"
              />
              <InfoCard
                label="Storage Used"
                value={`${backupInfo.storage_estimate_mb} MB`}
                icon="💾"
                subtext={`of 500 MB free`}
              />
              <InfoCard
                label="Day Book Days"
                value={backupInfo.day_book_days}
                icon="📅"
              />
              <InfoCard
                label="Free Space"
                value={`${(500 - backupInfo.storage_estimate_mb).toFixed(1)} MB`}
                icon="🆓"
                color="#16a34a"
              />
            </div>

            {/* Progress Bar */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#666',
                marginBottom: '6px'
              }}>
                <span>Storage Usage</span>
                <span>{backupInfo.percent_used}%</span>
              </div>
              <div style={{
                height: '10px',
                background: '#f0f0f0',
                borderRadius: '5px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(backupInfo.percent_used, 100)}%`,
                  background: backupInfo.percent_used > 80 ? '#dc2626' :
                              backupInfo.percent_used > 50 ? '#f59e0b' : '#16a34a',
                  transition: 'width 0.3s'
                }}></div>
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div style={{
            background: '#fff',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: '15px',
              fontWeight: '700',
              marginBottom: '8px'
            }}>
              📥 Export Data (Excel)
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#666',
              marginBottom: '16px'
            }}>
              Download all orders, items, and sales data as Excel file. Keep for backup.
            </p>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '11px',
                  color: '#666',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  From
                </label>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1.5px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{
                  fontSize: '11px',
                  color: '#666',
                  fontWeight: '600',
                  display: 'block',
                  marginBottom: '4px'
                }}>
                  To
                </label>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1.5px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            {/* Quick Range Buttons */}
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              {[
                { label: '7 Days', days: 7 },
                { label: '30 Days', days: 30 },
                { label: '90 Days', days: 90 },
                { label: '1 Year', days: 365 }
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - r.days);
                    setExportFrom(start.toISOString().split('T')[0]);
                    setExportTo(end.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: '6px 12px',
                    background: '#f0f0f0',
                    color: '#333',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button
              onClick={async () => {
                setBackupLoading(true);
                try {
                  const token = localStorage.getItem('adminToken');
                  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/backup/export?from=${exportFrom}&to=${exportTo}`;

                  const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${token}` }
                  });

                  if (!res.ok) throw new Error(`HTTP ${res.status}`);

                  const blob = await res.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `Backup_${exportFrom}_to_${exportTo}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(blobUrl);

                  setToast({
                    type: 'success',
                    message: '✅ Excel downloaded!'
                  });
                } catch (err) {
                  setToast({
                    type: 'error',
                    message: 'Export failed: ' + err.message
                  });
                } finally {
                  setBackupLoading(false);
                }
              }}
              disabled={backupLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: backupLoading ? '#94a3b8' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: '700',
                cursor: backupLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {backupLoading ? '⏳ Generating...' : '📥 Download Excel Backup'}
            </button>

            {/* Instructions */}
            <div style={{
              background: '#f0f9ff',
              borderLeft: '4px solid #0ea5e9',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#075985',
              marginTop: '16px'
            }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                💡 Backup Tips:
              </div>
              <ul style={{ paddingLeft: '16px', margin: 0, lineHeight: 1.6 }}>
                <li>মাসে একবার Backup নিন</li>
                <li>Google Drive-এ save করুন</li>
                <li>Excel-এ 3টা sheet: Summary, Orders, Top Items</li>
                <li>Data automatically সব safely থাকবে</li>
              </ul>
            </div>
          </div>
        </>
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
function InfoCard({ label, value, icon, color = '#1a1a1a', subtext }) {
  return (
    <div style={{
      background: '#fafafa',
      borderRadius: '12px',
      padding: '14px'
    }}>
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
      <div style={{
        fontSize: '18px',
        fontWeight: '800',
        color,
        marginBottom: '2px'
      }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>{label}</div>
      {subtext && (
        <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', multiline = false }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: '600',
        marginBottom: '6px',
        color: '#555'
      }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows="3"
          style={{
            width: '100%',
            padding: '12px',
            border: '1.5px solid #e5e5e5',
            borderRadius: '10px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            padding: '12px',
            border: '1.5px solid #e5e5e5',
            borderRadius: '10px',
            fontSize: '14px'
          }}
        />
      )}
    </div>
  );
}