export type TransactionType = "income" | "expense";

export type Category =
  | "food"
  | "transport"
  | "housing"
  | "health"
  | "shopping"
  | "education"
  | "salary"
  | "freelance"
  | "investment"
  | "gift"
  | "other";

export interface Transaction {
  id: number;
  type: TransactionType;
  amount: string;
  category: Category;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}