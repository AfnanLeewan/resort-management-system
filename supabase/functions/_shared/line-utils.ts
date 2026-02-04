// Supabase Edge Function: Shared LINE Utilities
// These utilities are shared across LINE-related edge functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

// Types
export interface LineEvent {
  type: string;
  replyToken?: string;
  source: {
    type: string;
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  timestamp: number;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
}

export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

export interface LineConfig {
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
  housekeeperRichMenuId?: string;
  technicianRichMenuId?: string;
  adminRichMenuId?: string;
}

// Helper: Format room name
export const formatRoomName = (roomNumber: number | string): string => {
  const num = typeof roomNumber === 'string' ? parseInt(roomNumber, 10) : roomNumber;
  if (isNaN(num)) return String(roomNumber);

  if (num >= 1 && num <= 10) {
    return `RC${String(num).padStart(2, '0')}`;
  } else if (num >= 11 && num <= 20) {
    return `RB${String(num - 10).padStart(2, '0')}`;
  } else if (num >= 21 && num <= 30) {
    return `RA${String(num - 20).padStart(2, '0')}`;
  }
  return String(num).padStart(2, '0');
};

// Get Supabase client
export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Get LINE config from database
export async function getLineConfig(): Promise<LineConfig | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('line_bot_config')
    .select('*')
    .eq('id', 'default')
    .single();
  
  if (error || !data || !data.is_active) {
    console.error('LINE config not found or not active:', error);
    return null;
  }
  
  return {
    channelId: data.channel_id,
    channelSecret: data.channel_secret,
    channelAccessToken: data.channel_access_token,
    housekeeperRichMenuId: data.housekeeper_rich_menu_id,
    technicianRichMenuId: data.technician_rich_menu_id,
    adminRichMenuId: data.admin_rich_menu_id,
  };
}

// Verify LINE signature
export async function verifyLineSignature(
  body: string,
  signature: string,
  channelSecret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );
  
  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );
  
  return computedSignature === signature;
}

// Send LINE reply message
export async function replyMessage(
  replyToken: string,
  messages: any[],
  accessToken: string
): Promise<boolean> {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });
  
  if (!response.ok) {
    console.error('Reply failed:', await response.text());
    return false;
  }
  
  return true;
}

// Send LINE push message
export async function pushMessage(
  to: string,
  messages: any[],
  accessToken: string
): Promise<boolean> {
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to,
      messages,
    }),
  });
  
  if (!response.ok) {
    console.error('Push failed:', await response.text());
    return false;
  }
  
  return true;
}

// Send multicast message to multiple users
export async function multicastMessage(
  to: string[],
  messages: any[],
  accessToken: string
): Promise<boolean> {
  if (to.length === 0) return true;
  
  const response = await fetch('https://api.line.me/v2/bot/message/multicast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to,
      messages,
    }),
  });
  
  if (!response.ok) {
    console.error('Multicast failed:', await response.text());
    return false;
  }
  
  return true;
}

// Link rich menu to user
export async function linkRichMenu(
  userId: string,
  richMenuId: string,
  accessToken: string
): Promise<boolean> {
  const response = await fetch(
    `https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  return response.ok;
}

// Get user profile from LINE
export async function getUserProfile(
  userId: string,
  accessToken: string
): Promise<{ displayName: string; pictureUrl: string } | null> {
  const response = await fetch(
    `https://api.line.me/v2/bot/profile/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );
  
  if (!response.ok) {
    return null;
  }
  
  const data = await response.json();
  return {
    displayName: data.displayName,
    pictureUrl: data.pictureUrl,
  };
}

// Flex Message Templates
export const FlexTemplates = {
  // Cleaning task notification for housekeepers
  cleaningTask: (roomNumber: number, roomType: string, checkoutTime: string, taskId: string) => ({
    type: 'flex',
    altText: `ห้อง ${formatRoomName(roomNumber)} ต้องการทำความสะอาด`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🧹 งานทำความสะอาด',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
        ],
        backgroundColor: '#FF6B35',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ห้อง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: `${formatRoomName(roomNumber)}`, weight: 'bold', size: 'xl', flex: 3 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ประเภท', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: roomType === 'single' ? 'เตียงเดี่ยว' : 'เตียงคู่', size: 'sm', flex: 3 },
            ],
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'Checkout', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: checkoutTime, size: 'sm', flex: 3 },
            ],
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ รับงาน',
              data: `action=accept_clean&task_id=${taskId}`,
            },
            style: 'primary',
            color: '#2ECC71',
          },
        ],
        paddingAll: '15px',
      },
    },
  }),

  // Repair request notification for technicians
  repairRequest: (roomNumber: number, description: string, priority: string, reportId: string, reporterName: string) => ({
    type: 'flex',
    altText: `แจ้งซ่อม ห้อง ${formatRoomName(roomNumber)}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: priority === 'high' ? '🔴 แจ้งซ่อมด่วน!' : '🔧 แจ้งซ่อม',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
        ],
        backgroundColor: priority === 'high' ? '#E74C3C' : '#F39C12',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ห้อง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: `${formatRoomName(roomNumber)}`, weight: 'bold', size: 'xl', flex: 3 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ปัญหา', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: description, size: 'sm', wrap: true, flex: 3 },
            ],
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ผู้แจ้ง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: reporterName, size: 'sm', flex: 3 },
            ],
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '🔧 รับงานซ่อม',
              data: `action=accept_repair&report_id=${reportId}`,
            },
            style: 'primary',
            color: '#3498DB',
          },
        ],
        paddingAll: '15px',
      },
    },
  }),

  // Clean complete notification for admin
  cleanComplete: (roomNumber: number, cleanerName: string, taskId: string) => ({
    type: 'flex',
    altText: `ห้อง ${formatRoomName(roomNumber)} สะอาดแล้ว`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✨ ทำความสะอาดเสร็จ',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
        ],
        backgroundColor: '#2ECC71',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ห้อง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: `${formatRoomName(roomNumber)}`, weight: 'bold', size: 'xl', flex: 3 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'โดย', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: cleanerName, size: 'sm', flex: 3 },
            ],
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ อนุมัติเปิดห้อง',
              data: `action=approve_room&task_id=${taskId}`,
            },
            style: 'primary',
            color: '#27AE60',
          },
        ],
        paddingAll: '15px',
      },
    },
  }),

  // Repair complete notification for admin
  repairComplete: (roomNumber: number, description: string, technicianName: string, reportId: string) => ({
    type: 'flex',
    altText: `ห้อง ${formatRoomName(roomNumber)} ซ่อมเสร็จ`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ ซ่อมเสร็จแล้ว',
            weight: 'bold',
            size: 'xl',
            color: '#ffffff',
          },
        ],
        backgroundColor: '#3498DB',
        paddingAll: '20px',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ห้อง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: `${formatRoomName(roomNumber)}`, weight: 'bold', size: 'xl', flex: 3 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'รายการ', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: description, size: 'sm', wrap: true, flex: 3 },
            ],
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ช่าง', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: technicianName, size: 'sm', flex: 3 },
            ],
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '✅ เปิดห้องใช้งาน',
              data: `action=open_room&report_id=${reportId}`,
            },
            style: 'primary',
            color: '#27AE60',
          },
        ],
        paddingAll: '15px',
      },
    },
  }),

  // Simple text message
  text: (text: string) => ({
    type: 'text',
    text,
  }),

  // Welcome message
  welcome: () => ({
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ Royyan Resort',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🏨 Royyan Resort',
            weight: 'bold',
            size: 'xl',
            align: 'center',
          },
          {
            type: 'text',
            text: 'ระบบจัดการรีสอร์ท',
            size: 'sm',
            color: '#888888',
            align: 'center',
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'text',
            text: 'หากคุณเป็นพนักงาน กรุณาลงทะเบียนโดยพิมพ์:',
            size: 'sm',
            wrap: true,
            margin: 'xl',
          },
          {
            type: 'text',
            text: 'ลงทะเบียน [รหัส 6 หลัก]',
            size: 'sm',
            weight: 'bold',
            color: '#FF6B35',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'ตัวอย่าง: ลงทะเบียน ABC123',
            size: 'xs',
            color: '#888888',
            margin: 'sm',
          },
        ],
        paddingAll: '20px',
      },
    },
  }),

  // Registration success
  registrationSuccess: (name: string, role: string) => ({
    type: 'flex',
    altText: 'ลงทะเบียนสำเร็จ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ ลงทะเบียนสำเร็จ!',
            weight: 'bold',
            size: 'xl',
            color: '#2ECC71',
            align: 'center',
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'text',
            text: `ยินดีต้อนรับ ${name}`,
            size: 'lg',
            weight: 'bold',
            align: 'center',
            margin: 'xl',
          },
          {
            type: 'text',
            text: `ตำแหน่ง: ${role}`,
            size: 'sm',
            color: '#888888',
            align: 'center',
            margin: 'sm',
          },
          {
            type: 'text',
            text: 'คุณสามารถใช้เมนูด้านล่างเพื่อเริ่มใช้งานได้เลย',
            size: 'sm',
            wrap: true,
            align: 'center',
            margin: 'xl',
          },
        ],
        paddingAll: '20px',
      },
    },
  }),

  // Check-in/Check-out confirmation
  attendanceConfirm: (type: 'check-in' | 'check-out', time: string) => ({
    type: 'flex',
    altText: type === 'check-in' ? 'บันทึกเวลาเข้างาน' : 'บันทึกเวลาออกงาน',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: type === 'check-in' ? '🟢 เข้างานเรียบร้อย' : '🔴 ออกงานเรียบร้อย',
            weight: 'bold',
            size: 'lg',
            align: 'center',
            color: type === 'check-in' ? '#2ECC71' : '#E74C3C',
          },
          {
            type: 'text',
            text: time,
            size: 'xxl',
            weight: 'bold',
            align: 'center',
            margin: 'lg',
          },
          {
            type: 'text',
            text: type === 'check-in' ? 'สวัสดีวันทำงาน!' : 'ขอบคุณสำหรับวันนี้!',
            size: 'sm',
            color: '#888888',
            align: 'center',
            margin: 'md',
          },
        ],
        paddingAll: '20px',
      },
    },
  }),
};
