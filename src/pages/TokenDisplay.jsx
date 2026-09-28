import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { connectSocket } from '../services/socket';

export default function TokenDisplay() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    loadData();

    const socket = connectSocket();
    socket.emit('admin:join');

    socket.on('order:confirmed', () => loadData());
    socket.on('order:status', () => loadData());

    // Auto refresh every 15 sec
    const interval = setInterval(loadData, 15000);

    // Clock update
    const clockInterval = setInterval(() => setTime(new Date()), 1000);

    return () => {
      socket.off('order:confirmed');
      socket.off('order:status');
      clearInterval(interval);
      clearInterval(clockInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      const res = await ordersAPI.live();
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const readyOrders = orders.filter(o =>
    o.status === 'READY' && o.payment_status === 'PAID'
  );
  const preparingOrders = orders.filter(o =>
    o.status === 'PREPARING' && o.payment_status === 'PAID'
  );
  const confirmedOrders = orders.filter(o =>
    o.status === 'CONFIRMED' && o.payment_status === 'PAID'
  );

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div className="loader" style={{ borderColor: '#333', borderTopColor: '#16a34a' }}></div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column'
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '20px',
        borderBottom: '2px solid #1a1a1a'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '1px',
            marginBottom: '4px'
          }}>
            🍽️ PUJA RESTAURANT
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Order Status Display
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '900',
            fontFamily: 'monospace',
            color: '#16a34a'
          }}>
            {time.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            })}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {time.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: readyOrders.length > 0 ? '1.5fr 1fr 1fr' : '1fr 1fr',
        gap: '20px',
        marginBottom: '20px'
      }}>

        {/* READY Section (largest) */}
        {readyOrders.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #16a34a, #0e7a37)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 40px rgba(22, 163, 74, 0.3)',
            animation: 'glow 2s infinite'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: '900',
              letterSpacing: '2px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>🔔</span>
              READY FOR PICKUP
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '12px',
              flex: 1,
              alignContent: 'flex-start'
            }}>
              {readyOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '14px',
                    padding: '16px',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <div style={{
                    fontSize: '32px',
                    fontWeight: '900',
                    letterSpacing: '2px',
                    marginBottom: '4px',
                    textShadow: '0 2px 10px rgba(0,0,0,0.3)'
                  }}>
                    {order.token}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    opacity: 0.9,
                    fontWeight: '600'
                  }}>
                    {order.customer_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PREPARING Section */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb, #1e40af)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '900',
            letterSpacing: '2px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '24px' }}>👨‍🍳</span>
            PREPARING
            <span style={{
              marginLeft: 'auto',
              fontSize: '20px',
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 12px',
              borderRadius: '20px'
            }}>
              {preparingOrders.length}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
            flex: 1,
            alignContent: 'flex-start'
          }}>
            {preparingOrders.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                opacity: 0.5,
                fontSize: '13px',
                paddingTop: '20px'
              }}>
                No orders preparing
              </div>
            ) : (
              preparingOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '12px 8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    letterSpacing: '1px'
                  }}>
                    {order.token}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CONFIRMED Section */}
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b, #b45309)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '900',
            letterSpacing: '2px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '24px' }}>📋</span>
            IN QUEUE
            <span style={{
              marginLeft: 'auto',
              fontSize: '20px',
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 12px',
              borderRadius: '20px'
            }}>
              {confirmedOrders.length}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
            flex: 1,
            alignContent: 'flex-start'
          }}>
            {confirmedOrders.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                opacity: 0.5,
                fontSize: '13px',
                paddingTop: '20px'
              }}>
                No orders in queue
              </div>
            ) : (
              confirmedOrders.map(order => (
                <div
                  key={order.id}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '12px 8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <div style={{
                    fontSize: '22px',
                    fontWeight: '900',
                    letterSpacing: '1px'
                  }}>
                    {order.token}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '20px',
        borderTop: '2px solid #1a1a1a',
        fontSize: '13px',
        color: '#666'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span>📦 Active Orders: <strong style={{ color: '#fff' }}>{orders.length}</strong></span>
          <span>✅ Ready: <strong style={{ color: '#16a34a' }}>{readyOrders.length}</strong></span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 16px',
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          ⬅️ Exit Display
        </button>
      </div>

      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 40px rgba(22, 163, 74, 0.3); }
          50% { box-shadow: 0 0 60px rgba(22, 163, 74, 0.6); }
        }
      `}</style>
    </div>
  );
}