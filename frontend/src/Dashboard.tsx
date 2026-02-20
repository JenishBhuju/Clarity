import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "./api";
import styles from "./Dashboard.module.css";

interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface FormState {
  type: "income" | "expense";
  amount: string;
  category: string;
  description: string;
  date: string;
}

interface FormErrors {
  non_field?: string;
  amount?: string[];
  category?: string[];
  date?: string[];
  description?: string[];
  [key: string]: string | string[] | undefined;
}

const CATEGORIES = [
  { value: "",           label: "All Categories" },
  { value: "food",       label: "Food & Dining" },
  { value: "transport",  label: "Transport" },
  { value: "housing",    label: "Housing & Rent" },
  { value: "health",     label: "Health & Medical" },
  { value: "shopping",   label: "Shopping" },
  { value: "education",  label: "Education" },
  { value: "salary",     label: "Salary" },
  { value: "freelance",  label: "Freelance" },
  { value: "investment", label: "Investment" },
  { value: "gift",       label: "Gift" },
  { value: "other",      label: "Other" },
];

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍜", transport: "🚌", housing: "🏠", health: "💊",
  shopping: "🛍️", education: "📚", salary: "💼", freelance: "💻",
  investment: "📈", gift: "🎁", other: "📌",
};

const EMPTY_FORM: FormState = {
  type: "expense",
  amount: "",
  category: "other",
  description: "",
  date: new Date().toISOString().split("T")[0],
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState<boolean>(true);
  const [showModal, setShowModal]       = useState<boolean>(false);
  const [editTarget, setEditTarget]     = useState<Transaction | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState<FormErrors>({});
  const [saving, setSaving]             = useState<boolean>(false);
  const [deleteId, setDeleteId]         = useState<number | null>(null);

  const [filterType, setFilterType]         = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterFrom, setFilterFrom]         = useState<string>("");
  const [filterTo, setFilterTo]             = useState<string>("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType)     params.append("type",      filterType);
      if (filterCategory) params.append("category",  filterCategory);
      if (filterFrom)     params.append("date_from", filterFrom);
      if (filterTo)       params.append("date_to",   filterTo);

      const res = await API.get<Transaction[]>(`transactions/?${params.toString()}`);
      setTransactions(res.data);
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterCategory, filterFrom, filterTo, navigate]);

  useEffect(() => { void fetchTransactions(); }, [fetchTransactions]);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditTarget(tx);
    setForm({
      type: tx.type,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
      date: tx.date,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      if (editTarget) {
        await API.put(`transactions/${editTarget.id}/`, form);
      } else {
        await API.post("transactions/", form);
      }
      setShowModal(false);
      void fetchTransactions();
    } catch (err: unknown) {
      const error = err as { response?: { data?: FormErrors } };
      setFormErrors(error.response?.data ?? { non_field: "Something went wrong." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await API.delete(`transactions/${id}/`);
      setDeleteId(null);
      void fetchTransactions();
    } catch {
      alert("Failed to delete.");
    }
  };

  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t)  => s + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);
  const net          = totalIncome - totalExpense;

  const fmt     = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.brandName}>Clarity</span>
          <span className={styles.brandSub}>Personal Finance</span>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.addBtn} onClick={openAdd}>+ Add Transaction</button>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Summary */}
        <div className={styles.summaryRow}>
          <div className={`${styles.summaryCard} ${styles.incomeCard}`}>
            <span className={styles.summaryLabel}>Total Income</span>
            <span className={styles.summaryAmount}>{fmt(totalIncome)}</span>
          </div>
          <div className={`${styles.summaryCard} ${styles.expenseCard}`}>
            <span className={styles.summaryLabel}>Total Expenses</span>
            <span className={styles.summaryAmount}>{fmt(totalExpense)}</span>
          </div>
          <div className={`${styles.summaryCard} ${net >= 0 ? styles.netPositive : styles.netNegative}`}>
            <span className={styles.summaryLabel}>Net Balance</span>
            <span className={styles.summaryAmount}>{fmt(net)}</span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select className={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <div className={styles.dateRange}>
            <input type="date" className={styles.filterInput} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            <span className={styles.dateSep}>→</span>
            <input type="date" className={styles.filterInput} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>

          {(filterType || filterCategory || filterFrom || filterTo) && (
            <button className={styles.clearBtn} onClick={() => { setFilterType(""); setFilterCategory(""); setFilterFrom(""); setFilterTo(""); }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Transaction list */}
        {loading ? (
          <div className={styles.loadingWrap}>
            <span className={styles.spinner} />
            <span>Loading transactions…</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>No transactions found.</p>
            <button className={styles.addBtn} onClick={openAdd}>Add your first transaction</button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className={styles.amountCol}>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} className={styles.row} style={{ animationDelay: `${i * 0.03}s` }}>
                    <td className={styles.dateCell}>{fmtDate(tx.date)}</td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {CATEGORY_ICONS[tx.category] ?? "📌"} {tx.category}
                      </span>
                    </td>
                    <td className={styles.descCell}>{tx.description || <span className={styles.noDesc}>—</span>}</td>
                    <td>
                      <span className={`${styles.typeBadge} ${tx.type === "income" ? styles.income : styles.expense}`}>
                        {tx.type === "income" ? "↑ Income" : "↓ Expense"}
                      </span>
                    </td>
                    <td className={`${styles.amountCol} ${tx.type === "income" ? styles.incomeAmt : styles.expenseAmt}`}>
                      {tx.type === "income" ? "+" : "-"}{fmt(parseFloat(tx.amount))}
                    </td>
                    <td className={styles.actionCell}>
                      <button className={styles.editBtn} onClick={() => openEdit(tx)}>Edit</button>
                      <button className={styles.deleteBtn} onClick={() => setDeleteId(tx.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editTarget ? "Edit Transaction" : "New Transaction"}</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { void handleSave(e); }} className={styles.modalForm}>
              {formErrors.non_field && <div className={styles.formError}>{formErrors.non_field}</div>}

              <div className={styles.typeToggle}>
                <button type="button"
                  className={`${styles.typeBtn} ${form.type === "expense" ? styles.typeBtnActive : ""}`}
                  onClick={() => setForm(f => ({ ...f, type: "expense" }))}>
                  ↓ Expense
                </button>
                <button type="button"
                  className={`${styles.typeBtn} ${form.type === "income" ? styles.typeBtnActiveIncome : ""}`}
                  onClick={() => setForm(f => ({ ...f, type: "income" }))}>
                  ↑ Income
                </button>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Amount</label>
                  <input type="number" step="0.01" min="0.01" className={styles.formInput}
                    placeholder="0.00" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                  {formErrors.amount && <span className={styles.fieldErr}>{formErrors.amount[0]}</span>}
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Date</label>
                  <input type="date" className={styles.formInput} value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Category</label>
                <select className={styles.formInput} value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.filter(c => c.value).map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>
                  Description <span className={styles.optional}>(optional)</span>
                </label>
                <input type="text" className={styles.formInput} placeholder="What was this for?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                  {saving && <span className={styles.btnSpinner} />}
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className={styles.overlay} onClick={() => setDeleteId(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>Delete this transaction?</p>
            <p className={styles.confirmSub}>This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={() => { void handleDelete(deleteId); }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}