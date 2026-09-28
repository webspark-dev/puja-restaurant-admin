import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ordersAPI } from '../services/api';
import { connectSocket } from '../services/socket';

export default function CashPending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetOrderId = searchParams.get('orderId');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [cashInputs, setCashInputs] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => {
    loadData();

    const socket = connectSocket();
    socket.emit('admin:join');

    socket.on('order:new', () => loadData());
    socket.on('order:confirmed', () => loadData());

    const interval = setInterval(loadData, 30000);

    return () => {
      socket.off('order:new');
      socket.off('order:confirmed');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ============================================
  // Keyboard shortcuts (when modal open)
  // ============================================
  useEffect(() => {
    if (!confirmModal) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeConfirm();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setConfirmModal(null);
      } else if (e.key === 'Escape') {
        setConfirmModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal]);

  const loadData = async () => {
    try {
      const res = await ordersAPI.cashPending();
      let list = res.data.orders || [];

      // If targetOrderId, prioritize it
      if (targetOrderId) {
        list = [
          ...list.filter(o => o.id === targetOrderId),
          ...list.filter(o => o.id !== targetOrderId)
        ];
      }

      setOrders(list);

      const inputs = {};
      list.forEach(o => {
        if (!cashInputs[o.id]) {
          const total = parseFloat(o.total);
          inputs[o.id] = Math.ceil(total / 100) * 100;
        }
      });
      setCashInputs(prev => ({ ...prev, ...inputs }));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (order) => {
    const received = parseFloat(cashInputs[order.id]);

    if (!received || received < parseFloat(order.total)) {
      setToast({
        type: 'error',
        message: `Cash must be ≥ ₹${order.total}`
      });
      return;
    }

    const change = received - parseFloat(order.total);

    setConfirmModal({ order, received, change });
  };

  const executeConfirm = async () => {
    if (!confirmModal) return;

    const { order, received } = confirmModal;
    setConfirmModal(null);
    setUpdatingId(order.id);

    const prevOrders = [...orders];
    setOrders(prev => prev.filter(o => o.id !== order.id));

    setToast({
      type: 'success',
      message: `${order.token} cash confirmed ✓`
    });

    try {
      await ordersAPI.confirmCash(order.id, received);
      console.log('✅ Cash confirmed');

      setTimeout(() => {
        navigate('/orders');
      }, 800);

    } catch (err) {
      console.error('❌ Error:', err);
      setOrders(prevOrders);
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed'
      });
      setUpdatingId(null);
    }
  };

  const getTimeRemaining = (createdAt) => {
    const created = new Date(createdAt);
    const now = new Date();
    const elapsed = Math.floor((now - created) / 1000);
    const remaining = 300 - elapsed;

    if (remaining <= 0) return { text: 'Expired', urgent: true };

    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return {
      text: `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      urgent: remaining < 60
    };
  };

  if (loading) {
    return (
      <Layout title="Cash Pending">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Cash Pending">

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
            Pending Payments
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>
            {orders.length}
          </div>
        </div>
        <div style={{ fontSize: '40px' }}>💵</div>
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          <div style={{ fontSize: '50px', marginBottom: '12px' }}>✓</div>
          <div>No pending cash payments</div>
          <button
            onClick={() => navigate('/orders')}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            ← Back to Orders
          </button>
        </div>
      ) : (
        orders.map(order => {
          const timer = getTimeRemaining(order.created_at);
          const received = cashInputs[order.id] || 0;
          const change = received - parseFloat(order.total);
          const isUpdating = updatingId === order.id;
          const isTarget = targetOrderId === order.id;

          return (
            <div
              key={order.id}
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${isTarget ? '#2563eb' : (timer.urgent ? '#dc2626' : '#f59e0b')}`,
                opacity: isUpdating ? 0.5 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              {isTarget && (
                <div style={{
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  marginBottom: '10px',
                  display: 'inline-block'
                }}>
                  ⭐ Selected Order
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    color: '#e23744',
                    marginBottom: '4px'
                  }}>
                    {order.token}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {order.customer_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {order.customer_mobile}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: '900',
                    color: '#dc2626',
                    marginBottom: '4px'
                  }}>
                    ₹{order.total}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: timer.urgent ? '#fee2e2' : '#fef3c7',
                    color: timer.urgent ? '#dc2626' : '#b45309',
                    fontWeight: '700'
                  }}>
                    ⏱️ {timer.text}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                fontSize: '12px',
                color: '#666',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0',
                marginBottom: '12px'
              }}>
                <span>
                  {order.order_type === 'dinein' ? '🍽️ Dine-in' : '🥡 Takeaway'}
                </span>
                <span>
                  🕐 {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#666',
                  marginBottom: '6px'
                }}>
                  Cash Received:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    value={received}
                    onChange={(e) => setCashInputs(prev => ({
                      ...prev,
                      [order.id]: e.target.value
                    }))}
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1.5px solid #e5e5e5',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: '700',
                      textAlign: 'center'
                    }}
                  />
                  <div style={{
                    padding: '12px 16px',
                    background: '#f0f0f0',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#666',
                    minWidth: '100px',
                    textAlign: 'center'
                  }}>
                    Change
                    <div style={{ fontSize: '16px', color: '#1a1a1a' }}>
                      ₹{change >= 0 ? change.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '8px'
                }}>
                  {[
                    Math.ceil(parseFloat(order.total) / 100) * 100,
                    Math.ceil(parseFloat(order.total) / 100) * 100 + 100,
                    Math.ceil(parseFloat(order.total) / 500) * 500
                  ].filter((v, i, arr) => arr.indexOf(v) === i).map(amt => (
                    <button
                      key={amt}
                      onClick={() => setCashInputs(prev => ({
                        ...prev,
                        [order.id]: amt
                      }))}
                      style={{
                        padding: '6px 12px',
                        background: received == amt ? '#2563eb' : '#f0f0f0',
                        color: received == amt ? '#fff' : '#333',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => openConfirmModal(order)}
                disabled={isUpdating || received < parseFloat(order.total)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: received < parseFloat(order.total) ? '#94a3b8' : '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: received < parseFloat(order.total) ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdating ? '⏳ Confirming...' : '✓ Confirm Cash Received'}
              </button>
            </div>
          );
        })
      )}

      {/* ============================================ */}
      {/* PROFESSIONAL CONFIRM MODAL */}
      {/* ============================================ */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '32px 24px 24px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'scaleIn 0.2s ease'
            }}
          >
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              margin: '0 auto 16px'
            }}>
              💵
            </div>

            <h2 style={{
              fontSize: '20px',
              fontWeight: '800',
              marginBottom: '6px'
            }}>
              Confirm Cash Payment?
            </h2>

            <p style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '24px'
            }}>
              {confirmModal.order.token} • {confirmModal.order.customer_name}
            </p>

            <div style={{
              background: '#fafafa',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                fontSize: '14px'
              }}>
                <span style={{ color: '#666' }}>Total</span>
                <span style={{ fontWeight: '700' }}>₹{parseFloat(confirmModal.order.total).toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 0',
                fontSize: '14px'
              }}>
                <span style={{ color: '#666' }}>Received</span>
                <span style={{ fontWeight: '700' }}>₹{confirmModal.received.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0 6px',
                fontSize: '16px',
                borderTop: '1px dashed #ccc',
                marginTop: '6px'
              }}>
                <span style={{ color: '#16a34a', fontWeight: '700' }}>Change</span>
                <span style={{ fontWeight: '900', color: '#16a34a' }}>
                  ₹{confirmModal.change.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancel
              </button>
              <button
                onClick={executeConfirm}
                autoFocus
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ✓ Confirm
              </button>
            </div>

            <div style={{
              marginTop: '16px',
              fontSize: '11px',
              color: '#999',
              display: 'flex',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <span><kbd style={{
                padding: '2px 6px',
                background: '#f0f0f0',
                borderRadius: '4px',
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>Enter</kbd> Confirm</span>
              <span><kbd style={{
                padding: '2px 6px',
                background: '#f0f0f0',
                borderRadius: '4px',
                fontWeight: '700',
                fontFamily: 'monospace'
              }}>Space</kbd> Cancel</span>
            </div>
          </div>
        </div>
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </Layout>
  );
}