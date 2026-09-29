// ============================================
// frontend-admin/src/utils/printBill.js
// Clean Bill Printing Utility
// ============================================

/**
 * Print a clean bill for an order
 * @param {Object} order - Order object with items, customer, etc.
 * @param {Object} restaurant - Restaurant details (optional)
 */
export function printBill(order, restaurant = {}) {
  const restaurantInfo = {
    name: restaurant.name || 'PUJA RESTAURANT',
    tagline: restaurant.tagline || 'Good Food • Happy Mood',
    address: restaurant.address || 'Contai, Purba Medinipur, West Bengal - 721401',
    phone: restaurant.phone || '+91 9876543210',
    gstin: restaurant.gstin || '',
    fssai: restaurant.fssai || ''
  };

  // Format items
  const items = order.items || [];
  const itemsHTML = items.map((item, i) => {
    const name = item.item_name || item.name || 'Item';
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const total = item.total || (price * qty);

    return `
      <tr>
        <td style="padding: 4px 0; border-bottom: 1px dotted #ccc;">${i + 1}. ${name}</td>
        <td style="text-align: center; padding: 4px 0; border-bottom: 1px dotted #ccc;">${qty}</td>
        <td style="text-align: right; padding: 4px 0; border-bottom: 1px dotted #ccc;">₹${price.toFixed(2)}</td>
        <td style="text-align: right; padding: 4px 0; border-bottom: 1px dotted #ccc;">₹${total.toFixed(2)}</td>
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
  const dateStr = date.toLocaleDateString('en-IN', { 
    day: '2-digit', month: '2-digit', year: 'numeric' 
  });
  const timeStr = date.toLocaleTimeString('en-IN', { 
    hour: '2-digit', minute: '2-digit' 
  });

  const paymentMethod = (order.payment_method || 'cash').toUpperCase();
  const cashReceived = order.cash_received || total;
  const changeReturned = order.change_returned || (cashReceived - total);

  // Build the HTML
  const billHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill - ${order.token}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 10px;
    }
    .bill {
      max-width: 80mm;
      margin: 0 auto;
      padding: 10px;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 16px; }
    .huge { font-size: 22px; }
    .divider {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin: 2px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
    }
    th {
      text-align: left;
      padding: 4px 0;
      border-bottom: 1px solid #000;
      font-size: 11px;
    }
    th:nth-child(2), td:nth-child(2) { text-align: center; }
    th:nth-child(3), td:nth-child(3),
    th:nth-child(4), td:nth-child(4) { text-align: right; }
    .token-box {
      border: 2px solid #000;
      padding: 8px;
      text-align: center;
      margin: 10px 0;
    }
    .token-label {
      font-size: 10px;
      letter-spacing: 2px;
    }
    .token-value {
      font-size: 36px;
      font-weight: 900;
      letter-spacing: 4px;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #000;
      font-size: 11px;
    }
    @media print {
      body { padding: 0; }
      .bill { max-width: 100%; }
      @page { margin: 5mm; size: 80mm auto; }
    }
  </style>
</head>
<body>
  <div class="bill">

    <!-- Header -->
    <div class="center">
      <div class="bold big">${restaurantInfo.name}</div>
      <div style="font-size: 10px; font-style: italic; margin-top: 2px;">
        ${restaurantInfo.tagline}
      </div>
      <div style="font-size: 10px; margin-top: 4px;">
        ${restaurantInfo.address}
      </div>
      <div style="font-size: 10px;">
        Phone: ${restaurantInfo.phone}
      </div>
      ${restaurantInfo.gstin ? `<div style="font-size: 10px;">GSTIN: ${restaurantInfo.gstin}</div>` : ''}
      ${restaurantInfo.fssai ? `<div style="font-size: 10px;">FSSAI: ${restaurantInfo.fssai}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Bill Info -->
    <div class="row"><span>Bill No:</span><span class="bold">${billNo}</span></div>
    <div class="row"><span>Date:</span><span>${dateStr}</span></div>
    <div class="row"><span>Time:</span><span>${timeStr}</span></div>
    <div class="row"><span>Order ID:</span><span>${order.order_number || '—'}</span></div>

    <!-- Token Box -->
    <div class="token-box">
      <div class="token-label">TOKEN NO</div>
      <div class="token-value">${order.token || '—'}</div>
    </div>

    <!-- Customer -->
    <div class="row"><span>Customer:</span><span class="bold">${order.customer_name || 'Guest'}</span></div>
    <div class="row"><span>Mobile:</span><span>${order.customer_mobile || '—'}</span></div>
    <div class="row"><span>Type:</span><span>${(order.order_type || 'dinein') === 'dinein' ? 'DINE-IN' : 'TAKEAWAY'}</span></div>

    <div class="divider"></div>

    <!-- Items Table -->
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
        ${itemsHTML || '<tr><td colspan="4" style="text-align:center; padding: 10px;">No items</td></tr>'}
      </tbody>
    </table>

    <div class="divider"></div>

    <!-- Totals -->
    <div class="row"><span>Subtotal:</span><span>₹${subtotal.toFixed(2)}</span></div>
    ${gst > 0 ? `
      <div class="row"><span>CGST @ 2.5%:</span><span>₹${cgst}</span></div>
      <div class="row"><span>SGST @ 2.5%:</span><span>₹${sgst}</span></div>
    ` : ''}

    <div class="double-divider"></div>
    <div class="row bold big">
      <span>GRAND TOTAL:</span>
      <span>₹${total.toFixed(2)}</span>
    </div>
    <div class="double-divider"></div>

    <!-- Payment -->
    <div style="margin-top: 8px;">
      <div class="row"><span>Payment:</span><span class="bold">${paymentMethod}</span></div>
      ${paymentMethod === 'CASH' ? `
        <div class="row"><span>Cash Received:</span><span>₹${cashReceived.toFixed(2)}</span></div>
        <div class="row"><span>Change Returned:</span><span>₹${changeReturned.toFixed(2)}</span></div>
      ` : ''}
      <div class="row bold"><span>Status:</span><span>✅ PAID</span></div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="bold">THANK YOU!</div>
      <div style="margin-top: 2px;">Visit Again 🙏</div>
      <div style="margin-top: 8px; font-size: 10px;">
        www.pujarestaurant.com
      </div>
    </div>

  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 100);
      }, 200);
    };
  </script>
</body>
</html>
  `;

  // Open in new window (hidden iframe approach doesn't work well for print)
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    alert('❌ Please allow popups for this site to print bills');
    return;
  }
  printWindow.document.write(billHTML);
  printWindow.document.close();
}