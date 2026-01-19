// Supabase Edge Function: LINE Push Message Handler
// Used by the web app to trigger notifications

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getLineConfig,
  pushMessage,
  multicastMessage,
  FlexTemplates,
} from '../_shared/line-utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushRequest {
  type: 'checkout_alert' | 'repair_request' | 'repair_complete' | 'clean_complete' | 'custom';
  data: any;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get LINE config
    const config = await getLineConfig();
    if (!config) {
      return new Response(JSON.stringify({ error: 'LINE not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const request: PushRequest = await req.json();
    console.log(`Push request type: ${request.type}`);

    let result;

    switch (request.type) {
      case 'checkout_alert':
        result = await handleCheckoutAlert(request.data, config, supabase);
        break;

      case 'repair_request':
        result = await handleRepairRequest(request.data, config, supabase);
        break;

      case 'repair_complete':
        result = await handleRepairComplete(request.data, config, supabase);
        break;

      case 'clean_complete':
        result = await handleCleanComplete(request.data, config, supabase);
        break;

      case 'custom':
        result = await handleCustomMessage(request.data, config, supabase);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unknown type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Push error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle checkout alert - notify housekeepers
async function handleCheckoutAlert(
  data: { roomId: string; roomNumber: number; roomType: string; bookingId?: string },
  config: any,
  supabase: any
) {
  const { roomId, roomNumber, roomType, bookingId } = data;

  // Create cleaning task
  const { data: task, error: taskError } = await supabase
    .from('line_cleaning_tasks')
    .insert({
      room_id: roomId,
      booking_id: bookingId,
      status: 'pending',
      checkout_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (taskError) {
    console.error('Failed to create task:', taskError);
    return { success: false, error: 'Failed to create task' };
  }

  // Get online housekeepers
  const { data: housekeepers, error: hkError } = await supabase.rpc('get_online_housekeepers_with_line');

  if (hkError || !housekeepers || housekeepers.length === 0) {
    console.log('No online housekeepers found, trying all active');
    
    // Fallback: get all active housekeepers
    const { data: allHk } = await supabase
      .from('staff_line_mapping')
      .select('*, users!inner(*)')
      .eq('status', 'active')
      .eq('users.role', 'housekeeping');

    if (!allHk || allHk.length === 0) {
      return { success: false, error: 'No housekeepers available' };
    }

    const lineIds = allHk.map((h: any) => h.line_user_id);
    const checkoutTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    await multicastMessage(
      lineIds,
      [FlexTemplates.cleaningTask(roomNumber, roomType, checkoutTime, task.id)],
      config.channelAccessToken
    );

    // Log notification
    for (const hk of allHk) {
      await supabase.from('line_notifications').insert({
        recipient_user_id: hk.user_id,
        recipient_line_id: hk.line_user_id,
        notification_type: 'checkout_alert',
        related_room_id: roomId,
        message_content: { roomNumber, roomType },
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    return { success: true, sentTo: lineIds.length };
  }

  // Send to online housekeepers
  const lineIds = housekeepers.map((h: any) => h.line_user_id);
  const checkoutTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  await multicastMessage(
    lineIds,
    [FlexTemplates.cleaningTask(roomNumber, roomType, checkoutTime, task.id)],
    config.channelAccessToken
  );

  // Log notifications
  for (const hk of housekeepers) {
    await supabase.from('line_notifications').insert({
      recipient_user_id: hk.user_id,
      recipient_line_id: hk.line_user_id,
      notification_type: 'checkout_alert',
      related_room_id: roomId,
      message_content: { roomNumber, roomType },
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }

  return { success: true, sentTo: lineIds.length };
}

// Handle repair request - notify technicians
async function handleRepairRequest(
  data: { 
    reportId: string; 
    roomId: string; 
    roomNumber: number; 
    description: string; 
    priority: string;
    reporterName: string;
  },
  config: any,
  supabase: any
) {
  const { reportId, roomId, roomNumber, description, priority, reporterName } = data;

  // Get technicians
  const { data: technicians, error: techError } = await supabase.rpc('get_online_technicians_with_line');

  let targetTechnicians = technicians;
  
  if (techError || !technicians || technicians.length === 0) {
    // Fallback: get all active technicians
    const { data: allTech } = await supabase
      .from('staff_line_mapping')
      .select('*, users!inner(*)')
      .eq('status', 'active')
      .eq('users.role', 'repair');

    if (!allTech || allTech.length === 0) {
      // Also notify admins if no technicians
      const { data: admins } = await supabase.rpc('get_admins_with_line');
      if (admins && admins.length > 0) {
        const adminLineIds = admins.map((a: any) => a.line_user_id);
        await multicastMessage(
          adminLineIds,
          [FlexTemplates.repairRequest(roomNumber, description, priority, reportId, reporterName)],
          config.channelAccessToken
        );
        return { success: true, sentTo: adminLineIds.length, target: 'admins' };
      }
      return { success: false, error: 'No technicians or admins available' };
    }
    targetTechnicians = allTech;
  }

  const lineIds = targetTechnicians.map((t: any) => t.line_user_id);

  await multicastMessage(
    lineIds,
    [FlexTemplates.repairRequest(roomNumber, description, priority, reportId, reporterName)],
    config.channelAccessToken
  );

  // Log notifications
  for (const tech of targetTechnicians) {
    await supabase.from('line_notifications').insert({
      recipient_user_id: tech.user_id,
      recipient_line_id: tech.line_user_id,
      notification_type: 'repair_request',
      related_room_id: roomId,
      related_maintenance_id: reportId,
      message_content: { roomNumber, description, priority },
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
  }

  // For high priority, also notify admins
  if (priority === 'high') {
    const { data: admins } = await supabase.rpc('get_admins_with_line');
    if (admins && admins.length > 0) {
      const adminLineIds = admins.map((a: any) => a.line_user_id);
      await multicastMessage(
        adminLineIds,
        [
          FlexTemplates.text(`🔴 แจ้งซ่อมด่วน!\nห้อง ${roomNumber}: ${description}\nแจ้งโดย: ${reporterName}`),
        ],
        config.channelAccessToken
      );
    }
  }

  return { success: true, sentTo: lineIds.length };
}

// Handle repair complete - notify admins
async function handleRepairComplete(
  data: {
    reportId: string;
    roomId: string;
    roomNumber: number;
    description: string;
    technicianName: string;
  },
  config: any,
  supabase: any
) {
  const { reportId, roomNumber, description, technicianName } = data;

  // Get admins
  const { data: admins } = await supabase.rpc('get_admins_with_line');

  if (!admins || admins.length === 0) {
    return { success: false, error: 'No admins available' };
  }

  const lineIds = admins.map((a: any) => a.line_user_id);

  await multicastMessage(
    lineIds,
    [FlexTemplates.repairComplete(roomNumber, description, technicianName, reportId)],
    config.channelAccessToken
  );

  return { success: true, sentTo: lineIds.length };
}

// Handle clean complete - notify admins
async function handleCleanComplete(
  data: {
    taskId: string;
    roomNumber: number;
    cleanerName: string;
  },
  config: any,
  supabase: any
) {
  const { taskId, roomNumber, cleanerName } = data;

  // Get admins
  const { data: admins } = await supabase.rpc('get_admins_with_line');

  if (!admins || admins.length === 0) {
    return { success: false, error: 'No admins available' };
  }

  const lineIds = admins.map((a: any) => a.line_user_id);

  await multicastMessage(
    lineIds,
    [FlexTemplates.cleanComplete(roomNumber, cleanerName, taskId)],
    config.channelAccessToken
  );

  return { success: true, sentTo: lineIds.length };
}

// Handle custom message
async function handleCustomMessage(
  data: {
    targetRole?: string;
    targetUserId?: string;
    message: string;
  },
  config: any,
  supabase: any
) {
  const { targetRole, targetUserId, message } = data;

  let lineIds: string[] = [];

  if (targetUserId) {
    // Send to specific user
    const { data: mapping } = await supabase
      .from('staff_line_mapping')
      .select('line_user_id')
      .eq('user_id', targetUserId)
      .eq('status', 'active')
      .single();

    if (mapping) {
      lineIds = [mapping.line_user_id];
    }
  } else if (targetRole) {
    // Send to all users with role
    const { data: mappings } = await supabase
      .from('staff_line_mapping')
      .select('*, users!inner(*)')
      .eq('status', 'active')
      .eq('users.role', targetRole);

    if (mappings) {
      lineIds = mappings.map((m: any) => m.line_user_id);
    }
  }

  if (lineIds.length === 0) {
    return { success: false, error: 'No recipients found' };
  }

  await multicastMessage(
    lineIds,
    [FlexTemplates.text(message)],
    config.channelAccessToken
  );

  return { success: true, sentTo: lineIds.length };
}
