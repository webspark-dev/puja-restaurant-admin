import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboardAPI, ordersAPI } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [cashPending, setCashPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const socket = connectSocket();
    socket.emit('admin:join');

    socket.on('order:new', () => loadData());
    socket.on('order:confirmed', () => loadData());
    socket.on('order:status', () => loadData());

    return () => {
      socket.off('order:new');
      socket.off('order:confirmed');
      socket.off('order:status');
    };
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, liveRes, cashRes] = await Promise.all([
        dashboardAPI.stats(),
        ordersAPI.live(),
        ordersAPI.cashPending()
      ]);
      setStats(statsRes.data);
      setLiveOrders(liveRes.data.orders || []);
      setCashPending(cashRes.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div className="loader"></div>
          <p style={{ marginTop: '16px', color: '#666' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <StatCard
          label="Today Orders"
          value={stats?.today?.total_orders || 0}
          icon="📦"
          color="#2563eb"
        />
        <StatCard
          label="Today Sales"
          value={`₹${stats?.today?.total_sales || 0}`}
          icon="💰"
          color="#16a34a"
        />
        <StatCard
          label="Live Orders"
          value={stats?.live?.total || 0}
          icon="🔔"
          color="#f59e0b"
        />
        <StatCard
          label="Cash Pending"
          value={stats?.live?.cash_pending || 0}
          icon="💵"
          color="#dc2626"
          onClick={() => navigate('/cash-pending')}
        />
      </div>

      {/* Payment Breakdown */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '700',
          marginBottom: '14px'
        }}>
          💳 Payment Summary
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            flex: 1,
            background: '#dbeafe',
            padding: '12px',
            borderRadius: '10px'
          }}>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700' }}>
              UPI
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
              ₹{stats?.today?.upi_sales || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats?.today?.upi_orders || 0} orders
            </div>
          </div>
          <div style={{
            flex: 1,
            background: '#dcfce7',
            padding: '12px',
            borderRadius: '10px'
          }}>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>
              CASH
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>
              ₹{stats?.today?.cash_sales || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>
              {stats?.today?.cash_orders || 0} orders
            </div>
          </div>
        </div>
      </div>

      {/* Live Order Status */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: '700',
          marginBottom: '14px'
        }}>
          ⚡ Live Status
        </h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            background: '#fef3c7',
            borderRadius: '10px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#b45309' }}>
              {stats?.live?.confirmed || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#92400e', fontWeight: '700' }}>
              Confirmed
            </div>
          </div>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            background: '#dbeafe',
            borderRadius: '10px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e40af' }}>
              {stats?.live?.preparing || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '700' }}>
              Preparing
            </div>
          </div>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '10px',
            background: '#dcfce7',
            borderRadius: '10px'
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>
              {stats?.live?.ready || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#166534', fontWeight: '700' }}>
              Ready
            </div>
          </div>
        </div>
      </div>

      {/* Recent Live Orders */}
      <div style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '18px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700' }}>
            🔔 Recent Live Orders
          </h3>
          <button
            onClick={() => navigate('/orders')}
            style={{
              background: 'none',
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: '700'
            }}
          >
            View All →
          </button>
        </div>

        {liveOrders.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
            No live orders
          </p>
        ) : (
          liveOrders.slice(0, 5).map(order => (
            <div
              key={order.id}
              onClick={() => navigate('/orders')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #f0f0f0',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '700',
                  marginBottom: '2px'
                }}>
                  {order.token} • {order.customer_name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {order.order_type === 'dinein' ? '🍽️ Dine-in' : '🥡 Takeaway'}
                  {' • '}
                  ₹{order.total}
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>
          ))
        )}
      </div>

    </Layout>
  );
}

function StatCard({ label, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color, marginBottom: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#666' }}>{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    CONFIRMED: { bg: '#fef3c7', color: '#b45309', label: '🟡 Confirmed' },
    PREPARING: { bg: '#dbeafe', color: '#1e40af', label: '🔵 Preparing' },
    READY: { bg: '#dcfce7', color: '#16a34a', label: '🟢 Ready' },
    COMPLETED: { bg: '#e5e7eb', color: '#374151', label: '⚪ Done' },
    PENDING_PAYMENT: { bg: '#fee2e2', color: '#dc2626', label: '🔴 Pending' }
  };
  const s = map[status] || map.PENDING_PAYMENT;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700'
    }}>
      {s.label}
    </span>
  );
}