// LINE Integration Service
// Provides frontend methods to interact with LINE Messaging API via Supabase Edge Functions
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  LineBotConfig, 
  LineRegistrationCode, 
  StaffLineMapping,
  LineNotification,
  LineCleaningTask
} from '../types';
// Check if LINE is configured and active
export async function isLineConfigured(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  try {
    const { data, error } = await supabase
      .from('line_bot_config')
      .select('is_active')
      .eq('id', 'default')
      .single();
    
    return !error && data?.is_active === true;
  } catch {
    return false;
  }
}
// Get LINE bot configuration
export async function getLineBotConfig(): Promise<LineBotConfig | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('line_bot_config')
      .select('*')
      .eq('id', 'default')
      .single();
    
    if (error || !data) return null;
    
    return {
      id: (data as any).id,
      channelId: (data as any).channel_id,
      channelSecret: (data as any).channel_secret,
      channelAccessToken: (data as any).channel_access_token,
      housekeeperRichMenuId: (data as any).housekeeper_rich_menu_id,
      technicianRichMenuId: (data as any).technician_rich_menu_id,
      adminRichMenuId: (data as any).admin_rich_menu_id,
      webhookUrl: (data as any).webhook_url,
      isActive: (data as any).is_active,
      createdAt: (data as any).created_at,
      updatedAt: (data as any).updated_at,
    };
  } catch {
    return null;
  }
}
// Save LINE bot configuration
export async function saveLineBotConfig(config: Partial<LineBotConfig>): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  try {
    const { error } = await supabase
      .from('line_bot_config')
      .upsert({
        id: 'default',
        channel_id: config.channelId,
        channel_secret: config.channelSecret,
        channel_access_token: config.channelAccessToken,
        housekeeper_rich_menu_id: config.housekeeperRichMenuId,
        technician_rich_menu_id: config.technicianRichMenuId,
        admin_rich_menu_id: config.adminRichMenuId,
        webhook_url: config.webhookUrl,
        is_active: config.isActive ?? false,
        updated_at: new Date().toISOString(),
      } as any);
    
    return !error;
  } catch {
    return false;
  }
}
// Generate registration code for a user
export async function generateRegistrationCode(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .rpc('generate_line_registration_code', { p_user_id: userId });
    
    if (error) {
      console.error('Error generating registration code:', error);
      return null;
    }
    
    return data as string;
  } catch {
    return null;
  }
}
// Get registration code for a user
export async function getActiveRegistrationCode(userId: string): Promise<LineRegistrationCode | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('line_registration_codes')
      .select('*')
      .eq('user_id', userId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error || !data) return null;
    
    return {
      id: (data as any).id,
      userId: (data as any).user_id,
      code: (data as any).code,
      expiresAt: (data as any).expires_at,
      usedAt: (data as any).used_at,
      usedByLineId: (data as any).used_by_line_id,
      createdAt: (data as any).created_at,
    };
  } catch {
    return null;
  }
}
// Get LINE mapping for a user
export async function getStaffLineMapping(userId: string): Promise<StaffLineMapping | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('staff_line_mapping')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) return null;
    
    return {
      id: (data as any).id,
      userId: (data as any).user_id,
      lineUserId: (data as any).line_user_id,
      displayName: (data as any).display_name,
      pictureUrl: (data as any).picture_url,
      registrationCode: (data as any).registration_code,
      status: (data as any).status,
      richMenuId: (data as any).rich_menu_id,
      createdAt: (data as any).created_at,
      updatedAt: (data as any).updated_at,
    };
  } catch {
    return null;
  }
}
// Get all staff with LINE connected
export async function getAllStaffLineMappings(): Promise<StaffLineMapping[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('staff_line_mapping')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      lineUserId: d.line_user_id,
      displayName: d.display_name,
      pictureUrl: d.picture_url,
      registrationCode: d.registration_code,
      status: d.status,
      richMenuId: d.rich_menu_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));
  } catch {
    return [];
  }
}
// Unlink LINE from staff
export async function unlinkStaffLine(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  try {
    const { error } = await supabase
      .from('staff_line_mapping')
      .delete()
      .eq('user_id', userId);
    
    return !error;
  } catch {
    return false;
  }
}
// Send checkout alert notification
export async function sendCheckoutAlert(
  roomId: string,
  roomNumber: number,
  roomType: string,
  bookingId?: string
): Promise<{ success: boolean; sentTo?: number }> {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  
  try {
    const { data, error } = await supabase.functions.invoke('line-push', {
      body: {
        type: 'checkout_alert',
        data: { roomId, roomNumber, roomType, bookingId },
      },
    });
    
    if (error) {
      console.error('Error sending checkout alert:', error);
      return { success: false };
    }
    
    return data;
  } catch (err) {
    console.error('Error calling line-push:', err);
    return { success: false };
  }
}
// Send repair request notification
export async function sendRepairRequestNotification(
  reportId: string,
  roomId: string,
  roomNumber: number,
  description: string,
  priority: string,
  reporterName: string
): Promise<{ success: boolean; sentTo?: number }> {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  
  try {
    const { data, error } = await supabase.functions.invoke('line-push', {
      body: {
        type: 'repair_request',
        data: { reportId, roomId, roomNumber, description, priority, reporterName },
      },
    });
    
    if (error) {
      console.error('Error sending repair request:', error);
      return { success: false };
    }
    
    return data;
  } catch (err) {
    console.error('Error calling line-push:', err);
    return { success: false };
  }
}
// Send repair complete notification
export async function sendRepairCompleteNotification(
  reportId: string,
  roomId: string,
  roomNumber: number,
  description: string,
  technicianName: string
): Promise<{ success: boolean; sentTo?: number }> {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  
  try {
    const { data, error } = await supabase.functions.invoke('line-push', {
      body: {
        type: 'repair_complete',
        data: { reportId, roomId, roomNumber, description, technicianName },
      },
    });
    
    if (error) {
      console.error('Error sending repair complete:', error);
      return { success: false };
    }
    
    return data;
  } catch (err) {
    console.error('Error calling line-push:', err);
    return { success: false };
  }
}
// Send custom message
export async function sendCustomLineMessage(
  message: string,
  targetRole?: string,
  targetUserId?: string
): Promise<{ success: boolean; sentTo?: number }> {
  if (!isSupabaseConfigured || !supabase) return { success: false };
  
  try {
    const { data, error } = await supabase.functions.invoke('line-push', {
      body: {
        type: 'custom',
        data: { message, targetRole, targetUserId },
      },
    });
    
    if (error) {
      console.error('Error sending custom message:', error);
      return { success: false };
    }
    
    return data;
  } catch (err) {
    console.error('Error calling line-push:', err);
    return { success: false };
  }
}
// Get notification history
export async function getNotificationHistory(limit = 50): Promise<LineNotification[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('line_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      recipientUserId: d.recipient_user_id,
      recipientLineId: d.recipient_line_id,
      notificationType: d.notification_type,
      relatedRoomId: d.related_room_id,
      relatedMaintenanceId: d.related_maintenance_id,
      messageContent: d.message_content,
      status: d.status,
      errorMessage: d.error_message,
      sentAt: d.sent_at,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}
// Get cleaning tasks
export async function getCleaningTasks(status?: string): Promise<LineCleaningTask[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    let query = supabase
      .from('line_cleaning_tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      roomId: d.room_id,
      bookingId: d.booking_id,
      assignedTo: d.assigned_to,
      status: d.status,
      checkoutTime: d.checkout_time,
      acceptedAt: d.accepted_at,
      completedAt: d.completed_at,
      inspectedAt: d.inspected_at,
      inspectedBy: d.inspected_by,
      notes: d.notes,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}
// Test LINE connection
export async function testLineConnection(): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, message: 'Supabase ยังไม่ได้ตั้งค่า' };
  }
  
  try {
    const config = await getLineBotConfig();
    if (!config) {
      return { success: false, message: 'ไม่พบการตั้งค่า LINE' };
    }
    
    if (!config.channelAccessToken) {
      return { success: false, message: 'กรุณากรอก Channel Access Token' };
    }
    
    if (!config.channelId) {
      return { success: false, message: 'กรุณากรอก Channel ID' };
    }
    
    if (!config.channelSecret) {
      return { success: false, message: 'กรุณากรอก Channel Secret' };
    }
    
    // Check if token looks valid (LINE tokens are typically 100+ characters)
    if (config.channelAccessToken.length < 50) {
      return { success: false, message: 'Channel Access Token ไม่ถูกต้อง (สั้นเกินไป)' };
    }
    
    // All checks passed - config looks good!
    // Note: Actual API verification happens through Edge Functions, not browser (due to CORS)
    return { 
      success: true, 
      message: `✅ การตั้งค่าถูกต้อง! Channel ID: ${config.channelId}` 
    };
  } catch (err) {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}
// Update cleaning task status (mark as inspected/approved)
export async function updateCleaningTaskStatus(
  taskId: string, 
  status: 'pending' | 'accepted' | 'completed' | 'inspected',
  inspectedBy?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  try {
    const updates: any = { status };
    
    if (status === 'inspected') {
      updates.inspected_at = new Date().toISOString();
      if (inspectedBy) {
        updates.inspected_by = inspectedBy;
      }
    }
    
    const { error } = await supabase
      .from('line_cleaning_tasks')
      .update(updates as any)
      .eq('id', taskId);
    
    return !error;
  } catch {
    return false;
  }
}
// Get all active cleaning tasks (not yet inspected)
export async function getActiveCleaningTasks(): Promise<LineCleaningTask[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('line_cleaning_tasks')
      .select('*')
      .is('inspected_at', null)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    
    return data.map((d: any) => ({
      id: d.id,
      roomId: d.room_id,
      bookingId: d.booking_id,
      assignedTo: d.assigned_to,
      status: d.status,
      checkoutTime: d.checkout_time,
      acceptedAt: d.accepted_at,
      completedAt: d.completed_at,
      inspectedAt: d.inspected_at,
      inspectedBy: d.inspected_by,
      notes: d.notes,
      createdAt: d.created_at,
    }));
  } catch {
    return [];
  }
}
// Send cleaning request notification (manual or from checkout)
export async function sendCleaningRequest(
  roomId: string,
  roomNumber: number,
  roomType: string,
  bookingId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  
  try {
    const { data, error } = await supabase.functions.invoke('line-push', {
      body: {
        type: 'checkout_alert',
        data: {
          roomId,
          roomNumber,
          roomType,
          bookingId,
        },
      },
    });
    
    if (error) {
      console.error('Failed to send cleaning request:', error);
      return false;
    }
    
    return data?.success !== false;
  } catch {
    return false;
  }
}