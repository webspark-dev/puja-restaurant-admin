import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ordersAPI } from '../services/api';
import { connectSocket } from '../services/socket';
import { printBill } from '../utils/printBill';

export default function Orders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');
  const [liveOrders, setLiveOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal: { type: 'cash' | 'print', order: {...} }

  // ============================================
  // Data Loading
  // ============================================
  useEffect(() => {
    loadData();

    const socket = connectSocket();
    socket.emit('admin:join');

    socket.on('order:new', () => loadData());
    socket.on('order:confirmed', () => loadData());
    socket.on('order:status', () => loadData());
    socket.on('orderUpdate', () => loadData());

    return () => {
      socket.off('order:new');
      socket.off('order:confirmed');
      socket.off('order:status');
      socket.off('orderUpdate');
    };
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ============================================
  // ⌨️ Keyboard Shortcuts for Confirm Modal
  // ============================================
  useEffect(() => {
    if (!confirmModal) return;

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (confirmModal.type === 'cash') {
          confirmCashPayment();
        } else {
          confirmPrintBill();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setConfirmModal(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmModal]);

  const loadData = async () => {
    try {
      const [liveRes, historyRes] = await Promise.all([
        ordersAPI.live(),
        ordersAPI.history(50, 0)
      ]);
      setLiveOrders(liveRes.data.orders || []);
      setHistory(historyRes.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // STEP 1: Open Confirm Cash Modal
  // ============================================
  const handleCashPay = (order) => {
    setConfirmModal({ type: 'cash', order });
  };

  const confirmCashPayment = async () => {
    const order = confirmModal.order;
    setConfirmModal(null);
    setUpdatingId(order.id);

    try {
      const res = await ordersAPI.settleCash(order.id);
      if (res.data.success) {
        setToast({
          type: 'success',
          message: `✅ ${order.token} — Payment Confirmed! Now print bill.`
        });
        await loadData();

        // 🎯 Auto-open Print Bill Modal after 500ms
        setTimeout(() => {
          setConfirmModal({ type: 'print', order });
        }, 500);
      }
    } catch (err) {
      console.error('settleCash error:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to confirm cash'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================================
  // STEP 2: Open Print Bill Modal
  // ============================================
  const handlePrintBill = (order) => {
    setConfirmModal({ type: 'print', order });
  };

  const confirmPrintBill = async () => {
    const order = confirmModal.order;
    setConfirmModal(null);
    setUpdatingId(order.id);

    try {
      const res = await ordersAPI.printBill(order.id);
      if (res.data.success) {
        // ✅ Clean 80mm bill print
        setTimeout(() => {
          printBill(res.data.order || order);
        }, 300);

        setToast({
          type: 'success',
          message: `🖨️ ${order.token} — Bill Printed, Tracking ON`
        });
        await loadData();
      }
    } catch (err) {
      console.error('printBill error:', err);
      setToast({
        type: 'error',
        message: err.response?.data?.error || 'Failed to print bill'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // ============================================
  // STEP 3: Update Status
  // ============================================
  const handleUpdateStatus = async (orderId, newStatus) => {
    const prevLiveOrders = [...liveOrders];
    const targetOrder = liveOrders.find(o => o.id === orderId);
    if (!targetOrder) return;

    setUpdatingId(orderId);

    if (newStatus === 'COMPLETED') {
      setLiveOrders(prev => prev.filter(o => o.id !== orderId));
      setHistory(prev => [{ ...targetOrder, status: 'COMPLETED' }, ...prev]);
      setToast({
        type: 'success',
        message: `${targetOrder.token} → COMPLETED ✓ Moved to History`
      });
    } else {
      setLiveOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );
      setToast({
        type: 'success',
        message: `${targetOrder.token} → ${newStatus}`
      });
    }

    const notes = {
      PREPARING: 'Kitchen started preparing',
      READY: 'Order is ready',
      COMPLETED: 'Order completed'
    };

    try {
      await ordersAPI.updateStatus(orderId, newStatus, notes[newStatus]);
      setTimeout(() => {
        ordersAPI.live().then(res => setLiveOrders(res.data.orders || [])).catch(() => {});
      }, 1500);
    } catch (err) {
      setLiveOrders(prevLiveOrders);
      setToast({
        type: 'error',
        message: err.response?.data?.message || err.response?.data?.error || 'Update failed'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredLive = liveOrders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const filteredHistory = history.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const displayOrders = activeTab === 'live' ? filteredLive : filteredHistory;

  if (loading) {
    return (
      <Layout title="Orders">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Orders">

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: '#fff',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <button
          onClick={() => setActiveTab('live')}
          style={{
            flex: 1, padding: '12px', borderRadius: '10px',
            background: activeTab === 'live' ? '#2563eb' : 'transparent',
            color: activeTab === 'live' ? '#fff' : '#666',
            fontWeight: '700', fontSize: '14px',
            border: 'none', cursor: 'pointer'
          }}
        >
          🔔 Live ({liveOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1, padding: '12px', borderRadius: '10px',
            background: activeTab === 'history' ? '#2563eb' : 'transparent',
            color: activeTab === 'history' ? '#fff' : '#666',
            fontWeight: '700', fontSize: '14px',
            border: 'none', cursor: 'pointer'
          }}
        >
          📋 History ({history.length})
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
          { key: 'PENDING_PAYMENT', label: '💵 Cash Pending' },
          { key: 'CONFIRMED', label: '🟡 Confirmed' },
          { key: 'PREPARING', label: '🔵 Preparing' },
          { key: 'READY', label: '🟢 Ready' },
          { key: 'COMPLETED', label: '⚪ Done' }
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

      {/* Orders List */}
      {displayOrders.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: '14px',
          padding: '60px 20px',
          textAlign: 'center',
          color: '#999'
        }}>
          {activeTab === 'live' ? 'No live orders' : 'No orders in history'}
        </div>
      ) : (
        displayOrders.map(order => {
          const isUpdating = updatingId === order.id;

          const isCashPending =
            order.payment_method === 'cash' &&
            order.is_cash_settled === false;

          const waitingForBill =
            order.payment_method === 'cash' &&
            order.is_cash_settled === true &&
            order.tracking_enabled === false;

          const trackingOn =
            order.payment_method !== 'cash' ||
            order.tracking_enabled === true;

          const showStatusButtons =
            order.payment_method !== 'cash' || trackingOn;

          const borderColor = isCashPending ? '#dc2626'
                            : waitingForBill ? '#2563eb'
                            : '#16a34a';

          return (
            <div
              key={order.id}
              style={{
                background: '#fff',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                borderLeft: `4px solid ${borderColor}`,
                opacity: isUpdating ? 0.5 : 1,
                transition: 'opacity 0.15s'
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#e23744' }}>
                      {order.token}
                    </div>
                    <StatusBadge status={order.status} />

                    {order.is_cash_settled && order.payment_method === 'cash' && (
                      <span style={{
                        background: '#dcfce7', color: '#16a34a',
                        padding: '3px 8px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: '700'
                      }}>
                        ✅ Paid
                      </span>
                    )}

                    {trackingOn && order.payment_method === 'cash' && (
                      <span style={{
                        background: '#dbeafe', color: '#1e40af',
                        padding: '3px 8px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: '700'
                      }}>
                        📊 Tracking
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {order.customer_name} • {order.customer_mobile}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: isCashPending ? '#dc2626' : '#1a1a1a'
                  }}>
                    ₹{order.total}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {order.order_type === 'dinein' ? '🍽️ Dine-in' : '🥡 Takeaway'}
                  </div>
                </div>
              </div>

              {/* Info Row */}
              <div style={{
                display: 'flex',
                gap: '12px',
                fontSize: '12px',
                color: '#666',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0',
                marginBottom: '12px',
                flexWrap: 'wrap'
              }}>
                <span>{order.payment_method === 'upi' ? '📱 UPI' : '💵 Cash'}</span>
                <span>{order.payment_status === 'PAID' || order.is_cash_settled ? '✅ Paid' : '⏳ Pending'}</span>
                <span>
                  🕐 {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                <button
                  onClick={() => setSelectedOrder(order)}
                  disabled={isUpdating}
                  style={{
                    flex: 1, padding: '10px',
                    background: '#f0f0f0', color: '#333',
                    borderRadius: '8px', fontSize: '13px',
                    fontWeight: '700', border: 'none',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    minWidth: '80px'
                  }}
                >
                  👁️ View
                </button>

                {/* STATE 1: Confirm Cash */}
                {isCashPending && (
                  <button
                    onClick={() => handleCashPay(order)}
                    disabled={isUpdating}
                    style={{
                      flex: 2, padding: '10px',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      color: '#fff', borderRadius: '8px',
                      fontSize: '13px', fontWeight: '800',
                      border: 'none',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      animation: 'pulse 2s infinite',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                      minWidth: '180px'
                    }}
                  >
                    {isUpdating ? '⏳ Processing...' : '💵 Confirm Cash Payment'}
                  </button>
                )}

                {/* STATE 2: Print Bill */}
                {waitingForBill && (
                  <button
                    onClick={() => handlePrintBill(order)}
                    disabled={isUpdating}
                    style={{
                      flex: 2, padding: '10px',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#fff', borderRadius: '8px',
                      fontSize: '13px', fontWeight: '800',
                      border: 'none',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      animation: 'pulse 2s infinite',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                      minWidth: '180px'
                    }}
                  >
                    {isUpdating ? '⏳ Printing...' : '🖨️ Print Bill'}
                  </button>
                )}

                {/* STATE 3: Status Buttons */}
                {showStatusButtons && order.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                    disabled={isUpdating}
                    style={{
                      flex: 2, padding: '10px',
                      background: '#2563eb', color: '#fff',
                      borderRadius: '8px', fontSize: '13px',
                      fontWeight: '700', border: 'none',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      minWidth: '140px'
                    }}
                  >
                    👨‍🍳 Start Preparing
                  </button>
                )}

                {showStatusButtons && order.status === 'PREPARING' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'READY')}
                    disabled={isUpdating}
                    style={{
                      flex: 2, padding: '10px',
                      background: '#16a34a', color: '#fff',
                      borderRadius: '8px', fontSize: '13px',
                      fontWeight: '700', border: 'none',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      minWidth: '140px'
                    }}
                  >
                    ✅ Mark Ready
                  </button>
                )}

                {showStatusButtons && order.status === 'READY' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                    disabled={isUpdating}
                    style={{
                      flex: 2, padding: '10px',
                      background: '#16a34a', color: '#fff',
                      borderRadius: '8px', fontSize: '13px',
                      fontWeight: '700', border: 'none',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      minWidth: '140px'
                    }}
                  >
                    ✓ Complete Order
                  </button>
                )}

              </div>
            </div>
          );
        })
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={() => {
            setSelectedOrder(null);
            handlePrintBill(selectedOrder);
          }}
        />
      )}

      {/* ============================================
          🎯 Custom Confirm Modal (Cash / Print)
         ============================================ */}
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
            zIndex: 3000,
            padding: '20px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'modalIn 0.25s ease-out'
            }}
          >
            {/* Icon + Title */}
            <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
              <div style={{
                width: '72px',
                height: '72px',
                margin: '0 auto 16px',
                borderRadius: '50%',
                background: confirmModal.type === 'cash'
                  ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                  : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                boxShadow: confirmModal.type === 'cash'
                  ? '0 8px 24px rgba(220, 38, 38, 0.35)'
                  : '0 8px 24px rgba(37, 99, 235, 0.35)',
                animation: 'pulse 2s infinite'
              }}>
                {confirmModal.type === 'cash' ? '💵' : '🖨️'}
              </div>

              <h2 style={{
                fontSize: '20px',
                fontWeight: '800',
                color: '#1a1a1a',
                marginBottom: '8px'
              }}>
                {confirmModal.type === 'cash' ? 'Confirm Cash Payment?' : 'Print Bill?'}
              </h2>

              <p style={{
                fontSize: '13px',
                color: '#666',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}>
                {confirmModal.type === 'cash'
                  ? 'Customer will immediately see "Payment Successful".'
                  : 'Bill will print and customer tracking will start.'}
              </p>

              <div style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Token</span>
                  <span style={{ fontWeight: '800', color: '#e23744', fontSize: '16px' }}>
                    {confirmModal.order.token}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Customer</span>
                  <span style={{ fontWeight: '600' }}>{confirmModal.order.customer_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Mobile</span>
                  <span style={{ fontWeight: '600' }}>{confirmModal.order.customer_mobile}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px dashed #ccc',
                  fontSize: '15px'
                }}>
                  <span style={{ color: '#666' }}>Amount</span>
                  <span style={{ fontWeight: '800', color: '#dc2626' }}>
                    ₹{confirmModal.order.total}
                  </span>
                </div>
              </div>
            </div>

            {/* Keyboard Hint */}
            <div style={{
              padding: '0 24px 8px',
              textAlign: 'center',
              fontSize: '11px',
              color: '#999'
            }}>
              💡 Press{' '}
              <kbd style={{
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '1px 6px',
                fontFamily: 'monospace',
                fontWeight: '700',
                color: '#333'
              }}>Enter</kbd>{' '}
              to confirm or{' '}
              <kbd style={{
                background: '#f0f0f0',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '1px 6px',
                fontFamily: 'monospace',
                fontWeight: '700',
                color: '#333'
              }}>Esc</kbd>{' '}
              to cancel
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', padding: '8px 24px 24px' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  flex: 1, padding: '14px',
                  background: '#f0f0f0', color: '#333',
                  border: 'none', borderRadius: '12px',
                  fontSize: '14px', fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                ❌ Cancel
              </button>

              <button
                autoFocus
                onClick={
                  confirmModal.type === 'cash'
                    ? confirmCashPayment
                    : confirmPrintBill
                }
                style={{
                  flex: 2, padding: '14px',
                  background: confirmModal.type === 'cash'
                    ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff', border: 'none',
                  borderRadius: '12px', fontSize: '14px',
                  fontWeight: '800', cursor: 'pointer',
                  boxShadow: confirmModal.type === 'cash'
                    ? '0 4px 12px rgba(220, 38, 38, 0.4)'
                    : '0 4px 12px rgba(37, 99, 235, 0.4)'
                }}
              >
                {confirmModal.type === 'cash' ? '✅ Yes, Confirm' : '🖨️ Yes, Print'}
              </button>
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
          zIndex: 4000,
          maxWidth: '90%',
          animation: 'slideUp 0.25s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>

    </Layout>
  );
}

// ============================================
// Status Badge
// ============================================
function StatusBadge({ status }) {
  const map = {
    CONFIRMED: { bg: '#fef3c7', color: '#b45309', label: 'Confirmed' },
    PREPARING: { bg: '#dbeafe', color: '#1e40af', label: 'Preparing' },
    READY: { bg: '#dcfce7', color: '#16a34a', label: 'Ready' },
    COMPLETED: { bg: '#e5e7eb', color: '#374151', label: 'Done' },
    PENDING_PAYMENT: { bg: '#fee2e2', color: '#dc2626', label: '💵 Cash Pending' },
    CANCELLED: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' }
  };
  const s = map[status] || map.PENDING_PAYMENT;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700'
    }}>
      {s.label}
    </span>
  );
}

// ============================================
// Order Detail Modal
// ============================================
function OrderDetailModal({ order, onClose, onPrint }) {
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
            Order {order.token}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              fontSize: '24px',
              color: '#666',
              padding: '4px 8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ fontSize: '13px', lineHeight: 1.8, color: '#333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Order ID</span>
            <span style={{ fontWeight: '600' }}>{order.order_number}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Customer</span>
            <span style={{ fontWeight: '600' }}>{order.customer_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Mobile</span>
            <span style={{ fontWeight: '600' }}>{order.customer_mobile}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Status</span>
            <StatusBadge status={order.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Payment</span>
            <span style={{ fontWeight: '600' }}>
              {order.payment_method === 'upi' ? 'UPI' : 'Cash'} — {order.payment_status}
            </span>
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e5e5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0' }}>
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '4px 0' }}>
            <span>GST</span>
            <span>₹{order.gst}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '18px',
            fontWeight: '800',
            paddingTop: '8px',
            borderTop: '1px dashed #ccc',
            marginTop: '8px'
          }}>
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
        </div>

        {order.tracking_enabled && (
          <button
            onClick={onPrint}
            style={{
              width: '100%',
              padding: '14px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '700',
              marginTop: '16px',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Bill
          </button>
        )}
      </div>
    </div>
  );
}