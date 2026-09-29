// ============================================
// frontend-admin/src/utils/printBill.js
// 80mm Thermal Bill Printing Utility
// ============================================

export function printBill(order, restaurant = {}) {
  const restaurantInfo = {
    name: restaurant.name || 'PUJA RESTAURANT',
    tagline: restaurant.tagline || 'Good Food • Happy Mood',
    address: restaurant.address || 'Contai, Purba Medinipur, WB - 721401',
    phone: restaurant.phone || '+91 9876543210',
    gstin: restaurant.gstin || '',
    fssai: restaurant.fssai || ''
  };

  const items = order.items || [];
  const itemsHTML = items.map((item) => {
    const name = item.item_name || item.name || 'Item';
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const total = item.total || (price * qty);

    return `
      <tr>
        <td style="padding:2px 0;">${name}</td>
        <td style="text-align:center; padding:2px 0;">${qty}</td>
        <td style="text-align:right; padding:2px 0;">${price.toFixed(0)}</td>
        <td style="text-align:right; padding:2px 0;">${total.toFixed(0)}</td>
      </tr>
    `;
  }).join('');

  const subtotal = order.subtotal || 0;
  const gst = order.gst || 0;
  const cgst = (gst / 2).toFixed(2);
  const sgst = (gst / 2).toFixed(2);
  const total = order.total || 0;

  const billNo = order.bill_no || order.bill_number || `INV-${Date.now().toString().slice(-6)}`;
  const date = new Date(order.created_at || Date.now());
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const paymentMethod = (order.payment_method || 'cash').toUpperCase();
  const cashReceived = order.cash_received || total;
  const changeReturned = order.change_returned || Math.max(0, cashReceived - total);

  const billHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill - ${order.token}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 80mm;
      max-width: 80mm;
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
    }

    body {
      padding: 2mm;
    }

    .header-title {
      font-size: 16px;
      font-weight: 900;
      text-align: center;
      letter-spacing: 1px;
    }

    .header-sub {
      font-size: 9px;
      text-align: center;
      margin-top: 1px;
    }

    .divider {
      border-top: 1px dashed #000;
      margin: 3px 0;
    }

    .solid-divider {
      border-top: 1px solid #000;
      margin: 3px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin: 1px 0;
    }

    .bold { font-weight: bold; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin: 3px 0;
    }

    th {
      text-align: left;
      padding: 2px 0;
      border-bottom: 1px solid #000;
      font-size: 10px;
      font-weight: 700;
    }

    th:nth-child(2), td:nth-child(2) { text-align: center; width: 15%; }
    th:nth-child(3), td:nth-child(3) { text-align: right; width: 20%; }
    th:nth-child(4), td:nth-child(4) { text-align: right; width: 20%; }

    .token-box {
      border: 2px solid #000;
      padding: 4px;
      text-align: center;
      margin: 4px 0;
    }

    .token-label {
      font-size: 9px;
      letter-spacing: 2px;
      font-weight: 700;
    }

    .token-value {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: 3px;
      line-height: 1;
      margin: 2px 0;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 900;
      padding: 2px 0;
    }

    .footer {
      text-align: center;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #000;
      font-size: 10px;
    }

    @media print {
      html, body {
        width: 80mm;
        max-width: 80mm;
        padding: 0;
        margin: 0;
      }
      body { padding: 1mm; }
    }

    @media screen {
      body {
        margin: 0 auto;
        background: #f5f5f5;
        padding: 20px;
      }
      .bill-wrapper {
        width: 80mm;
        background: #fff;
        padding: 4mm;
        margin: 0 auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        min-height: 100vh;
      }
    }
  </style>
</head>
<body>
  <div class="bill-wrapper">

    <div class="header-title">${restaurantInfo.name}</div>
    <div class="header-sub" style="font-style:italic;">${restaurantInfo.tagline}</div>
    <div class="header-sub">${restaurantInfo.address}</div>
    <div class="header-sub">Ph: ${restaurantInfo.phone}</div>
    ${restaurantInfo.gstin ? `<div class="header-sub">GSTIN: ${restaurantInfo.gstin}</div>` : ''}

    <div class="solid-divider"></div>

    <div class="row"><span>Bill No:</span><span class="bold">${billNo}</span></div>
    <div class="row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="row"><span>Time:</span><span>${timeStr}</span></div>
    <div class="row"><span>Order ID:</span><span>${order.order_number || '—'}</span></div>

    <div class="token-box">
      <div class="token-label">TOKEN NO</div>
      <div class="token-value">${order.token || '—'}</div>
    </div>

    <div class="row"><span>Customer:</span><span class="bold">${order.customer_name || 'Guest'}</span></div>
    <div class="row"><span>Mobile:</span><span>${order.customer_mobile || '—'}</span></div>
    <div class="row"><span>Type:</span><span>${(order.order_type || 'dinein') === 'dinein' ? 'DINE-IN' : 'TAKEAWAY'}</span></div>

    <div class="divider"></div>

    <table>
      <thead>
        <tr>
          <th>ITEM</th>
          <th>QTY</th>
          <th>RATE</th>
          <th>AMT</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML || '<tr><td colspan="4" style="text-align:center;padding:6px;">No items</td></tr>'}
      </tbody>
    </table>

    <div class="divider"></div>

    <div class="row"><span>Subtotal</span><span>₹${subtotal.toFixed(2)}</span></div>
    ${gst > 0 ? `
      <div class="row"><span>CGST @ 2.5%</span><span>₹${cgst}</span></div>
      <div class="row"><span>SGST @ 2.5%</span><span>₹${sgst}</span></div>
    ` : ''}

    <div class="solid-divider"></div>
    <div class="total-row">
      <span>GRAND TOTAL</span>
      <span>₹${total.toFixed(2)}</span>
    </div>
    <div class="solid-divider"></div>

    <div style="margin-top:4px;">
      <div class="row"><span>Payment</span><span class="bold">${paymentMethod}</span></div>
      ${paymentMethod === 'CASH' ? `
        <div class="row"><span>Received</span><span>₹${cashReceived.toFixed(2)}</span></div>
        <div class="row"><span>Change</span><span>₹${changeReturned.toFixed(2)}</span></div>
      ` : ''}
      <div class="row bold"><span>Status</span><span>✅ PAID</span></div>
    </div>

    <div class="footer">
      <div class="bold" style="font-size:12px;">THANK YOU!</div>
      <div style="margin-top:2px;">Visit Again 🙏</div>
      <div style="margin-top:4px;font-size:9px;">www.pujarestaurant.com</div>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
    window.onafterprint = function() {
      setTimeout(function() { window.close(); }, 200);
    };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=340,height=700,scrollbars=yes,resizable=yes');

  if (!printWindow) {
    alert('❌ Please allow popups to print bills');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(billHTML);
  printWindow.document.close();
}