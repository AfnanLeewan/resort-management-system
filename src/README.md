# 🏨 Royyan Resort Management System (RRMS)

A comprehensive, senior-friendly resort management system designed for efficient operations at Royyan Resort.

## 🎯 Overview

This system is specifically designed for **elderly users (60+ years old)** with an emphasis on:
- ✅ **Large, clear buttons** with high contrast
- ✅ **Bilingual interface** (Thai & English)
- ✅ **Minimal clicks** to complete tasks
- ✅ **Visual feedback** with icons and colors
- ✅ **Responsive design** for both PC and mobile

## 📊 Resort Specifications

### Room Inventory
- **Total Rooms:** 30
  - Single Bed: 20 rooms (Room 1-20)
  - Double Bed: 10 rooms (Room 21-30)

### Pricing Tiers
1. **General Customer:** ฿890/night
2. **Tour/Referral:** ฿840/night
3. **Shareholder/VIP:** ฿400/night

### Additional Charges
- **Early Check-in / Late Check-out:** ฿50/hour
- **VAT:** 7% (calculated automatically)

## 👥 User Roles

### 1. Front Desk Staff
- Create bookings
- Check-in/Check-out guests
- Process payments
- Generate receipts/tax invoices

### 2. Housekeeping
- Update room cleaning status
- Report maintenance issues
- View maintenance tasks

### 3. Management
- View reports & analytics
- Approve discounts
- Manage maintenance
- Export tax data

### 4. Board of Directors
- Approve special discounts
- View financial reports
- Export monthly tax reports

## 🚀 Quick Start

1. **Login** with one of the demo usernames:
   - `frontdesk` - For reception staff
   - `housekeeping` - For cleaning staff
   - `manager` - For management
   - `board` - For board members

2. **Load Demo Data** (optional):
   - Click the "Load Demo Data" button on login screen
   - This creates sample bookings and maintenance reports

3. **Start Using:**
   - Dashboard shows overview
   - Navigate using the top menu
   - Click the "คู่มือ" (Guide) button for help

## 📱 Key Features

### Front Desk Operations
- **Booking Management:** Create, view, and search bookings
- **Check-in:** Simple one-click check-in with time tracking
- **Check-out & Payment:** Automatic calculation of charges including:
  - Room charges (nights × rate)
  - Early check-in penalties
  - Late check-out penalties
  - VAT 7%
- **Receipt Generation:** Auto-generated receipt and tax invoice with sequential numbering
- **Group Bookings:** Support for tour groups with consolidated billing

### Room Management
- **Visual Room Grid:** Color-coded room status
  - 🟢 Green = Available
  - 🔴 Red = Occupied
  - 🟡 Yellow = Cleaning
  - 🟠 Orange = Maintenance
- **Real-time Status:** Updates automatically
- **Room Filtering:** Quick filter by status

### Housekeeping & Maintenance
- **Cleaning Tracker:** Mark rooms as clean
- **Maintenance Reporting:** Easy issue reporting with:
  - Problem description
  - Priority level (Low/Medium/High)
  - LINE notification simulation
- **Task Management:** Track pending and completed tasks

### Reports & Analytics
- **Revenue Dashboard:** Daily and monthly revenue
- **Payment Methods:** Breakdown by cash, transfer, QR
- **Customer Types:** Revenue by pricing tier
- **Tax Reports:** VAT calculation and export
- **CSV Export:** Monthly data for accountants

## 💾 Data Storage

This version uses **browser LocalStorage** for data persistence. Important notes:

⚠️ **Do not clear browser cache** or data will be lost  
✅ **Export CSV regularly** for backup  
✅ **Consider Supabase** for production use

## 🔐 Security Notes

⚠️ **Important:** This demo system is not suitable for production without:
- Proper authentication (currently simplified for demo)
- Backend database (Supabase recommended)
- HTTPS encryption
- PDPA compliance measures
- Data backup strategy

## 📈 Future Enhancements

For production deployment, consider adding:

1. **Backend Integration**
   - Supabase or PostgreSQL database
   - Real-time multi-user sync
   - Automatic backups

2. **LINE Integration**
   - LINE Notify API for maintenance alerts
   - LINE LIFF App for housekeeping
   - LINE Pay for QR payments

3. **OTA Integration**
   - Connect to Agoda, Booking.com
   - Channel Manager API
   - iCal synchronization

4. **Advanced Features**
   - Customer relationship management (CRM)
   - Email confirmations
   - SMS notifications
   - Advanced analytics
   - Revenue forecasting

## 📖 Documentation

- **User Guide:** See `/SYSTEM_GUIDE.md` for detailed instructions
- **In-App Help:** Click the "คู่มือ" button in the header
- **Quick Guide:** Available on dashboard

## 🛠️ Technical Stack

- **Framework:** React + TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Storage:** Browser LocalStorage
- **State Management:** React Hooks

## 📞 Support

For questions or issues:
1. Check the Quick Guide (คู่มือ button)
2. Read the SYSTEM_GUIDE.md file
3. Review the in-app tooltips and help text

## 📄 License

Built for Royyan Resort  
Developed: December 19, 2025  
Version: 1.0.0

---

## 🎉 Getting Started Checklist

- [ ] Login with `frontdesk` username
- [ ] Click "Load Demo Data" to see sample bookings
- [ ] Explore the Dashboard
- [ ] Try creating a new booking
- [ ] Practice check-in and check-out flow
- [ ] View the Reports section
- [ ] Export CSV for testing
- [ ] Read the Quick Guide

## 🌟 Design Philosophy

This system prioritizes **simplicity over complexity** because:
- Users are 60+ years old
- Limited tech experience
- Need quick, error-free operations
- Must comply with Thai tax laws
- Support bilingual staff

Every feature was designed with these constraints in mind.

---

**Enjoy using Royyan Resort Management System!** 🏨
