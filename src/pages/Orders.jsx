import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ordersAPI } from '../services/api';
import { connectSocket } from '../services/socket';

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
  // STEP 1: CONFIRM CASH PAYMENT
  // After this: order moves from Live → Bill Pending
  // ============================================
  const handleCashPay = async (order) => {
    const confirmed = window.confirm(
      `💵 Confirm Cash Payment?\n\n` +
      `Token: ${order.token}\n` +
      `Customer: ${order.customer_name}\n` +
      `Amount: ₹${order.total}\n\n` +
      `Customer will see "Payment Successful".`
    );

    if (!confirmed) return;

    setUpdatingId(order.id);

    try {
      const res = await ordersAPI.settleCash(order.id);

      if (res.data.success) {
        setToast({
          type: 'success',
          message: `✅ ${order.token} — Payment Confirmed! Bill print করুন।`
        });
        await loadData();
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
  // STEP 2: PRINT BILL — After this, order moves to Live with status buttons
  // ============================================
  const handlePrintBill = async (order) => {
    const confirmed = window.confirm(
      `🖨️ Print Bill?\n\n` +
      `Token: ${order.token}\n` +
      `Amount: ₹${order.total}\n\n` +
      `Customer tracking will start.`
    );

    if (!confirmed) return;

    setUpdatingId(order.id);

    try {
      const res = await ordersAPI.printBill(order.id);

      if (res.data.success) {
        // 🖨️ Trigger browser print
        setTimeout(() => window.print(), 300);

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
  // STEP 3: UPDATE STATUS
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
        message: `${targetOrder.token} → COMPLETED ✓`
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

  // ============================================
  // 🎯 SPLIT ORDERS INTO 3 GROUPS
  // ============================================
  
  // Group 1: CASH PENDING — awaiting admin confirmation
  const cashPendingOrders = liveOrders.filter(o =>
    o.status === 'PENDING_PAYMENT' && o.payment_method === 'cash'
  );

  // Group 2: BILL PENDING — cash confirmed, waiting for print
  const billPendingOrders = liveOrders.filter(o =>
    o.payment_method === 'cash' &&
    o.is_cash_settled === true &&
    o.tracking_enabled === false
  );

  // Group 3: LIVE — normal orders with status buttons
  const activeLiveOrders = liveOrders.filter(o =>
    !cashPendingOrders.includes(o) && !billPendingOrders.includes(o)
  );

  const filteredLive = activeLiveOrders.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

  const filteredHistory = history.filter(o => {
    if (filter === 'all') return true;
    return o.status === filter;
  });

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
          🔔 Live ({cashPendingOrders.length + billPendingOrders.length + activeLiveOrders.length})
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

      {activeTab === 'live' && (
        <>
          {/* ============================================
              SECTION 1: CASH PENDING (Top — needs attention)
             ============================================ */}
          {cashPendingOrders.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', padding: '8px 12px',
                background: '#fee2e2', borderRadius: '10px',
                borderLeft: '4px solid #dc2626'
              }}>
                <span style={{ fontSize: '20px' }}>💵</span>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#991b1b', margin: 0 }}>
                  Cash Payment Pending ({cashPendingOrders.length})
                </h3>
              </div>

              {cashPendingOrders.map(order => {
                const isUpdating = updatingId === order.id;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '16px',
                      marginBottom: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: '4px solid #dc2626',
                      opacity: isUpdating ? 0.5 : 1
                    }}
                  >
                    <OrderCardHeader order={order} />
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        disabled={isUpdating}
                        style={{
                          flex: 1, padding: '12px', background: '#f0f0f0',
                          color: '#333', borderRadius: '8px',
                          fontSize: '13px', fontWeight: '700',
                          border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        👁️ View
                      </button>

                      <button
                        onClick={() => handleCashPay(order)}
                        disabled={isUpdating}
                        style={{
                          flex: 2, padding: '12px',
                          background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                          color: '#fff', borderRadius: '8px',
                          fontSize: '14px', fontWeight: '800',
                          border: 'none',
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          animation: 'pulse 2s infinite',
                          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
                        }}
                      >
                        {isUpdating ? '⏳ Processing...' : '💵 Confirm Cash Payment'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================
              SECTION 2: BILL PENDING (Cash confirmed, need print)
             ============================================ */}
          {billPendingOrders.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', padding: '8px 12px',
                background: '#dbeafe', borderRadius: '10px',
                borderLeft: '4px solid #2563eb'
              }}>
                <span style={{ fontSize: '20px' }}>🖨️</span>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1e40af', margin: 0 }}>
                  Bill Pending — Print to Enable Tracking ({billPendingOrders.length})
                </h3>
              </div>

              {billPendingOrders.map(order => {
                const isUpdating = updatingId === order.id;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '16px',
                      marginBottom: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      borderLeft: '4px solid #2563eb',
                      opacity: isUpdating ? 0.5 : 1
                    }}
                  >
                    <OrderCardHeader order={order} paid />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        disabled={isUpdating}
                        style={{
                          flex: 1, padding: '12px', background: '#f0f0f0',
                          color: '#333', borderRadius: '8px',
                          fontSize: '13px', fontWeight: '700',
                          border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        👁️ View
                      </button>

                      <button
                        onClick={() => handlePrintBill(order)}
                        disabled={isUpdating}
                        style={{
                          flex: 2, padding: '12px',
                          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                          color: '#fff', borderRadius: '8px',
                          fontSize: '14px', fontWeight: '800',
                          border: 'none',
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          animation: 'pulse 2s infinite',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                        }}
                      >
                        {isUpdating ? '⏳ Printing...' : '🖨️ Print Bill & Start Tracking'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================
              SECTION 3: ACTIVE LIVE ORDERS (Tracking ON)
             ============================================ */}
          {activeLiveOrders.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px', padding: '8px 12px',
                background: '#dcfce7', borderRadius: '10px',
                borderLeft: '4px solid #16a34a'
              }}>
                <span style={{ fontSize: '20px' }}>📊</span>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#166534', margin: 0 }}>
                  Live Tracking Active ({activeLiveOrders.length})
                </h3>
              </div>

              {/* Filters for active orders only */}
              <div style={{
                display: 'flex', gap: '8px', overflowX: 'auto',
                marginBottom: '12px', paddingBottom: '4px'
              }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'CONFIRMED', label: '🟡 Confirmed' },
                  { key: 'PREPARING', label: '🔵 Preparing' },
                  { key: 'READY', label: '🟢 Ready' }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    style={{
                      padding: '8px 14px', borderRadius: '20px',
                      whiteSpace: 'nowrap',
                      background: filter === f.key ? '#2563eb' : '#fff',
                      color: filter === f.key ? '#fff' : '#666',
                      fontSize: '12px', fontWeight: '700',
                      border: '1px solid #e5e5e5', cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredLive.map(order => {
                const isUpdating = updatingId === order.id;
                return (
                  <div
                    key={order.id}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      padding: '16px',
                      marginBottom: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      borderLeft: '4px solid #16a34a',
                      opacity: isUpdating ? 0.5 : 1
                    }}
                  >
                    <OrderCardHeader order={order} paid tracking />

                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        disabled={isUpdating}
                        style={{
                          flex: 1, padding: '10px', background: '#f0f0f0',
                          color: '#333', borderRadius: '8px',
                          fontSize: '13px', fontWeight: '700',
                          border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                        }}
                      >
                        👁️ View
                      </button>

                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          disabled={isUpdating}
                          style={{
                            flex: 2, padding: '10px', background: '#2563eb',
                            color: '#fff', borderRadius: '8px',
                            fontSize: '13px', fontWeight: '700',
                            border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                          }}
                        >
                          👨‍🍳 Start Preparing
                        </button>
                      )}

                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'READY')}
                          disabled={isUpdating}
                          style={{
                            flex: 2, padding: '10px', background: '#16a34a',
                            color: '#fff', borderRadius: '8px',
                            fontSize: '13px', fontWeight: '700',
                            border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✅ Mark Ready
                        </button>
                      )}

                      {order.status === 'READY' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          disabled={isUpdating}
                          style={{
                            flex: 2, padding: '10px', background: '#16a34a',
                            color: '#fff', borderRadius: '8px',
                            fontSize: '13px', fontWeight: '700',
                            border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer'
                          }}
                        >
                          ✓ Complete Order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {cashPendingOrders.length === 0 &&
           billPendingOrders.length === 0 &&
           activeLiveOrders.length === 0 && (
            <div style={{
              background: '#fff', borderRadius: '14px',
              padding: '60px 20px', textAlign: 'center', color: '#999'
            }}>
              No live orders
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {filteredHistory.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: '14px',
              padding: '60px 20px', textAlign: 'center', color: '#999'
            }}>
              No orders in history
            </div>
          ) : (
            filteredHistory.map(order => (
              <div
                key={order.id}
                style={{
                  background: '#fff', borderRadius: '14px',
                  padding: '16px', marginBottom: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <OrderCardHeader order={order} paid />
              </div>
            ))
          )}
        </>
      )}

      {/* Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrint={() => handlePrintBill(selectedOrder)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '14px 24px', borderRadius: '12px',
          fontSize: '14px', fontWeight: '700',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 2000, maxWidth: '90%'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
      `}</style>
    </Layout>
  );
}

// ============================================
// Order Card Header Component
// ============================================
function OrderCardHeader({ order, paid, tracking }) {
  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#e23744' }}>
              {order.token}
            </div>
            <StatusBadge status={order.status} />
            {paid && (
              <span style={{
                background: '#dcfce7', color: '#16a34a',
                padding: '3px 8px', borderRadius: '20px',
                fontSize: '11px', fontWeight: '700'
              }}>
                ✅ Paid
              </span>
            )}
            {tracking && (
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
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a1a1a' }}>
            ₹{order.total}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {order.order_type === 'dinein' ? '🍽️ Dine-in' : '🥡 Takeaway'}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: '12px', fontSize: '12px',
        color: '#666', paddingBottom: '8px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <span>{order.payment_method === 'upi' ? '📱 UPI' : '💵 Cash'}</span>
        <span>{order.payment_status === 'PAID' ? '✅ Paid' : '⏳ Pending'}</span>
        <span>
          🕐 {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </>
  );
}

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
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '11px', fontWeight: '700'
    }}>
      {s.label}
    </span>
  );
}

function OrderDetailModal({ order, onClose, onPrint }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px',
          maxWidth: '500px', width: '100%',
          maxHeight: '90vh', overflowY: 'auto', padding: '24px'
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>
            Order {order.token}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', fontSize: '24px', color: '#666',
              padding: '4px 8px', border: 'none', cursor: 'pointer'
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
          marginTop: '16px', paddingTop: '16px',
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
            display: 'flex', justifyContent: 'space-between',
            fontSize: '18px', fontWeight: '800',
            paddingTop: '8px', borderTop: '1px dashed #ccc',
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
              width: '100%', padding: '14px',
              background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '700',
              marginTop: '16px', cursor: 'pointer'
            }}
          >
            🖨️ Print Bill
          </button>
        )}
      </div>
    </div>
  );
}