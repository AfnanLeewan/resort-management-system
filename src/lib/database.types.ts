// Auto-generated types for Supabase Database
// You can regenerate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string
          name: string
          role: 'front-desk' | 'housekeeping' | 'management' | 'board' | 'part-time'
          phone: string | null
          photo_url: string | null
          status: 'on-duty' | 'off-duty' | 'on-leave'
          last_check_in: string | null
          last_check_out: string | null
          is_online: boolean
          shifts: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          name: string
          role?: 'front-desk' | 'housekeeping' | 'management' | 'board' | 'part-time'
          phone?: string | null
          photo_url?: string | null
          status?: 'on-duty' | 'off-duty' | 'on-leave'
          last_check_in?: string | null
          last_check_out?: string | null
          is_online?: boolean
          shifts?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          name?: string
          role?: 'front-desk' | 'housekeeping' | 'management' | 'board' | 'part-time'
          phone?: string | null
          photo_url?: string | null
          status?: 'on-duty' | 'off-duty' | 'on-leave'
          last_check_in?: string | null
          last_check_out?: string | null
          is_online?: boolean
          shifts?: Json
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          number: number
          type: 'single' | 'double'
          status: 'available' | 'occupied' | 'cleaning' | 'maintenance'
          current_booking_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number: number
          type: 'single' | 'double'
          status?: 'available' | 'occupied' | 'cleaning' | 'maintenance'
          current_booking_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: number
          type?: 'single' | 'double'
          status?: 'available' | 'occupied' | 'cleaning' | 'maintenance'
          current_booking_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          guest_name: string
          guest_id_number: string
          guest_phone: string
          guest_address: string | null
          check_in_date: string
          check_out_date: string
          actual_check_in_time: string | null
          actual_check_out_time: string | null
          pricing_tier: 'general' | 'tour' | 'vip'
          base_rate: number
          deposit: number | null
          source: 'walk-in' | 'phone' | 'ota'
          status: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled'
          group_name: string | null
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          guest_name: string
          guest_id_number: string
          guest_phone: string
          guest_address?: string | null
          check_in_date: string
          check_out_date: string
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          pricing_tier?: 'general' | 'tour' | 'vip'
          base_rate: number
          deposit?: number | null
          source?: 'walk-in' | 'phone' | 'ota'
          status?: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled'
          group_name?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          guest_name?: string
          guest_id_number?: string
          guest_phone?: string
          guest_address?: string | null
          check_in_date?: string
          check_out_date?: string
          actual_check_in_time?: string | null
          actual_check_out_time?: string | null
          pricing_tier?: 'general' | 'tour' | 'vip'
          base_rate?: number
          deposit?: number | null
          source?: 'walk-in' | 'phone' | 'ota'
          status?: 'reserved' | 'checked-in' | 'checked-out' | 'cancelled'
          group_name?: string | null
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      booking_rooms: {
        Row: {
          id: string
          booking_id: string
          room_id: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          room_id: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          room_id?: string
          created_at?: string
        }
      }
      charges: {
        Row: {
          id: string
          booking_id: string
          type: 'room' | 'early-checkin' | 'late-checkout' | 'discount' | 'other'
          description: string
          amount: number
          authorized_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          type: 'room' | 'early-checkin' | 'late-checkout' | 'discount' | 'other'
          description: string
          amount: number
          authorized_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          type?: 'room' | 'early-checkin' | 'late-checkout' | 'discount' | 'other'
          description?: string
          amount?: number
          authorized_by?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          method: 'cash' | 'transfer' | 'qr'
          receipt_number: string
          invoice_number: string
          subtotal: number
          vat: number
          total: number
          paid_at: string
          paid_by: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          amount: number
          method: 'cash' | 'transfer' | 'qr'
          receipt_number: string
          invoice_number: string
          subtotal: number
          vat: number
          total: number
          paid_at?: string
          paid_by?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          amount?: number
          method?: 'cash' | 'transfer' | 'qr'
          receipt_number?: string
          invoice_number?: string
          subtotal?: number
          vat?: number
          total?: number
          paid_at?: string
          paid_by?: string | null
        }
      }
      maintenance_reports: {
        Row: {
          id: string
          room_id: string
          reported_by: string | null
          description: string
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'in-progress' | 'resolved'
          photos: Json
          reported_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          reported_by?: string | null
          description: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in-progress' | 'resolved'
          photos?: Json
          reported_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          room_id?: string
          reported_by?: string | null
          description?: string
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in-progress' | 'resolved'
          photos?: Json
          reported_at?: string
          resolved_at?: string | null
        }
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          type: 'check-in' | 'check-out' | 'leave'
          timestamp: string
          note: string | null
          leave_reason: string | null
          leave_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: 'check-in' | 'check-out' | 'leave'
          timestamp?: string
          note?: string | null
          leave_reason?: string | null
          leave_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'check-in' | 'check-out' | 'leave'
          timestamp?: string
          note?: string | null
          leave_reason?: string | null
          leave_date?: string | null
        }
      }
      inventory_items: {
        Row: {
          id: string
          name: string
          category: string
          quantity: number
          unit: string
          min_level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          quantity?: number
          unit: string
          min_level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          quantity?: number
          unit?: string
          min_level?: number
          created_at?: string
          updated_at?: string
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          item_id: string
          item_name: string
          date: string
          type: 'in' | 'out'
          quantity: number
          price_per_unit: number
          total_price: number
          balance_after: number
          payer: string
          receiver: string
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          item_id: string
          item_name: string
          date: string
          type: 'in' | 'out'
          quantity: number
          price_per_unit: number
          total_price: number
          balance_after: number
          payer: string
          receiver: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          item_id?: string
          item_name?: string
          date?: string
          type?: 'in' | 'out'
          quantity?: number
          price_per_unit?: number
          total_price?: number
          balance_after?: number
          payer?: string
          receiver?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      counters: {
        Row: {
          id: string
          value: number
        }
        Insert: {
          id: string
          value?: number
        }
        Update: {
          id?: string
          value?: number
        }
      }
    }
    Functions: {
      get_next_counter: {
        Args: { counter_id: string }
        Returns: number
      }
    }
  }
}
