
// Inventory operations
export function getInventoryItems(): InventoryItem[] {
  return loadFromStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY_ITEMS, []);
}

export function saveInventoryItems(items: InventoryItem[]): void {
  saveToStorage(STORAGE_KEYS.INVENTORY_ITEMS, items);
}

export function addInventoryItem(item: InventoryItem): void {
  const items = getInventoryItems();
  items.push(item);
  saveInventoryItems(items);
}

export function updateInventoryItem(id: string, updates: Partial<InventoryItem>): void {
  const items = getInventoryItems();
  const index = items.findIndex(i => i.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    saveInventoryItems(items);
  }
}

export function deleteInventoryItem(id: string): void {
  const items = getInventoryItems();
  const newItems = items.filter(i => i.id !== id);
  saveInventoryItems(newItems);
}

export function getInventoryTransactions(): InventoryTransaction[] {
  return loadFromStorage<InventoryTransaction[]>(STORAGE_KEYS.INVENTORY_TRANSACTIONS, []);
}

export function saveInventoryTransactions(transactions: InventoryTransaction[]): void {
  saveToStorage(STORAGE_KEYS.INVENTORY_TRANSACTIONS, transactions);
}

export function addInventoryTransaction(transaction: InventoryTransaction): void {
  const transactions = getInventoryTransactions();
  transactions.push(transaction);
  saveInventoryTransactions(transactions);

  // Automatically update item quantity
  const items = getInventoryItems();
  const itemIndex = items.findIndex(i => i.id === transaction.itemId);
  if (itemIndex !== -1) {
    const item = items[itemIndex];
    if (transaction.type === 'in') {
      item.quantity += transaction.quantity;
    } else {
      item.quantity -= transaction.quantity;
    }
    saveInventoryItems(items);
  }
}
