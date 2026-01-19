// Supabase Edge Function: LINE Webhook Handler
// Handles all incoming events from LINE Messaging API

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  verifyLineSignature,
  getLineConfig,
  replyMessage,
  pushMessage,
  multicastMessage,
  linkRichMenu,
  getUserProfile,
  FlexTemplates,
  LineEvent,
  LineWebhookBody,
} from '../_shared/line-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-line-signature',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle GET requests (health check)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'OK', message: 'LINE Webhook is running' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body
    const body = await req.text();
    
    // Handle empty body (LINE verification request)
    if (!body || body.trim() === '' || body === '{}') {
      console.log('Received verification request or empty body');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse body to check if it's a verification (empty events array)
    let webhookBody: LineWebhookBody;
    try {
      webhookBody = JSON.parse(body);
    } catch {
      // If body can't be parsed, just return OK (might be verification)
      console.log('Could not parse body, returning OK');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle verification request (empty events array)
    if (!webhookBody.events || webhookBody.events.length === 0) {
      console.log('Received webhook with no events (verification)');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get LINE config
    const config = await getLineConfig();
    if (!config) {
      console.error('LINE config not found or not active');
      // Still return 200 to not block LINE
      return new Response(JSON.stringify({ error: 'LINE not configured' }), {
        status: 200, // Return 200 so LINE doesn't keep retrying
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature for actual events
    const signature = req.headers.get('x-line-signature');
    if (signature && config.channelSecret) {
      const isValid = await verifyLineSignature(body, signature, config.channelSecret);
      if (!isValid) {
        console.error('Invalid signature');
        // Log but still process (in case of signature verification issues)
      }
    }

    console.log('Received events:', webhookBody.events.length);

    // Process each event
    for (const event of webhookBody.events) {
      try {
        await handleEvent(event, config, supabase);
      } catch (eventError) {
        console.error('Error handling event:', eventError);
        // Continue processing other events
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent LINE from retrying indefinitely
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 200, // Return 200 to acknowledge receipt
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleEvent(event: LineEvent, config: any, supabase: any) {
  const userId = event.source.userId;
  console.log(`Event type: ${event.type}, User: ${userId}`);

  switch (event.type) {
    case 'follow':
      // User added the bot
      await handleFollow(event, config, supabase);
      break;

    case 'message':
      if (event.message?.type === 'text') {
        await handleTextMessage(event, config, supabase);
      } else if (event.message?.type === 'image') {
        await handleImageMessage(event, config, supabase);
      }
      break;

    case 'postback':
      await handlePostback(event, config, supabase);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

// Handle new follower - send welcome message
async function handleFollow(event: LineEvent, config: any, supabase: any) {
  const userId = event.source.userId;
  
  // Check if already registered
  const { data: existing } = await supabase
    .from('staff_line_mapping')
    .select('*')
    .eq('line_user_id', userId)
    .single();

  if (existing) {
    // Already registered, send welcome back
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text(`ยินดีต้อนรับกลับมา ${existing.display_name || 'คุณ'}! 🏨`)],
      config.channelAccessToken
    );
  } else {
    // New user, send registration instructions
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.welcome()],
      config.channelAccessToken
    );
  }
}

// Handle text messages
async function handleTextMessage(event: LineEvent, config: any, supabase: any) {
  const userId = event.source.userId;
  const text = event.message!.text!.trim();

  // Check for registration command
  const registerMatch = text.match(/^ลงทะเบียน\s+([A-Za-z0-9]{6})$/i);
  if (registerMatch) {
    await handleRegistration(event, registerMatch[1].toUpperCase(), config, supabase);
    return;
  }

  // Check if user is registered
  const { data: staffMapping } = await supabase
    .from('staff_line_mapping')
    .select('*, users(*)')
    .eq('line_user_id', userId)
    .single();

  if (!staffMapping) {
    // Not registered
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('กรุณาลงทะเบียนก่อนใช้งาน\nพิมพ์: ลงทะเบียน [รหัส 6 หลัก]')],
      config.channelAccessToken
    );
    return;
  }

  // 1. Check for "Pending Repair Details" state (User clicked button -> Waiting for input)
  const { data: pendingRepairState } = await supabase
    .from('line_cleaning_tasks')
    .select('*, rooms(*)')
    .eq('assigned_to', staffMapping.user_id)
    .eq('status', 'pending_repair_details')
    .single();

  if (pendingRepairState) {
    await processRepairReport(event, pendingRepairState, text, config, supabase, staffMapping);
    return;
  }

  // 2. Check for "แจ้งซ่อม [details]" pattern (User typed command directly)
  if (text.startsWith('แจ้งซ่อม')) {
    const details = text.replace('แจ้งซ่อม', '').trim();
    if (details.length > 0) {
      // Find active task for this user
      const { data: activeTask } = await supabase
        .from('line_cleaning_tasks')
        .select('*, rooms(*)')
        .eq('assigned_to', staffMapping.user_id)
        .in('status', ['accepted', 'in_progress'])
        .single();
      
      if (activeTask) {
        await processRepairReport(event, activeTask, details, config, supabase, staffMapping);
        return;
      } else {
         await replyMessage(
          event.replyToken!,
          [FlexTemplates.text('❌ ไม่พบงานที่กำลังทำอยู่ กรุณารับงานก่อนแจ้งซ่อม')],
          config.channelAccessToken
        );
        return;
      }
    }
  }

  // Handle commands from registered users
  const lowerText = text.toLowerCase();

  if (lowerText.includes('สวัสดี') || lowerText === 'hi' || lowerText === 'hello') {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text(`สวัสดีค่ะ ${staffMapping.display_name || staffMapping.users?.name} 👋\nใช้เมนูด้านล่างเพื่อดำเนินการได้เลย`)],
      config.channelAccessToken
    );
  }
}

// Helper to save repair report and send summary
async function processRepairReport(event: LineEvent, task: any, details: string, config: any, supabase: any, staffMapping: any) {
    // Update task status
    await supabase
      .from('line_cleaning_tasks')
      .update({
        status: 'needs_repair',
        notes: details,
      })
      .eq('id', task.id);

    // Notify admins
    const { data: admins } = await supabase.rpc('get_admins_with_line');
    if (admins && admins.length > 0) {
      const adminLineIds = admins.map((a: any) => a.line_user_id);
      await multicastMessage(
        adminLineIds,
        [
          {
            type: 'flex',
            altText: `🔧 แจ้งซ่อมจากแม่บ้าน ห้อง ${task.rooms?.number}`,
            contents: {
              type: 'bubble',
              header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#E74C3C',
                contents: [
                  {
                    type: 'text',
                    text: '🔧 แจ้งซ่อมจากแม่บ้าน',
                    color: '#FFFFFF',
                    weight: 'bold',
                    size: 'lg',
                  },
                ],
              },
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: `ห้อง ${task.rooms?.number}`,
                    weight: 'bold',
                    size: 'xl',
                  },
                  {
                    type: 'text',
                    text: `แจ้งโดย: ${staffMapping.display_name || staffMapping.users?.name}`,
                    color: '#888888',
                    margin: 'md',
                  },
                  {
                    type: 'separator',
                    margin: 'lg',
                  },
                  {
                    type: 'text',
                    text: 'รายละเอียด:',
                    weight: 'bold',
                    margin: 'lg',
                  },
                  {
                    type: 'text',
                    text: details,
                    wrap: true,
                    margin: 'sm',
                  },
                ],
              },
            },
          },
        ],
        config.channelAccessToken
      );
    }

    // Send summary card back to housekeeper
    await replyMessage(
      event.replyToken!,
      [
        {
          type: 'flex',
          altText: `แจ้งซ่อม ห้อง ${task.rooms?.number} สำเร็จ`,
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'แจ้งซ่อม',
                  weight: 'bold',
                  color: '#E74C3C',
                  size: 'sm',
                },
                {
                  type: 'text',
                  text: `ห้อง ${task.rooms?.number}`,
                  weight: 'bold',
                  size: 'xl',
                  margin: 'sm',
                },
                {
                  type: 'text',
                  text: `details: ${details}`,
                  size: 'sm',
                  color: '#555555',
                  wrap: true,
                  margin: 'md',
                },
                {
                  type: 'text',
                  text: 'สำเร็จ',
                  size: 'sm',
                  color: '#27AE60',
                  weight: 'bold',
                  align: 'end',
                  margin: 'lg',
                },
              ],
            },
          },
        },
      ],
      config.channelAccessToken
    );
}

// Handle registration
async function handleRegistration(event: LineEvent, code: string, config: any, supabase: any) {
  const lineUserId = event.source.userId;

  // Find registration code
  const { data: regCode, error: codeError } = await supabase
    .from('line_registration_codes')
    .select('*, users(*)')
    .eq('code', code)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (codeError || !regCode) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ รหัสไม่ถูกต้องหรือหมดอายุแล้ว\nกรุณาขอรหัสใหม่จากระบบหลังบ้าน')],
      config.channelAccessToken
    );
    return;
  }

  // Get LINE profile
  const profile = await getUserProfile(lineUserId, config.channelAccessToken);

  // Mark code as used
  await supabase
    .from('line_registration_codes')
    .update({
      used_at: new Date().toISOString(),
      used_by_line_id: lineUserId,
    })
    .eq('id', regCode.id);

  // Create staff_line_mapping
  const { error: mappingError } = await supabase
    .from('staff_line_mapping')
    .upsert({
      user_id: regCode.user_id,
      line_user_id: lineUserId,
      display_name: profile?.displayName || regCode.users?.name,
      picture_url: profile?.pictureUrl,
      status: 'active',
    });

  if (mappingError) {
    console.error('Mapping error:', mappingError);
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')],
      config.channelAccessToken
    );
    return;
  }

  // Assign rich menu based on role
  const role = regCode.users?.role;
  let richMenuId = null;
  let roleLabel = 'พนักงาน';

  if (role === 'housekeeping') {
    richMenuId = config.housekeeperRichMenuId;
    roleLabel = 'แม่บ้าน';
  } else if (role === 'repair') {
    richMenuId = config.technicianRichMenuId;
    roleLabel = 'ช่างซ่อม';
  } else if (role === 'management' || role === 'front-desk') {
    richMenuId = config.adminRichMenuId;
    roleLabel = role === 'management' ? 'ผู้จัดการ' : 'ต้อนรับ';
  }

  if (richMenuId) {
    await linkRichMenu(lineUserId, richMenuId, config.channelAccessToken);
    
    // Save rich menu assignment
    await supabase
      .from('staff_line_mapping')
      .update({ rich_menu_id: richMenuId })
      .eq('line_user_id', lineUserId);
  }

  // Send success message
  await replyMessage(
    event.replyToken!,
    [FlexTemplates.registrationSuccess(regCode.users?.name || 'คุณ', roleLabel)],
    config.channelAccessToken
  );
}

// Handle image messages (for repair reports)
async function handleImageMessage(event: LineEvent, config: any, supabase: any) {
  const userId = event.source.userId;

  // Check if user is registered and in repair reporting state
  const { data: staffMapping } = await supabase
    .from('staff_line_mapping')
    .select('*, users(*)')
    .eq('line_user_id', userId)
    .single();

  if (!staffMapping) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('กรุณาลงทะเบียนก่อนใช้งาน')],
      config.channelAccessToken
    );
    return;
  }

  // For now, just acknowledge
  await replyMessage(
    event.replyToken!,
    [FlexTemplates.text('ได้รับรูปภาพแล้ว 📷\nกรุณาใช้ปุ่ม "แจ้งซ่อม" ในเมนูเพื่อเริ่มแจ้งซ่อม')],
    config.channelAccessToken
  );
}

// Handle postback actions
async function handlePostback(event: LineEvent, config: any, supabase: any) {
  const userId = event.source.userId;
  const data = event.postback!.data;
  const params = new URLSearchParams(data);
  const action = params.get('action');

  console.log(`Postback action: ${action}, User: ${userId}`);

  // Get staff mapping
  const { data: staffMapping } = await supabase
    .from('staff_line_mapping')
    .select('*, users(*)')
    .eq('line_user_id', userId)
    .single();

  if (!staffMapping) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('กรุณาลงทะเบียนก่อนใช้งาน')],
      config.channelAccessToken
    );
    return;
  }

  switch (action) {
    case 'checkin':
      await handleAttendance(event, staffMapping, 'check-in', config, supabase);
      break;

    case 'checkout':
      await handleAttendance(event, staffMapping, 'check-out', config, supabase);
      break;

    case 'accept_clean':
      await handleAcceptClean(event, staffMapping, params.get('task_id')!, config, supabase);
      break;

    case 'clean_complete':
      await handleCleanComplete(event, staffMapping, params.get('task_id')!, config, supabase);
      break;

    case 'accept_repair':
      await handleAcceptRepair(event, staffMapping, params.get('report_id')!, config, supabase);
      break;

    case 'repair_complete':
      await handleRepairComplete(event, staffMapping, params.get('report_id')!, config, supabase);
      break;

    case 'approve_room':
      await handleApproveRoom(event, staffMapping, params.get('task_id')!, config, supabase);
      break;

    case 'open_room':
      await handleOpenRoom(event, staffMapping, params.get('report_id')!, config, supabase);
      break;

    case 'report_repair_from_clean':
      await handleReportRepairFromClean(event, staffMapping, params.get('task_id')!, params.get('room_id')!, config, supabase);
      break;

    default:
      console.log(`Unknown action: ${action}`);
  }
}

// Handle attendance check-in/check-out
async function handleAttendance(
  event: LineEvent,
  staffMapping: any,
  type: 'check-in' | 'check-out',
  config: any,
  supabase: any
) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  // Record attendance
  await supabase.from('attendance_records').insert({
    user_id: staffMapping.user_id,
    type: type,
    timestamp: now.toISOString(),
    note: 'ลงเวลาผ่าน LINE',
  });

  // Update user status
  await supabase
    .from('users')
    .update({
      status: type === 'check-in' ? 'on-duty' : 'off-duty',
      [type === 'check-in' ? 'last_check_in' : 'last_check_out']: now.toISOString(),
    })
    .eq('id', staffMapping.user_id);

  await replyMessage(
    event.replyToken!,
    [FlexTemplates.attendanceConfirm(type, timeStr)],
    config.channelAccessToken
  );
}

// Handle accepting cleaning task
async function handleAcceptClean(
  event: LineEvent,
  staffMapping: any,
  taskId: string,
  config: any,
  supabase: any
) {
  // Update task
  const { data: task, error } = await supabase
    .from('line_cleaning_tasks')
    .update({
      assigned_to: staffMapping.user_id,
      status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'pending')
    .select('*, rooms(*)')
    .single();

  if (error || !task) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ งานนี้ถูกรับไปแล้วหรือไม่พบงาน')],
      config.channelAccessToken
    );
    return;
  }

  // Send message with both Done and Report Repair buttons
  await replyMessage(
    event.replyToken!,
    [
      FlexTemplates.text(`✅ รับงานห้อง ${task.rooms?.number} เรียบร้อย\n\nเมื่อทำเสร็จแล้ว กดปุ่ม "เสร็จสิ้น"\nหากพบสิ่งที่ต้องซ่อม กดปุ่ม "แจ้งซ่อม"`),
      {
        type: 'flex',
        altText: 'ดำเนินการห้อง ' + task.rooms?.number,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `ห้อง ${task.rooms?.number}`,
                weight: 'bold',
                size: 'xl',
                align: 'center',
              },
              {
                type: 'text',
                text: 'เลือกดำเนินการ',
                size: 'sm',
                color: '#888888',
                align: 'center',
                margin: 'md',
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '✨ เสร็จสิ้น',
                  data: `action=clean_complete&task_id=${taskId}`,
                },
                style: 'primary',
                color: '#2ECC71',
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🔧 แจ้งซ่อม',
                  data: `action=report_repair_from_clean&task_id=${taskId}&room_id=${task.room_id}`,
                },
                style: 'secondary',
                color: '#E67E22',
              },
            ],
          },
        },
      },
    ],
    config.channelAccessToken
  );
}

// Handle cleaning complete
async function handleCleanComplete(
  event: LineEvent,
  staffMapping: any,
  taskId: string,
  config: any,
  supabase: any
) {
  // Update task
  const { data: task, error } = await supabase
    .from('line_cleaning_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('assigned_to', staffMapping.user_id)
    .select('*, rooms(*)')
    .single();

  if (error || !task) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ ไม่พบงานหรือคุณไม่ใช่ผู้รับผิดชอบงานนี้')],
      config.channelAccessToken
    );
    return;
  }

  // Update room status to waiting for inspection
  await supabase
    .from('rooms')
    .update({ status: 'cleaning' }) // Still shows as cleaning until admin approves
    .eq('id', task.room_id);

  // Notify admins
  const { data: admins } = await supabase.rpc('get_admins_with_line');
  if (admins && admins.length > 0) {
    const adminLineIds = admins.map((a: any) => a.line_user_id);
    await multicastMessage(
      adminLineIds,
      [FlexTemplates.cleanComplete(task.rooms?.number, staffMapping.display_name || staffMapping.users?.name, taskId)],
      config.channelAccessToken
    );
  }

  await replyMessage(
    event.replyToken!,
    [FlexTemplates.text(`✅ บันทึกเรียบร้อย\nห้อง ${task.rooms?.number} รอการตรวจสอบจาก Admin`)],
    config.channelAccessToken
  );
}

// Handle accepting repair task
async function handleAcceptRepair(
  event: LineEvent,
  staffMapping: any,
  reportId: string,
  config: any,
  supabase: any
) {
  // Update maintenance report
  const { data: report, error } = await supabase
    .from('maintenance_reports')
    .update({
      status: 'in-progress',
    })
    .eq('id', reportId)
    .eq('status', 'pending')
    .select('*, rooms(*)')
    .single();

  if (error || !report) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ งานนี้ถูกรับไปแล้วหรือไม่พบงาน')],
      config.channelAccessToken
    );
    return;
  }

  await replyMessage(
    event.replyToken!,
    [
      FlexTemplates.text(`🔧 รับงานซ่อมห้อง ${report.rooms?.number} เรียบร้อย\n\n📋 ${report.description}\n\nเมื่อซ่อมเสร็จแล้ว กดปุ่ม "เสร็จสิ้น"`),
      {
        type: 'flex',
        altText: 'ซ่อมเสร็จแล้ว',
        contents: {
          type: 'bubble',
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '✅ ซ่อมเสร็จแล้ว',
                  data: `action=repair_complete&report_id=${reportId}`,
                },
                style: 'primary',
                color: '#3498DB',
              },
            ],
          },
        },
      },
    ],
    config.channelAccessToken
  );
}

// Handle repair complete
async function handleRepairComplete(
  event: LineEvent,
  staffMapping: any,
  reportId: string,
  config: any,
  supabase: any
) {
  // Update maintenance report
  const { data: report, error } = await supabase
    .from('maintenance_reports')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select('*, rooms(*)')
    .single();

  if (error || !report) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ ไม่พบงานซ่อม')],
      config.channelAccessToken
    );
    return;
  }

  // Update room status to cleaning (needs cleaning after repair)
  await supabase
    .from('rooms')
    .update({ status: 'cleaning' })
    .eq('id', report.room_id);

  // Notify admins
  const { data: admins } = await supabase.rpc('get_admins_with_line');
  if (admins && admins.length > 0) {
    const adminLineIds = admins.map((a: any) => a.line_user_id);
    await multicastMessage(
      adminLineIds,
      [FlexTemplates.repairComplete(
        report.rooms?.number,
        report.description,
        staffMapping.display_name || staffMapping.users?.name,
        reportId
      )],
      config.channelAccessToken
    );
  }

  await replyMessage(
    event.replyToken!,
    [FlexTemplates.text(`✅ บันทึกเรียบร้อย\nห้อง ${report.rooms?.number} ซ่อมเสร็จ รอ Admin อนุมัติ`)],
    config.channelAccessToken
  );
}

// Handle admin approving room (after cleaning)
async function handleApproveRoom(
  event: LineEvent,
  staffMapping: any,
  taskId: string,
  config: any,
  supabase: any
) {
  // Verify admin role
  if (!['management', 'front-desk'].includes(staffMapping.users?.role)) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ คุณไม่มีสิทธิ์ดำเนินการนี้')],
      config.channelAccessToken
    );
    return;
  }

  // Update task
  const { data: task, error } = await supabase
    .from('line_cleaning_tasks')
    .update({
      status: 'inspected',
      inspected_at: new Date().toISOString(),
      inspected_by: staffMapping.user_id,
    })
    .eq('id', taskId)
    .select('*, rooms(*)')
    .single();

  if (error || !task) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ ไม่พบงาน')],
      config.channelAccessToken
    );
    return;
  }

  // Update room status to available
  await supabase
    .from('rooms')
    .update({ status: 'available' })
    .eq('id', task.room_id);

  await replyMessage(
    event.replyToken!,
    [FlexTemplates.text(`✅ อนุมัติเรียบร้อย\nห้อง ${task.rooms?.number} พร้อมให้บริการแล้ว 🏨`)],
    config.channelAccessToken
  );
}

// Handle admin opening room (after repair)
async function handleOpenRoom(
  event: LineEvent,
  staffMapping: any,
  reportId: string,
  config: any,
  supabase: any
) {
  // Verify admin role
  if (!['management', 'front-desk'].includes(staffMapping.users?.role)) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ คุณไม่มีสิทธิ์ดำเนินการนี้')],
      config.channelAccessToken
    );
    return;
  }

  // Get report
  const { data: report, error } = await supabase
    .from('maintenance_reports')
    .select('*, rooms(*)')
    .eq('id', reportId)
    .single();

  if (error || !report) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ ไม่พบรายการซ่อม')],
      config.channelAccessToken
    );
    return;
  }

  // Update room status to available
  await supabase
    .from('rooms')
    .update({ status: 'available' })
    .eq('id', report.room_id);

  await replyMessage(
    event.replyToken!,
    [FlexTemplates.text(`✅ เปิดห้องเรียบร้อย\nห้อง ${report.rooms?.number} พร้อมให้บริการแล้ว 🏨`)],
    config.channelAccessToken
  );
}

// Handle housekeeper reporting repair during cleaning
async function handleReportRepairFromClean(
  event: LineEvent,
  staffMapping: any,
  taskId: string,
  roomId: string,
  config: any,
  supabase: any
) {
  // Get task and room info
  const { data: task, error: taskError } = await supabase
    .from('line_cleaning_tasks')
    .select('*, rooms(*)')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    await replyMessage(
      event.replyToken!,
      [FlexTemplates.text('❌ ไม่พบงาน')],
      config.channelAccessToken
    );
    return;
  }

  // Update task status to 'pending_repair_details' - waiting for housekeeper to provide details
  await supabase
    .from('line_cleaning_tasks')
    .update({
      status: 'pending_repair_details',
    })
    .eq('id', taskId);

  // Ask housekeeper for repair details
  await replyMessage(
    event.replyToken!,
    [
      {
        type: 'flex',
        altText: `แจ้งซ่อมห้อง ${task.rooms?.number}`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#E74C3C',
            contents: [
              {
                type: 'text',
                text: '🔧 แจ้งซ่อม',
                color: '#FFFFFF',
                weight: 'bold',
                size: 'lg',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `ห้อง ${task.rooms?.number}`,
                weight: 'bold',
                size: 'xl',
                align: 'center',
              },
              {
                type: 'separator',
                margin: 'lg',
              },
              {
                type: 'text',
                text: '📝 กรุณาพิมพ์รายละเอียดสิ่งที่ต้องซ่อม',
                margin: 'lg',
                wrap: true,
                weight: 'bold',
              },
              {
                type: 'text',
                text: 'เช่น: แอร์ไม่เย็น, น้ำรั่ว, ไฟเสีย ฯลฯ',
                margin: 'sm',
                wrap: true,
                color: '#888888',
                size: 'sm',
              },
            ],
          },
        },
      },
    ],
    config.channelAccessToken
  );
}
