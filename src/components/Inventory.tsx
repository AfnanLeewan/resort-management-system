import { useState, useMemo, useEffect } from 'react';
import { InventoryItem, InventoryTransaction, User } from '../types';
import * as api from '../utils/api';
import { formatCurrency, formatDateTime, getTodayDateString } from '../utils/dateHelpers';
import { 
  Plus, 
  Search, 
  Package, 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  MoreHorizontal, 
  Trash2, 
  FileText,
  User as UserIcon,
  Calendar,
  DollarSign,
  Box,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface InventoryProps {
  currentUser: User;
}

export function Inventory({ currentUser }: InventoryProps) {
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
  // Form States
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'general',
    quantity: 0,
    unit: 'ชิ้น',
    minLevel: 5
  });

  const [newTransaction, setNewTransaction] = useState({
    itemId: '',
    date: getTodayDateString(),
    type: 'in' as 'in' | 'out',
    sourceOrDest: '', // Receive from / Give to
    pricePerUnit: 0,
    quantity: 1,
    payer: currentUser.name,
    receiver: '',
    notes: ''
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedItems, loadedTransactions] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryTransactions(),
      ]);
      setItems(loadedItems);
      setTransactions(loadedTransactions);
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  const filteredTransactions = useMemo(() => {
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const handleAddItem = async () => {
    if (!newItem.name) return;
    setSaving(true);
    try {
      const item: InventoryItem = {
        id: `ITEM-${Date.now()}`,
        ...newItem
      };
      await api.addInventoryItem(item);
      await loadData();
      setShowAddItemModal(false);
      setNewItem({ name: '', category: 'general', quantity: 0, unit: 'ชิ้น', minLevel: 5 });
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('❌ ไม่สามารถเพิ่มสินค้าได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้? ประวัติการทำรายการจะยังคงอยู่')) {
      setSaving(true);
      try {
        await api.deleteInventoryItem(id);
        await loadData();
      } catch (err) {
        console.error('Failed to delete item:', err);
        alert('❌ ไม่สามารถลบรายการได้');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.itemId || newTransaction.quantity <= 0) {
        alert('กรุณาเลือกรายการและระบุจำนวนที่ถูกต้อง');
        return;
    }
    
    const selectedItem = items.find(i => i.id === newTransaction.itemId);
    if (!selectedItem) return;

    // Check stock for OUT transaction
    if (newTransaction.type === 'out' && selectedItem.quantity < newTransaction.quantity) {
        alert('สินค้าในคลังมีไม่เพียงพอ');
        return;
    }

    setSaving(true);
    try {
      const transaction: InventoryTransaction = {
        id: `TRX-${Date.now()}`,
        itemId: newTransaction.itemId,
        itemName: selectedItem.name,
        date: newTransaction.date,
        type: newTransaction.type,
        quantity: newTransaction.quantity,
        pricePerUnit: newTransaction.pricePerUnit,
        totalPrice: newTransaction.quantity * newTransaction.pricePerUnit,
        balanceAfter: newTransaction.type === 'in' 
          ? selectedItem.quantity + newTransaction.quantity 
          : selectedItem.quantity - newTransaction.quantity,
        payer: newTransaction.payer,
        receiver: newTransaction.receiver,
        notes: newTransaction.notes,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id
      };

      await api.addInventoryTransaction(transaction);
      await loadData();
      setShowTransactionModal(false);
      
      // Reset form but keep some defaults
      setNewTransaction({
          ...newTransaction,
          itemId: '',
          quantity: 1,
          pricePerUnit: 0,
          sourceOrDest: '',
          receiver: '',
          notes: ''
      });
      alert('บันทึกรายการเรียบร้อย');
    } catch (err) {
      console.error('Failed to add transaction:', err);
      alert('❌ ไม่สามารถบันทึกรายการได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">คลังพัสดุ & อุปกรณ์</h2>
          <p className="text-slate-500">จัดการสต็อก รับเข้า และเบิกจ่ายอุปกรณ์</p>
        </div>
        <div className="flex gap-3">
            <button
            onClick={() => setShowAddItemModal(true)}
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl transition-colors font-bold flex items-center gap-2"
            >
            <Plus className="w-5 h-5" />
            เพิ่มสินค้าใหม่
            </button>
            <button
            onClick={() => setShowTransactionModal(true)}
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-colors font-bold shadow-lg shadow-orange-200 flex items-center gap-2"
            >
            <ArrowUpRight className="w-5 h-5" />
            รับเข้า / เบิกใช้
            </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                <Package className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">รายการทั้งหมด</p>
                <p className="text-3xl font-bold text-slate-800">{items.length}</p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                <ArrowDownLeft className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">รับเข้าเดือนนี้</p>
                <p className="text-3xl font-bold text-slate-800">
                    {transactions.filter(t => t.type === 'in' && t.date.startsWith(getTodayDateString().slice(0, 7))).length}
                </p>
            </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
                <ArrowUpRight className="w-8 h-8" />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">เบิกใช้เดือนนี้</p>
                <p className="text-3xl font-bold text-slate-800">
                     {transactions.filter(t => t.type === 'out' && t.date.startsWith(getTodayDateString().slice(0, 7))).length}
                </p>
            </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
                onClick={() => setActiveTab('items')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'items' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                รายการสินค้า
            </button>
            <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                ประวัติการทำรายการ
            </button>
        </div>
        <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="text"
                placeholder="ค้นหาชื่อรายการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none bg-white"
            />
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'items' ? (
             <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อรายการ</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">หมวดหมู่</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">คงเหลือ</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">หน่วยนับ</th>
                   <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">จัดการ</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredItems.map(item => (
                   <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                     <td className="px-6 py-4 text-slate-500">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">{item.category}</span>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <span className={`text-lg font-mono font-bold ${item.quantity <= item.minLevel ? 'text-red-500' : 'text-slate-800'}`}>
                            {item.quantity}
                        </span>
                     </td>
                     <td className="px-6 py-4 text-slate-500 pl-8">{item.unit}</td>
                     <td className="px-6 py-4 text-center">
                        {item.quantity <= 0 ? (
                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">หมดสต็อก</span>
                        ) : item.quantity <= item.minLevel ? (
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">ใกล้หมด</span>
                        ) : (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">ปกติ</span>
                        )}
                     </td>
                     <td className="px-6 py-4 text-right">
                        <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                     </td>
                   </tr>
                 ))}
                 {filteredItems.length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                            ไม่พบรายการสินค้า
                        </td>
                    </tr>
                 )}
               </tbody>
             </table>
           </div>
        ) : (
            <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-slate-50 border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">รายการ</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวน</th>
                   <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">ราคา/หน่วย</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider pl-8">รับจาก/ผู้เบิก</th>
                   <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ผู้ทำรายการ</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filteredTransactions.map(tx => (
                   <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 text-slate-600 text-sm">
                        {format(new Date(tx.date), "dd/MM/yyyy", { locale: th })}
                     </td>
                     <td className="px-6 py-4 font-bold text-slate-800">{tx.itemName}</td>
                     <td className="px-6 py-4">
                        {tx.type === 'in' ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded w-fit">
                                <ArrowDownLeft className="w-3 h-3" /> รับเข้า
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded w-fit">
                                <ArrowUpRight className="w-3 h-3" /> เบิกใช้
                            </span>
                        )}
                     </td>
                     <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">
                        {tx.quantity}
                     </td>
                     <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {tx.type === 'in' ? formatCurrency(tx.pricePerUnit) : '-'}
                     </td>
                     <td className="px-6 py-4 text-slate-600 pl-8 text-sm">
                        <div className="font-medium">{tx.type === 'in' ? `รับจาก: ${tx.receiver || '-'}` : `ผู้เบิก: ${tx.receiver || '-'}`}</div>
                     </td>
                     <td className="px-6 py-4 text-slate-500 text-sm">
                        {tx.payer}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <Package className="w-6 h-6 text-orange-500" />
                 เพิ่มสินค้าใหม่
              </h2>
              <div className="space-y-4">
                 <div>
                    <label className="block text-slate-700 font-bold mb-2">ชื่อสินค้า</label>
                    <input 
                       value={newItem.name}
                       onChange={e => setNewItem({...newItem, name: e.target.value})}
                       className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                       placeholder="เช่น ผ้าเช็ดตัว, สบู่ก้อน"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">หมวดหมู่</label>
                        <select 
                            value={newItem.category}
                            onChange={e => setNewItem({...newItem, category: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-white"
                        >
                            <option value="general">ทั่วไป</option>
                            <option value="amenity">ของใช้ในห้อง</option>
                            <option value="cleaning">อุปกรณ์ทำความสะอาด</option>
                            <option value="food">อาหาร/เครื่องดื่ม</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">หน่วยนับ</label>
                        <input 
                        value={newItem.unit}
                        onChange={e => setNewItem({...newItem, unit: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                        placeholder="ชิ้น, แพ็ค, ขวด"
                        />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">จำนวนเริ่มต้น</label>
                        <input 
                        type="number"
                        value={newItem.quantity}
                        onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">แจ้งเตือนเมื่อต่ำกว่า</label>
                        <input 
                        type="number"
                        value={newItem.minLevel}
                        onChange={e => setNewItem({...newItem, minLevel: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                        />
                    </div>
                 </div>
              </div>
              <div className="flex gap-3 mt-8">
                 <button 
                    onClick={() => setShowAddItemModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                 >
                    ยกเลิก
                 </button>
                 <button 
                    onClick={handleAddItem}
                    className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 shadow-lg shadow-orange-200"
                 >
                    บันทึก
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in zoom-in-95 duration-200 border border-slate-100 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <ArrowUpRight className="w-6 h-6 text-orange-500" />
                 บันทึก รับเข้า / เบิกใช้
              </h2>
              
              <div className="space-y-6">
                 {/* Type Selection */}
                 <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setNewTransaction({...newTransaction, type: 'in'})}
                        className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${newTransaction.type === 'in' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <ArrowDownLeft className="w-5 h-5" /> รับเข้า (ซื้อเพิ่ม)
                    </button>
                    <button
                        onClick={() => setNewTransaction({...newTransaction, type: 'out'})}
                        className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${newTransaction.type === 'out' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        <ArrowUpRight className="w-5 h-5" /> เบิกใช้
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">วันที่ทำรายการ</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="date"
                                value={newTransaction.date}
                                onChange={e => setNewTransaction({...newTransaction, date: e.target.value})}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-slate-50"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">เลือกสินค้า</label>
                        <select 
                            value={newTransaction.itemId}
                            onChange={e => setNewTransaction({...newTransaction, itemId: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none bg-white"
                        >
                            <option value="">-- เลือกสินค้า --</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.name} (คงเหลือ: {item.quantity})
                                </option>
                            ))}
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="block text-slate-700 font-bold mb-2">จำนวน ({newTransaction.type === 'in' ? 'รับ' : 'เบิก'})</label>
                        <input 
                            type="number"
                            min="1"
                            value={newTransaction.quantity}
                            onChange={e => setNewTransaction({...newTransaction, quantity: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none font-mono text-lg"
                        />
                     </div>
                     {newTransaction.type === 'in' && (
                        <div>
                            <label className="block text-slate-700 font-bold mb-2">ราคาต่อหน่วย (บาท)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="number"
                                    min="0"
                                    value={newTransaction.pricePerUnit}
                                    onChange={e => setNewTransaction({...newTransaction, pricePerUnit: parseFloat(e.target.value) || 0})}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>
                     )}
                 </div>
                 
                 {newTransaction.type === 'in' && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                        <span className="text-slate-500 font-bold">รวมเป็นเงิน</span>
                        <span className="text-2xl font-bold text-slate-800 font-mono">
                            {formatCurrency(newTransaction.quantity * newTransaction.pricePerUnit)}
                        </span>
                    </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">ผู้ทำรายการ</label>
                        <div className="relative">
                             <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                             <input 
                                value={newTransaction.payer}
                                onChange={e => setNewTransaction({...newTransaction, payer: e.target.value})}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                                placeholder="ระบุชื่อ"
                             />
                        </div>
                    </div>
                    <div>
                        <label className="block text-slate-700 font-bold mb-2">{newTransaction.type === 'in' ? 'รับจาก (ร้านค้า/แหล่งที่มา)' : 'ผู้เบิก (ชื่อผู้รับของ)'}</label>
                        <input 
                            value={newTransaction.receiver}
                            onChange={e => setNewTransaction({...newTransaction, receiver: e.target.value})}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none"
                            placeholder={newTransaction.type === 'in' ? "เช่น ร้าน A, Makro" : "เช่น แม่บ้าน B"}
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-slate-700 font-bold mb-2">หมายเหตุ</label>
                    <textarea 
                        value={newTransaction.notes}
                        onChange={e => setNewTransaction({...newTransaction, notes: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-orange-500 outline-none resize-none h-24"
                        placeholder="รายละเอียดเพิ่มเติม..."
                    />
                 </div>

              </div>

              <div className="flex gap-3 mt-8">
                 <button 
                    onClick={() => setShowTransactionModal(false)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                 >
                    ยกเลิก
                 </button>
                 <button 
                    onClick={handleAddTransaction}
                    className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg transition-colors ${newTransaction.type === 'in' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'}`}
                 >
                    ยืนยันรายการ
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
