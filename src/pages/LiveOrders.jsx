// ============================================
// frontend-admin/src/pages/LiveOrders.jsx
// ============================================

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { RESTAURANT_ID } from '../services/api';
import './LiveOrders.css';

const STATUS_COLORS = {
  placed:    '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready:     '#10b981',
  completed: '#6b7280'
};

function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // ============================================
  // Fetch orders
  // ============================================
  const fetchOrders = async () => {
    try {
      const res = await api.get(`/api/order/live?restaurant_id=${RESTAURANT_ID}`);
      setOrders(res.data.orders || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 20000);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // Socket.IO for real-time
  // ============================================
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket', 'polling']
    });

    socket.emit('joinRestaurant', RESTAURANT_ID);

    socket.on('newOrder', (order) => {
      setOrders(prev => [...prev, order]);
    });

    socket.on('orderUpdate', () => {
      fetchOrders();
    });

    return () => socket.disconnect();
  }, []);

  // ============================================
  // Settle cash handler
  // ============================================
  const handleSettleCash = async (orderId) => {
    const confirmed = window.confirm(
      '💵 Confirm cash received & print bill?\n\n' +
      'After this, customer tracking will start.'
    );
    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await api.patch(`/api/order/${orderId}/settle-cash`);

      if (res.data.success) {
        alert('✅ Cash settled! Bill printed. Customer can now track.');
        await fetchOrders();

        // Optional: trigger bill print
        window.print();
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ============================================
  // Status update handler
  // ============================================
  const handleStatusChange = async (orderId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [orderId]: true }));

    try {
      await api.patch(`/api/order/${orderId}/status`, { status: newStatus });
      await fetchOrders();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert('❌ ' + msg);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  if (loading) return <div className="lo-loading">⏳ Loading orders...</div>;
  if (error) return <div className="lo-error">❌ {error}</div>;

  return (
    <div className="lo-container">
      <div className="lo-header">
        <h1>🔥 Live Orders</h1>
        <span className="lo-count">{orders.length} active</span>
      </div>

      {orders.length === 0 && (
        <div className="lo-empty">No active orders right now</div>
      )}

      <div className="lo-grid">
        {orders.map(order => {
          const isCash = order.payment_method === 'cash';
          const isCashPending = isCash && !order.is_cash_settled;
          const busy = actionLoading[order.id];

          return (
            <div key={order.id} className="lo-card">
              {/* Header */}
              <div className="lo-card-header">
                <div>
                  <h3>{order.token_number || order.order_number}</h3>
                  <span className="lo-time">
                    {new Date(order.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <span
                  className="lo-status"
                  style={{ background: STATUS_COLORS[order.status] || '#666' }}
                >
                  {order.status.toUpperCase()}
                </span>
              </div>

              {/* Customer info */}
              <div className="lo-customer">
                <p><strong>👤</strong> {order.customer_name}</p>
                <p><strong>📱</strong> {order.customer_mobile}</p>
              </div>

              {/* Items */}
              <div className="lo-items">
                {order.items && order.items.map((item, i) => (
                  <div key={i} className="lo-item">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total + Payment */}
              <div className="lo-total">
                <span>Total</span>
                <strong>₹{order.total_amount}</strong>
              </div>

              <div className="lo-payment">
                <span className={`lo-pay-badge ${order.payment_method}`}>
                  {isCash ? '💵 Cash' : '💳 Online'}
                </span>
                {isCash && (
                  <span className={order.is_cash_settled ? 'cash-ok' : 'cash-pending'}>
                    {order.is_cash_settled ? '✅ Settled' : '⚠️ Pending'}
                  </span>
                )}
              </div>

              {/* 🚨 Actions */}
              <div className="lo-actions">
                {isCashPending && (
                  <button
                    className="btn-cash-settle"
                    onClick={() => handleSettleCash(order.id)}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '💵 Cash Received & Print Bill'}
                  </button>
                )}

                <button
                  className="btn-status btn-confirm"
                  onClick={() => handleStatusChange(order.id, 'confirmed')}
                  disabled={busy || order.status !== 'placed'}
                >
                  Confirm
                </button>

                <button
                  className="btn-status btn-prepare"
                  onClick={() => handleStatusChange(order.id, 'preparing')}
                  disabled={busy || isCashPending || order.status === 'preparing'}
                  title={isCashPending ? 'Settle cash first' : ''}
                >
                  Preparing
                </button>

                <button
                  className="btn-status btn-ready"
                  onClick={() => handleStatusChange(order.id, 'ready')}
                  disabled={busy || isCashPending || order.status === 'ready'}
                >
                  Ready
                </button>

                <button
                  className="btn-status btn-complete"
                  onClick={() => handleStatusChange(order.id, 'completed')}
                  disabled={busy || isCashPending}
                >
                  Completed
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiveOrders;