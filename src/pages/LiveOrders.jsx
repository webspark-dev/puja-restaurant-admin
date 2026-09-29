// ============================================
// frontend-admin/src/pages/LiveOrders.jsx
// ============================================

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { RESTAURANT_ID } from '../services/api';
import './LiveOrders.css';

const STATUS_COLORS = {
  awaiting_payment: '#f59e0b',
  placed:           '#f59e0b',
  confirmed:        '#3b82f6',
  preparing:        '#8b5cf6',
  ready:            '#10b981',
  completed:        '#6b7280'
};

function LiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

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

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket', 'polling']
    });

    socket.emit('joinRestaurant', RESTAURANT_ID);

    socket.on('newOrder', (order) => {
      setOrders(prev => [...prev, order]);
    });

    socket.on('orderUpdate', () => fetchOrders());

    return () => socket.disconnect();
  }, []);

  // ============================================
  // STEP 2: Confirm Cash Payment
  // ============================================
  const handleSettleCash = async (orderId) => {
    const confirmed = window.confirm(
      '💵 Confirm cash payment received?\n\n' +
      'Token will be generated. Customer will see "Payment Successful".'
    );
    if (!confirmed) return;

    setActionLoading(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await api.patch(`/api/order/${orderId}/settle-cash`);

      if (res.data.success) {
        alert('✅ Payment confirmed! Now click "Print Bill".');
        await fetchOrders();
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // ============================================
  // STEP 3: Print Bill → Tracking ON
  // ============================================
  const handlePrintBill = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId]: true }));

    try {
      const res = await api.patch(`/api/order/${orderId}/print-bill`);

      if (res.data.success) {
        alert('✅ Bill printed! Customer tracking is now active.');
        await fetchOrders();

        // 🖨️ Print bill (browser)
        setTimeout(() => window.print(), 500);
      }
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      await api.patch(`/api/order/${orderId}/status`, { status: newStatus });
      await fetchOrders();
    } catch (err) {
      alert('❌ ' + (err.response?.data?.error || err.message));
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
          const cashPending = isCash && !order.is_cash_settled;
          const waitingBill = isCash && order.is_cash_settled && !order.tracking_enabled;
          const trackingOn = order.tracking_enabled;
          const busy = actionLoading[order.id];

          // Status buttons disabled logic
          const statusLocked = isCash && !trackingOn;

          return (
            <div key={order.id} className="lo-card">
              {/* Header */}
              <div className="lo-card-header">
                <div>
                  <h3>{order.token || order.order_number}</h3>
                  <span className="lo-time">
                    {new Date(order.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <span
                  className="lo-status"
                  style={{ background: STATUS_COLORS[order.status] || '#666' }}
                >
                  {order.status.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              {/* Customer */}
              <div className="lo-customer">
                <p><strong>👤</strong> {order.customer_name}</p>
                <p><strong>📱</strong> {order.customer_mobile}</p>
              </div>

              {/* Items */}
              <div className="lo-items">
                {(order.items || []).map((item, i) => (
                  <div key={i} className="lo-item">
                    <span>{item.item_name || item.name} × {item.quantity}</span>
                    <span>₹{item.total || (item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Total + Payment */}
              <div className="lo-total">
                <span>Total</span>
                <strong>₹{order.total}</strong>
              </div>

              <div className="lo-payment">
                <span className={`lo-pay-badge ${order.payment_method}`}>
                  {isCash ? '💵 Cash' : '💳 Online'}
                </span>
                {isCash && (
                  <span className={order.is_cash_settled ? 'cash-ok' : 'cash-pending'}>
                    {order.is_cash_settled ? '✅ Paid' : '⚠️ Unpaid'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="lo-actions">

                {/* STEP 1: Cash Pending → Confirm Cash Button */}
                {cashPending && (
                  <button
                    className="btn-cash-confirm"
                    onClick={() => handleSettleCash(order.id)}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '💵 Confirm Cash Payment'}
                  </button>
                )}

                {/* STEP 2: Cash Confirmed → Print Bill Button */}
                {waitingBill && (
                  <button
                    className="btn-print-bill"
                    onClick={() => handlePrintBill(order.id)}
                    disabled={busy}
                  >
                    {busy ? '⏳' : '🖨️ Print Bill'}
                  </button>
                )}

                {/* Badges */}
                {isCash && order.is_cash_settled && (
                  <div className="badge-cash-paid">
                    ✅ Payment Successful
                  </div>
                )}

                {trackingOn && isCash && (
                  <div className="badge-tracking-on">
                    📊 Tracking Enabled
                  </div>
                )}

                {/* Status Buttons — LOCKED if cash && !tracking_enabled */}
                <button
                  className="btn-status btn-confirm"
                  onClick={() => handleStatusChange(order.id, 'confirmed')}
                  disabled={busy || statusLocked || order.status !== 'placed'}
                  title={statusLocked ? '🖨️ Print bill first' : ''}
                >
                  Confirm
                </button>

                <button
                  className="btn-status btn-prepare"
                  onClick={() => handleStatusChange(order.id, 'preparing')}
                  disabled={busy || statusLocked || order.status === 'preparing'}
                  title={statusLocked ? '🖨️ Print bill first' : ''}
                >
                  Preparing
                </button>

                <button
                  className="btn-status btn-ready"
                  onClick={() => handleStatusChange(order.id, 'ready')}
                  disabled={busy || statusLocked || order.status === 'ready'}
                >
                  Ready
                </button>

                <button
                  className="btn-status btn-complete"
                  onClick={() => handleStatusChange(order.id, 'completed')}
                  disabled={busy || statusLocked}
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
