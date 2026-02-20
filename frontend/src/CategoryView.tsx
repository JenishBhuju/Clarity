import { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./CategoryView.module.css";
import type { Transaction } from "./types";

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍜", transport: "🚌", housing: "🏠", health: "💊",
  shopping: "🛍️", education: "📚", salary: "💼", freelance: "💻",
  investment: "📈", gift: "🎁", other: "📌",
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#f59e0b", transport: "#60a5fa", housing: "#a78bfa",
  health: "#34d399", shopping: "#f472b6", education: "#fb923c",
  salary: "#2dd88a", freelance: "#5c7cfa", investment: "#4ade80",
  gift: "#facc15", other: "#94a3b8",
};

const fmt     = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

interface CategoryViewProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: number) => void;
}

function DragDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4"  cy="3"  r="1.2" fill="currentColor" />
      <circle cx="10" cy="3"  r="1.2" fill="currentColor" />
      <circle cx="4"  cy="7"  r="1.2" fill="currentColor" />
      <circle cx="10" cy="7"  r="1.2" fill="currentColor" />
      <circle cx="4"  cy="11" r="1.2" fill="currentColor" />
      <circle cx="10" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

interface CategorySectionProps {
  category: string;
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: number) => void;
  type: "income" | "expense";
  isDragOverlay?: boolean;
}

function CategorySection({
  category, items, onEdit, onDelete, type, isDragOverlay = false,
}: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const total = items.reduce((s, t) => s + parseFloat(t.amount), 0);
  const color = CATEGORY_COLORS[category] ?? "#94a3b8";
  const icon  = CATEGORY_ICONS[category]  ?? "📌";

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={`${styles.section} ${isDragOverlay ? styles.sectionOverlay : ""}`}
    >
      {/* ── Header row: drag handle + category info ── */}
      <div className={styles.sectionHeader}>

        {/* LEFT: drag handle only — this is what you grab */}
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <DragDots />
        </button>

        {/* RIGHT: clicking this area collapses/expands */}
        <button className={styles.sectionToggle} onClick={() => setCollapsed(c => !c)}>
          <div className={styles.sectionLeft}>
            <span className={styles.sectionIcon} style={{ background: `${color}20`, color }}>
              {icon}
            </span>
            <div>
              <span className={styles.sectionName}>{category}</span>
              <span className={styles.sectionCount}>
                {items.length} transaction{items.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className={styles.sectionRight}>
            <span className={`${styles.sectionTotal} ${type === "income" ? styles.incomeAmt : styles.expenseAmt}`}>
              {type === "income" ? "+" : "-"}{fmt(total)}
            </span>
            <span className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ""}`}>›</span>
          </div>
        </button>
      </div>

      {/* ── Transaction list (plain, no drag inside) ── */}
      {!collapsed && (
        <div className={styles.sectionBody}>
          {items.map(tx => (
            <div key={tx.id} className={styles.txRow}>
              <div className={styles.txInfo}>
                <span className={styles.txDesc}>
                  {tx.description || <span className={styles.noDesc}>No description</span>}
                </span>
                <span className={styles.txDate}>{fmtDate(tx.date)}</span>
              </div>
              <span className={`${styles.txAmount} ${tx.type === "income" ? styles.incomeAmt : styles.expenseAmt}`}>
                {tx.type === "income" ? "+" : "-"}{fmt(parseFloat(tx.amount))}
              </span>
              <div className={styles.txActions}>
                <button className={styles.editBtn}   onClick={() => onEdit(tx)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => onDelete(tx.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryView({ transactions, onEdit, onDelete }: CategoryViewProps) {
  const [activeTab, setActiveTab]           = useState<"expense" | "income">("expense");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Persist drag order to localStorage so it survives login/logout
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("clarity:categoryOrder");
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const saveOrder = (order: string[]) => {
    setCategoryOrder(order);
    try { localStorage.setItem("clarity:categoryOrder", JSON.stringify(order)); } catch { /* ignore */ }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Group by category
  const grouped = useMemo(() => {
    const filtered = transactions.filter(t => t.type === activeTab);
    const map = new Map<string, Transaction[]>();
    filtered.forEach(t => {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    });
    return map;
  }, [transactions, activeTab]);

  // Merge saved order with live data
  const orderedCategories = useMemo(() => {
    const fromData = Array.from(grouped.keys());
    const saved    = categoryOrder.filter(c => fromData.includes(c));
    const newOnes  = fromData.filter(c => !saved.includes(c));
    return [...saved, ...newOnes];
  }, [grouped, categoryOrder]);

  const handleDragStart = (e: DragStartEvent) => setActiveCategory(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveCategory(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);
    saveOrder(arrayMove(orderedCategories, oldIndex, newIndex));
  };

  const total         = transactions.filter(t => t.type === activeTab).reduce((s, t) => s + parseFloat(t.amount), 0);
  const categoryCount = orderedCategories.length;
  const txCount       = Array.from(grouped.values()).flat().length;

  if (transactions.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>📂</span>
        <p>No transactions to display.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === "expense" ? styles.tabActiveExpense : ""}`}
          onClick={() => setActiveTab("expense")}
        >
          ↓ Expenses
        </button>
        <button
          className={`${styles.tab} ${activeTab === "income" ? styles.tabActiveIncome : ""}`}
          onClick={() => setActiveTab("income")}
        >
          ↑ Income
        </button>
      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Total</span>
          <span className={`${styles.statValue} ${activeTab === "income" ? styles.incomeAmt : styles.expenseAmt}`}>
            {activeTab === "income" ? "+" : "-"}{fmt(total)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Categories</span>
          <span className={styles.statValue}>{categoryCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Transactions</span>
          <span className={styles.statValue}>{txCount}</span>
        </div>
        <div className={styles.dragHint}>
          <DragDots />
          Drag categories to reorder
        </div>
      </div>

      {/* Sortable categories */}
      {orderedCategories.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>{activeTab === "expense" ? "💸" : "💰"}</span>
          <p>No {activeTab} transactions found.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={orderedCategories} strategy={verticalListSortingStrategy}>
            <div className={styles.sections}>
              {orderedCategories.map(cat => (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={grouped.get(cat) ?? []}
                  type={activeTab}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
            {activeCategory ? (
              <CategorySection
                category={activeCategory}
                items={grouped.get(activeCategory) ?? []}
                type={activeTab}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}