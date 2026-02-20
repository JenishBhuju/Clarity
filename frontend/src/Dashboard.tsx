import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import API from "./api";
import styles from "./Dashboard.module.css";
import CategoryView from "./CategoryView";
import { useTheme } from "./ThemeContext";
import type { Transaction } from "./types"; 

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
  [key: string]: string | string[] | undefined;
}

const CATEGORIES = [
  { value: "food",       label: "Food & Dining",   icon: "🍜" },
  { value: "transport",  label: "Transport",        icon: "🚌" },
  { value: "housing",    label: "Housing & Rent",   icon: "🏠" },
  { value: "health",     label: "Health & Medical", icon: "💊" },
  { value: "shopping",   label: "Shopping",         icon: "🛍️" },
  { value: "education",  label: "Education",        icon: "📚" },
  { value: "salary",     label: "Salary",           icon: "💼" },
  { value: "freelance",  label: "Freelance",        icon: "💻" },
  { value: "investment", label: "Investment",       icon: "📈" },
  { value: "gift",       label: "Gift",             icon: "🎁" },
  { value: "other",      label: "Other",            icon: "📌" },
];

const ALL_CATEGORIES = [{ value: "", label: "All Categories", icon: "" }, ...CATEGORIES];

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.icon])
);

const PIE_COLORS = [
  "#5c7cfa","#2dd88a","#ff5a6e","#f59e0b",
  "#a78bfa","#34d399","#fb923c","#60a5fa",
  "#f472b6","#4ade80","#facc15",
];

const EMPTY_FORM: FormState = {
  type: "expense", amount: "", category: "other",
  description: "", date: new Date().toISOString().split("T")[0],
};

const fmt      = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate  = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmtShort = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function buildAreaData(transactions: Transaction[]) {
  const map = new Map<string, { income: number; expense: number }>();
  [...transactions].sort((a, b) => a.date.localeCompare(b.date)).forEach(t => {
    if (!map.has(t.date)) map.set(t.date, { income: 0, expense: 0 });
    const e = map.get(t.date)!;
    if (t.type === "income") e.income  += parseFloat(t.amount);
    else                     e.expense += parseFloat(t.amount);
  });
  return Array.from(map.entries()).map(([date, v]) => ({ date: fmtShort(date), ...v }));
}

function buildPieData(transactions: Transaction[]) {
  const map = new Map<string, number>();
  transactions.filter(t => t.type === "expense").forEach(t =>
    map.set(t.category, (map.get(t.category) ?? 0) + parseFloat(t.amount))
  );
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
}

interface TTProps { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string; }
const CustomTooltip = ({ active, payload, label }: TTProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }} className={styles.tooltipRow}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

const STEP_META = [
  { label: "Amount",   icon: "💰", hint: "How much and what type?" },
  { label: "Category", icon: "🏷️", hint: "Where did it go?" },
  { label: "Details",  icon: "📝", hint: "Any extra info?" },
];

interface StepModalProps {
  editTarget: Transaction | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  formErrors: FormErrors;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

function StepModal({ editTarget, form, setForm, formErrors, saving, onSave, onClose }: StepModalProps) {
  const [step, setStep]           = useState(0);
  const [stepError, setStepError] = useState("");
  const [direction, setDirection] = useState<"fwd" | "bwd">("fwd");
  const amountRef = useRef<HTMLInputElement>(null);
  const descRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { setStep(0); setStepError(""); }, [editTarget]);

  useEffect(() => {
    if (step === 0) setTimeout(() => amountRef.current?.focus(), 100);
    if (step === 2) setTimeout(() => descRef.current?.focus(), 100);
  }, [step]);

  const goNext = () => {
    setStepError("");
    if (step === 0 && (!form.amount || parseFloat(form.amount) <= 0)) {
      setStepError("Please enter a valid amount greater than 0.");
      return;
    }
    if (step === 1 && !form.category) {
      setStepError("Please select a category.");
      return;
    }
    setDirection("fwd");
    setStep(s => s + 1);
  };

  const goBack = () => {
    setStepError("");
    setDirection("bwd");
    setStep(s => s - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step < 2) { e.preventDefault(); goNext(); }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose} onKeyDown={handleKeyDown}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              {editTarget ? "Edit Transaction" : "New Transaction"}
            </h2>
            <p className={styles.modalStepLabel}>
              {STEP_META[step].icon} {STEP_META[step].hint}
            </p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* ── Progress ── */}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${((step + 1) / STEP_META.length) * 100}%` }} />
        </div>
        <div className={styles.stepIndicators}>
          {STEP_META.map((s, i) => (
            <div key={s.label} className={`${styles.stepDot} ${i <= step ? styles.stepDotActive : ""} ${i < step ? styles.stepDotDone : ""}`}>
              <div className={styles.stepDotCircle}>{i < step ? "✓" : i + 1}</div>
              <span className={styles.stepDotLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        <div className={styles.modalBody}>
          {(stepError || formErrors.non_field) && (
            <div className={styles.formError}>{stepError || formErrors.non_field}</div>
          )}

          {/* Step 1 — Type & Amount */}
          {step === 0 && (
            <div className={styles.stepContent} data-dir={direction}>
              <div className={styles.typeToggle}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${form.type === "expense" ? styles.typeBtnExpense : ""}`}
                  onClick={() => setForm(f => ({ ...f, type: "expense" }))}
                >
                  <span className={styles.typeBtnArrow}>↓</span>
                  <span className={styles.typeBtnText}>Expense</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${form.type === "income" ? styles.typeBtnIncome : ""}`}
                  onClick={() => setForm(f => ({ ...f, type: "income" }))}
                >
                  <span className={styles.typeBtnArrow}>↑</span>
                  <span className={styles.typeBtnText}>Income</span>
                </button>
              </div>

              <div className={styles.amountWrap}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  ref={amountRef}
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={styles.amountInput}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              {formErrors.amount && <span className={styles.fieldErr}>{formErrors.amount[0]}</span>}
            </div>
          )}

          {/* Step 2 — Category */}
          {step === 1 && (
            <div className={styles.stepContent} data-dir={direction}>
              <div className={styles.categoryGrid}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    className={`${styles.categoryTile} ${form.category === c.value ? styles.categoryTileActive : ""}`}
                    onClick={() => { setForm(f => ({ ...f, category: c.value })); setStepError(""); }}
                  >
                    <span className={styles.categoryTileIcon}>{c.icon}</span>
                    <span className={styles.categoryTileLabel}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Details */}
          {step === 2 && (
            <div className={styles.stepContent} data-dir={direction}>
              {/* Summary pill */}
              <div className={styles.summaryPill}>
                <span className={form.type === "income" ? styles.incomeAmt : styles.expenseAmt}>
                  {form.type === "income" ? "↑" : "↓"} {fmt(parseFloat(form.amount) || 0)}
                </span>
                <span className={styles.pillDivider}>·</span>
                <span className={styles.pillCategory}>
                  {CATEGORY_ICONS[form.category] ?? "📌"} {form.category}
                </span>
              </div>

              <div className={styles.detailsFields}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Description
                    <span className={styles.optional}> — optional</span>
                  </label>
                  <input
                    ref={descRef}
                    type="text"
                    className={styles.formInput}
                    placeholder="What was this for?"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>Date</label>
                  <input
                    type="date"
                    className={styles.formInput}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className={styles.modalFooter}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={step === 0 ? onClose : goBack}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>

          {step < STEP_META.length - 1 ? (
            <button type="button" className={styles.saveBtn} onClick={goNext}>
              Next →
            </button>
          ) : (
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={onSave}>
              {saving && <span className={styles.btnSpinner} />}
              {saving ? "Saving…" : editTarget ? "Save Changes" : "Add Transaction"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState<boolean>(true);
  const [showModal, setShowModal]       = useState<boolean>(false);
  const [editTarget, setEditTarget]     = useState<Transaction | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState<FormErrors>({});
  const [saving, setSaving]             = useState<boolean>(false);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  //  Persist view + filters across refresh
  const [view, setView] = useState<"table" | "category">(() =>
    (sessionStorage.getItem("clarity:view") as "table" | "category") ?? "table"
  );

  const [filterType, setFilterType]         = useState<string>(() => sessionStorage.getItem("clarity:filterType")     ?? "");
  const [filterCategory, setFilterCategory] = useState<string>(() => sessionStorage.getItem("clarity:filterCategory") ?? "");
  const [filterFrom, setFilterFrom]         = useState<string>(() => sessionStorage.getItem("clarity:filterFrom")     ?? "");
  const [filterTo, setFilterTo]             = useState<string>(() => sessionStorage.getItem("clarity:filterTo")       ?? "");

  // Sync every filter/view change to sessionStorage
  useEffect(() => { sessionStorage.setItem("clarity:view",           view);           }, [view]);
  useEffect(() => { sessionStorage.setItem("clarity:filterType",     filterType);     }, [filterType]);
  useEffect(() => { sessionStorage.setItem("clarity:filterCategory", filterCategory); }, [filterCategory]);
  useEffect(() => { sessionStorage.setItem("clarity:filterFrom",     filterFrom);     }, [filterFrom]);
  useEffect(() => { sessionStorage.setItem("clarity:filterTo",       filterTo);       }, [filterTo]);

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
    } catch { navigate("/login"); }
    finally  { setLoading(false); }
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
    setForm({ type: tx.type, amount: tx.amount, category: tx.category, description: tx.description, date: tx.date });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErrors({});
    try {
      if (editTarget) await API.put(`transactions/${editTarget.id}/`, form);
      else            await API.post("transactions/", form);
      setShowModal(false);
      void fetchTransactions();
    } catch (err: unknown) {
      const error = err as { response?: { data?: FormErrors } };
      setFormErrors(error.response?.data ?? { non_field: "Something went wrong." });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    try {
      await API.delete(`transactions/${id}/`);
      setDeleteId(null);
      void fetchTransactions();
    } catch { alert("Failed to delete."); }
  };

  const totalIncome  = transactions.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);
  const net          = totalIncome - totalExpense;
  const areaData     = buildAreaData(transactions);
  const pieData      = buildPieData(transactions);
  const isDark       = theme === "dark";
  const gridColor    = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const axisColor    = isDark ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.35)";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.brandName}>Clarity</span>
          <span className={styles.brandSub}>Personal Finance</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === "table" ? styles.viewBtnActive : ""}`} onClick={() => setView("table")} title="Table view">
              ☰
            </button>
            <button className={`${styles.viewBtn} ${view === "category" ? styles.viewBtnActive : ""}`} onClick={() => setView("category")} title="Category view">
              ⊞
            </button>
          </div>
          <button className={styles.addBtn} onClick={openAdd}>+ Add Transaction</button>
          <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle theme">{isDark ? "☀️" : "🌙"}</button>
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

        {/* Charts */}
        {transactions.length > 0 && (
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Income vs Expenses</span>
                <span className={styles.chartSub}>over time</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={areaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2dd88a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2dd88a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ff5a6e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff5a6e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="income"  name="Income"  stroke="#2dd88a" strokeWidth={2} fill="url(#incomeGrad)"  dot={false} />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#ff5a6e" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span className={styles.chartTitle}>Expense Breakdown</span>
                <span className={styles.chartSub}>by category</span>
              </div>
              {pieData.length === 0 ? (
                <div className={styles.chartEmpty}>No expense data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} />
                    <Legend formatter={(v: string) => `${CATEGORY_ICONS[v] ?? "📌"} ${v}`} wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select className={styles.filterSelect} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            {ALL_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className={styles.dateRange}>
            <input type="date" className={styles.filterInput} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
            <span className={styles.dateSep}>→</span>
            <input type="date" className={styles.filterInput} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          {(filterType || filterCategory || filterFrom || filterTo) && (
            <button className={styles.clearBtn} onClick={() => {
                setFilterType(""); setFilterCategory(""); setFilterFrom(""); setFilterTo("");
                sessionStorage.removeItem("clarity:filterType");
                sessionStorage.removeItem("clarity:filterCategory");
                sessionStorage.removeItem("clarity:filterFrom");
                sessionStorage.removeItem("clarity:filterTo");
              }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table / Category view */}
        {loading ? (
          <div className={styles.loadingWrap}><span className={styles.spinner} /><span>Loading…</span></div>
        ) : transactions.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📭</span>
            <p>No transactions found.</p>
            <button className={styles.addBtn} onClick={openAdd}>Add your first transaction</button>
          </div>
        ) : view === "category" ? (
          <CategoryView transactions={transactions} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Category</th><th>Description</th><th>Type</th><th className={styles.amountCol}>Amount</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {transactions.map((tx, i) => (
                  <tr key={tx.id} className={styles.row} style={{ animationDelay: `${i * 0.03}s` }}>
                    <td className={styles.dateCell}>{fmtDate(tx.date)}</td>
                    <td><span className={styles.categoryBadge}>{CATEGORY_ICONS[tx.category] ?? "📌"} {tx.category}</span></td>
                    <td className={styles.descCell}>{tx.description || <span className={styles.noDesc}>—</span>}</td>
                    <td><span className={`${styles.typeBadge} ${tx.type === "income" ? styles.income : styles.expense}`}>{tx.type === "income" ? "↑ Income" : "↓ Expense"}</span></td>
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
        <StepModal
          editTarget={editTarget}
          form={form}
          setForm={setForm}
          formErrors={formErrors}
          saving={saving}
          onSave={() => { void handleSave(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      {deleteId !== null && (
        <div className={styles.overlay} onClick={() => setDeleteId(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <p className={styles.confirmText}>Delete this transaction?</p>
            <p className={styles.confirmSub}>This action cannot be undone.</p>
            <div className={styles.confirmActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button className={styles.confirmDeleteBtn} onClick={() => { void handleDelete(deleteId); }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}