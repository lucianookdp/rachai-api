// A fixed list, so the spending chart can label and colour every category.
// Stored as a plain string: adding one later needs no migration, only this
// list and the web app's translations.
export const EXPENSE_CATEGORIES = [
  'food',
  'groceries',
  'transport',
  'lodging',
  'housing',
  'entertainment',
  'shopping',
  'other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
