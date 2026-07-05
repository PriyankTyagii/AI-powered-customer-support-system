import { useEffect, useState } from "react";
import {
  advanceOrder,
  advanceRefund,
  checkout,
  deleteOrder,
  listOrders,
  listProducts,
  requestRefund,
} from "../lib/api";
import { Modal } from "./Modal";
import type { Product, StoreOrder } from "../types";

const NEXT_ACTION: Record<string, string> = {
  PROCESSING: "🚚 Ship order",
  SHIPPED: "📬 Mark delivered",
};

const REFUND_ACTION: Record<string, string> = {
  REQUESTED: "✅ Approve refund",
  APPROVED: "💸 Complete refund",
};

export function Store() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [busyId, setBusyId] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [refundTarget, setRefundTarget] = useState<StoreOrder | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<StoreOrder | undefined>();

  const refresh = async () => {
    const [productData, orderData] = await Promise.all([listProducts(), listOrders()]);
    setProducts(productData);
    setOrders(orderData);
  };

  useEffect(() => {
    refresh();
  }, []);

  async function run(id: string, action: () => Promise<unknown>, successMessage: string) {
    setBusyId(id);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
      setNotice(successMessage);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(undefined);
    }
  }

  const handleBuy = (product: Product) =>
    run(
      product.id,
      () => checkout(product.id, 1),
      `Order placed for ${product.name}. Ask the assistant about it!`,
    );

  const handleAdvance = (order: StoreOrder) =>
    run(order.id, () => advanceOrder(order.id), `Order ${order.orderNumber} updated.`);

  const confirmRefund = async (reason?: string) => {
    const order = refundTarget;
    setRefundTarget(undefined);
    if (!order || !reason) return;
    await run(
      order.id,
      () => requestRefund(order.id, reason),
      `Refund requested for ${order.orderNumber}.`,
    );
  };

  const handleAdvanceRefund = (order: StoreOrder) =>
    run(order.id, () => advanceRefund(order.id), `Refund updated for ${order.orderNumber}.`);

  const confirmDelete = async () => {
    const order = deleteTarget;
    setDeleteTarget(undefined);
    if (!order) return;
    await run(order.id, () => deleteOrder(order.id), `Order ${order.orderNumber} deleted.`);
  };

  return (
    <div className="store">
      {notice ? <div className="store-notice">{notice}</div> : null}
      {error ? <div className="send-error">{error}</div> : null}

      <h2>Products</h2>
      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-emoji">{product.imageEmoji}</div>
            <div className="product-name">{product.name}</div>
            <p className="product-desc">{product.description}</p>
            <div className="product-footer">
              <span className="product-price">
                {product.currency} {product.price.toFixed(2)}
              </span>
              <button
                disabled={busyId === product.id}
                onClick={() => handleBuy(product)}
              >
                {busyId === product.id ? "Placing..." : "Buy"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2>My Orders</h2>
      {orders.length === 0 ? (
        <p className="store-empty">No orders yet — buy something above, then ask the assistant about it.</p>
      ) : (
        <div className="order-list">
          {orders.map((order) => {
            const invoice = order.invoices[0];
            const refund = invoice?.refunds[0];
            return (
              <div className="order-card" key={order.id}>
                <div className="order-card-main">
                  <div>
                    <strong>{order.orderNumber}</strong>
                    {order.product ? ` — ${order.quantity} x ${order.product.name}` : null}
                  </div>
                  <div className="order-meta">
                    <span className={`status-pill status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    {order.trackingNumber ? <span>Tracking {order.trackingNumber}</span> : null}
                    {order.eta ? <span>ETA {new Date(order.eta).toDateString()}</span> : null}
                    {invoice ? (
                      <span>
                        {invoice.invoiceNo} · {invoice.currency} {invoice.amount.toFixed(2)} ·{" "}
                        {invoice.status}
                      </span>
                    ) : null}
                    {refund ? <span>Refund {refund.status}</span> : null}
                  </div>
                </div>
                <div className="order-actions">
                  {NEXT_ACTION[order.status] ? (
                    <button disabled={busyId === order.id} onClick={() => handleAdvance(order)}>
                      {NEXT_ACTION[order.status]}
                    </button>
                  ) : null}
                  {refund && REFUND_ACTION[refund.status] ? (
                    <button
                      disabled={busyId === order.id}
                      onClick={() => handleAdvanceRefund(order)}
                    >
                      {REFUND_ACTION[refund.status]}
                    </button>
                  ) : null}
                  {invoice?.status === "PAID" && !refund ? (
                    <button
                      className="secondary"
                      disabled={busyId === order.id}
                      onClick={() => setRefundTarget(order)}
                    >
                      Request refund
                    </button>
                  ) : null}
                  <button
                    className="icon-btn order-delete"
                    title="Delete order"
                    disabled={busyId === order.id}
                    onClick={() => setDeleteTarget(order)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {deleteTarget ? (
        <Modal
          title={`Delete ${deleteTarget.orderNumber}?`}
          message={`${deleteTarget.product ? `${deleteTarget.quantity} x ${deleteTarget.product.name} — ` : ""}the order, its invoice, and any refunds will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete order"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(undefined)}
        />
      ) : null}
      {refundTarget ? (
        <Modal
          title={`Refund ${refundTarget.orderNumber}?`}
          message={
            refundTarget.product
              ? `${refundTarget.quantity} x ${refundTarget.product.name} — the full invoice amount will be refunded once processed.`
              : "The full invoice amount will be refunded once processed."
          }
          confirmLabel="Request refund"
          input={{ placeholder: "Why do you want a refund?", initialValue: "Item arrived damaged" }}
          onConfirm={confirmRefund}
          onCancel={() => setRefundTarget(undefined)}
        />
      ) : null}
    </div>
  );
}
