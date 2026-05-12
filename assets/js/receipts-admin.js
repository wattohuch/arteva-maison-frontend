/**
 * Receipts Admin — List, search, edit any order receipt
 * All changes persist to the Order model and are reflected in receipt generation + print
 */

(function () {
    'use strict';

    let _allOrders = [];
    let _currentEditOrder = null;

    // ── Load receipts when section becomes visible ──
    window.addEventListener('hashchange', function () {
        if (location.hash === '#receipts') loadReceipts();
    });
    document.addEventListener('DOMContentLoaded', function () {
        if (location.hash === '#receipts') loadReceipts();

        // Search
        var searchEl = document.getElementById('receiptSearch');
        if (searchEl) searchEl.addEventListener('input', renderReceiptsTable);

        // Filter
        var filterEl = document.getElementById('receiptStatusFilter');
        if (filterEl) filterEl.addEventListener('change', renderReceiptsTable);
    });

    async function loadReceipts() {
        var tbody = document.getElementById('receiptsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--admin-text-muted);">Loading receipts...</td></tr>';

        try {
            var token = localStorage.getItem('token');
            var baseUrl = window.API_BASE_URL || (window.Config && Config.API_BASE_URL) || '';
            var API_BASE = baseUrl.replace(/\/api\/?$/, '');
            var res = await fetch(API_BASE + '/api/admin/orders', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            var data = await res.json();
            if (data.success) {
                _allOrders = data.data || [];
            } else {
                _allOrders = [];
            }
        } catch (err) {
            console.error('[Receipts] Failed to load orders:', err);
            _allOrders = [];
        }

        renderReceiptsTable();
    }

    function renderReceiptsTable() {
        var tbody = document.getElementById('receiptsTableBody');
        if (!tbody) return;

        var searchTerm = (document.getElementById('receiptSearch')?.value || '').toLowerCase().trim();
        var statusFilter = document.getElementById('receiptStatusFilter')?.value || 'paid';

        var filtered = _allOrders.filter(function (o) {
            // Status filter
            if (statusFilter !== 'all' && o.paymentStatus !== statusFilter) return false;

            // Search
            if (searchTerm) {
                var haystack = [
                    o.orderNumber || '',
                    o.user?.name || '',
                    o.user?.email || '',
                    o.user?.phone || ''
                ].join(' ').toLowerCase();
                if (haystack.indexOf(searchTerm) === -1) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--admin-text-muted);">No receipts found.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(function (order) {
            var date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            var customer = order.user ? order.user.name : 'Guest';
            var email = order.user ? order.user.email : '';
            var itemCount = order.items ? order.items.length : 0;
            var total = (order.total || 0).toFixed(3);
            var payBadgeColor = order.paymentStatus === 'paid' ? '#10b981' : (order.paymentStatus === 'refunded' ? '#ef4444' : '#f59e0b');

            return '<tr>' +
                '<td style="font-weight:600;color:var(--admin-gold);">' + (order.orderNumber || 'N/A') + '</td>' +
                '<td><div style="font-weight:500;">' + customer + '</div><div style="font-size:11px;color:var(--admin-text-muted);">' + email + '</div></td>' +
                '<td>' + date + '</td>' +
                '<td style="text-align:center;">' + itemCount + '</td>' +
                '<td style="text-align:right;font-weight:700;font-family:Playfair Display,serif;">' + total + '</td>' +
                '<td><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:' + payBadgeColor + '20;color:' + payBadgeColor + ';">' + (order.paymentStatus || 'N/A') + '</span></td>' +
                '<td style="text-align:center;">' +
                    '<button class="admin-btn" style="font-size:12px;padding:4px 12px;" onclick="window.openReceiptEdit(\'' + order._id + '\')">✏️ Edit</button> ' +
                    '<button class="admin-btn" style="font-size:12px;padding:4px 12px;" onclick="window.viewReceiptPreview(\'' + order._id + '\')">👁️ View</button>' +
                '</td>' +
            '</tr>';
        }).join('');
    }

    // ── Open receipt edit modal ──
    window.openReceiptEdit = function (orderId) {
        var order = _allOrders.find(function (o) { return o._id === orderId; });
        if (!order) return alert('Order not found');

        _currentEditOrder = JSON.parse(JSON.stringify(order)); // deep copy
        var modal = document.getElementById('receiptEditModal');
        var title = document.getElementById('receiptEditTitle');
        var body = document.getElementById('receiptEditBody');

        title.textContent = 'Edit Receipt — ' + (order.orderNumber || 'Order');

        var itemsHtml = (_currentEditOrder.items || []).map(function (item, idx) {
            return '<div class="receipt-item-row" style="display:grid;grid-template-columns:1fr 100px 80px 60px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--admin-border);">' +
                '<div>' +
                    '<input type="text" class="admin-search" style="margin:0;width:100%;font-size:13px;" value="' + (item.name || '').replace(/"/g, '&quot;') + '" data-field="name" data-idx="' + idx + '" onchange="window.receiptItemChanged(this)">' +
                    '<input type="text" class="admin-search" style="margin:4px 0 0;width:100%;font-size:11px;color:var(--admin-text-muted);" value="' + (item.sku || '').replace(/"/g, '&quot;') + '" data-field="sku" data-idx="' + idx + '" onchange="window.receiptItemChanged(this)" placeholder="SKU">' +
                '</div>' +
                '<input type="number" step="0.001" class="admin-search" style="margin:0;text-align:right;font-size:13px;" value="' + (item.price || 0).toFixed(3) + '" data-field="price" data-idx="' + idx + '" onchange="window.receiptItemChanged(this)">' +
                '<input type="number" min="1" class="admin-search" style="margin:0;text-align:center;font-size:13px;" value="' + (item.quantity || 1) + '" data-field="quantity" data-idx="' + idx + '" onchange="window.receiptItemChanged(this)">' +
                '<div style="text-align:right;font-weight:600;font-size:13px;" id="itemTotal_' + idx + '">' + (item.price * item.quantity).toFixed(3) + '</div>' +
            '</div>';
        }).join('');

        body.innerHTML =
            '<div style="margin-bottom:12px;font-size:12px;color:var(--admin-text-muted);">' +
                'Customer: <strong>' + (_currentEditOrder.user?.name || 'Guest') + '</strong> · ' +
                (_currentEditOrder.user?.email || '') + ' · ' +
                (_currentEditOrder.user?.phone || '') +
            '</div>' +

            '<div style="font-weight:600;margin-bottom:6px;font-size:13px;">Items</div>' +
            '<div style="display:grid;grid-template-columns:1fr 100px 80px 60px;gap:8px;padding:6px 0;font-size:11px;font-weight:600;color:var(--admin-text-muted);border-bottom:2px solid var(--admin-border);">' +
                '<div>Product</div><div style="text-align:right;">Price</div><div style="text-align:center;">Qty</div><div style="text-align:right;">Total</div>' +
            '</div>' +
            '<div id="receiptItemsList">' + itemsHtml + '</div>' +

            '<div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
                '<div class="admin-form-group" style="margin:0;">' +
                    '<label style="font-size:12px;">Shipping Cost (KWD)</label>' +
                    '<input type="number" step="0.001" class="admin-search" style="margin:0;" id="receiptShipping" value="' + (_currentEditOrder.shippingCost || 0).toFixed(3) + '" onchange="window.recalcReceiptTotal()">' +
                '</div>' +
                '<div class="admin-form-group" style="margin:0;">' +
                    '<label style="font-size:12px;">Discount (KWD)</label>' +
                    '<input type="number" step="0.001" class="admin-search" style="margin:0;" id="receiptDiscount" value="' + (_currentEditOrder.discount || 0).toFixed(3) + '" onchange="window.recalcReceiptTotal()">' +
                '</div>' +
            '</div>' +

            '<div style="margin-top:12px;" class="admin-form-group">' +
                '<label style="font-size:12px;">Notes</label>' +
                '<textarea class="admin-search" style="margin:0;min-height:60px;resize:vertical;" id="receiptNotes">' + (_currentEditOrder.notes || '') + '</textarea>' +
            '</div>' +

            '<div style="margin-top:16px;padding:12px;background:var(--admin-surface-2);border-radius:12px;display:flex;justify-content:space-between;align-items:center;">' +
                '<div>' +
                    '<div style="font-size:12px;color:var(--admin-text-muted);">Subtotal: <span id="receiptSubtotal" style="font-weight:600;">' + (_currentEditOrder.subtotal || 0).toFixed(3) + '</span> KWD</div>' +
                    '<div style="font-size:18px;font-weight:700;font-family:Playfair Display,serif;color:var(--admin-gold);margin-top:4px;">Total: <span id="receiptTotal">' + (_currentEditOrder.total || 0).toFixed(3) + '</span> KWD</div>' +
                '</div>' +
                '<button class="admin-btn admin-btn-primary" onclick="window.saveReceiptEdit()" style="font-size:14px;padding:10px 24px;">💾 Save Receipt</button>' +
            '</div>';

        modal.classList.remove('hidden');
    };

    // ── Item field changed ──
    window.receiptItemChanged = function (input) {
        var idx = parseInt(input.dataset.idx);
        var field = input.dataset.field;
        var item = _currentEditOrder.items[idx];
        if (!item) return;

        if (field === 'price') {
            item.price = parseFloat(input.value) || 0;
        } else if (field === 'quantity') {
            item.quantity = parseInt(input.value) || 1;
        } else if (field === 'name') {
            item.name = input.value;
        } else if (field === 'sku') {
            item.sku = input.value;
        }

        // Update row total
        var totalEl = document.getElementById('itemTotal_' + idx);
        if (totalEl) totalEl.textContent = (item.price * item.quantity).toFixed(3);

        window.recalcReceiptTotal();
    };

    // ── Recalculate totals ──
    window.recalcReceiptTotal = function () {
        var subtotal = _currentEditOrder.items.reduce(function (sum, item) {
            return sum + (item.price * item.quantity);
        }, 0);
        var shipping = parseFloat(document.getElementById('receiptShipping')?.value) || 0;
        var discount = parseFloat(document.getElementById('receiptDiscount')?.value) || 0;
        var total = subtotal + shipping - discount;
        if (total < 0) total = 0;

        _currentEditOrder.subtotal = subtotal;
        _currentEditOrder.shippingCost = shipping;
        _currentEditOrder.discount = discount;
        _currentEditOrder.total = total;

        var subEl = document.getElementById('receiptSubtotal');
        var totEl = document.getElementById('receiptTotal');
        if (subEl) subEl.textContent = subtotal.toFixed(3);
        if (totEl) totEl.textContent = total.toFixed(3);
    };

    // ── Save receipt edit ──
    window.saveReceiptEdit = async function () {
        if (!_currentEditOrder) return;

        var notes = document.getElementById('receiptNotes')?.value || '';

        try {
            var token = localStorage.getItem('token');
            var baseUrl = window.API_BASE_URL || (window.Config && Config.API_BASE_URL) || '';
            var API_BASE = baseUrl.replace(/\/api\/?$/, '');
            var res = await fetch(API_BASE + '/api/admin/orders/' + _currentEditOrder._id + '/receipt', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    items: _currentEditOrder.items.map(function (item) {
                        return {
                            product: item.product?._id || item.product,
                            name: item.name,
                            nameAr: item.nameAr,
                            sku: item.sku,
                            image: item.image,
                            price: item.price,
                            quantity: item.quantity
                        };
                    }),
                    shippingCost: _currentEditOrder.shippingCost,
                    discount: _currentEditOrder.discount,
                    notes: notes
                })
            });

            var data = await res.json();
            if (data.success) {
                // Update local cache
                var idx = _allOrders.findIndex(function (o) { return o._id === _currentEditOrder._id; });
                if (idx !== -1) _allOrders[idx] = data.data;

                closeReceiptModal();
                renderReceiptsTable();

                if (window.showNotification) {
                    window.showNotification('Receipt updated successfully!', 'success');
                } else {
                    alert('Receipt updated successfully!');
                }
            } else {
                alert('Failed to save: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('[Receipts] Save failed:', err);
            alert('Failed to save receipt: ' + err.message);
        }
    };

    // ── View receipt preview ──
    window.viewReceiptPreview = function (orderId) {
        var token = localStorage.getItem('token');
        var baseUrl = window.API_BASE_URL || (window.Config && Config.API_BASE_URL) || '';
        var API_BASE = baseUrl.replace(/\/api\/?$/, '');
        var url = API_BASE + '/api/admin/receipt/' + orderId + '?token=' + token;
        window.open(url, '_blank', 'width=450,height=700');
    };

    // ── Close modal ──
    window.closeReceiptModal = function () {
        var modal = document.getElementById('receiptEditModal');
        if (modal) modal.classList.add('hidden');
        _currentEditOrder = null;
    };

    // Close on overlay click
    document.addEventListener('click', function (e) {
        if (e.target.id === 'receiptEditModal') {
            closeReceiptModal();
        }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeReceiptModal();
    });
})();
