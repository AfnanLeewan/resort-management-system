import { useState, useEffect } from 'react';
import { User, LineBotConfig } from '../types';
import * as lineService from '../utils/lineService';
import {
  MessageSquare,
  Settings,
  Key,
  Link2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Users,
  Bell,
  Loader2,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface LineSettingsProps {
  currentUser: User;
}

export function LineSettings({ currentUser }: LineSettingsProps) {
  const [config, setConfig] = useState<Partial<LineBotConfig>>({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
    housekeeperRichMenuId: '',
    technicianRichMenuId: '',
    adminRichMenuId: '',
    webhookUrl: '',
    isActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [staffMappings, setStaffMappings] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loadedConfig, mappings] = await Promise.all([
        lineService.getLineBotConfig(),
        lineService.getAllStaffLineMappings(),
      ]);

      if (loadedConfig) {
        setConfig(loadedConfig);
      }
      setStaffMappings(mappings);
    } catch (err) {
      console.error('Failed to load LINE config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await lineService.saveLineBotConfig(config);
      if (success) {
        alert('✅ บันทึกการตั้งค่าสำเร็จ');
      } else {
        alert('❌ ไม่สามารถบันทึกการตั้งค่าได้');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await lineService.testLineConnection();
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('คัดลอกแล้ว!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">กำลังโหลดการตั้งค่า...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl text-white shadow-lg shadow-green-200">
              <MessageSquare className="w-7 h-7" />
            </div>
            ตั้งค่า LINE Messaging API
          </h2>
          <p className="text-slate-500">เชื่อมต่อระบบแจ้งเตือนผ่าน LINE Official Account</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-sm disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            ทดสอบการเชื่อมต่อ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all font-bold shadow-lg shadow-green-200 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${
          testResult.success 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {testResult.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{testResult.message}</span>
        </div>
      )}

      {/* Status Card */}
      <div className={`rounded-3xl p-6 ${
        config.isActive 
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
          : 'bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${
              config.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-400'
            }`}>
              {config.isActive ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                สถานะ: {config.isActive ? 'เปิดใช้งาน' : 'ปิดอยู่'}
              </h3>
              <p className="text-slate-500 text-sm">
                {config.isActive 
                  ? 'ระบบแจ้งเตือน LINE กำลังทำงาน' 
                  : 'เปิดใช้งานเพื่อเริ่มส่งการแจ้งเตือน'}
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.isActive || false}
              onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Channel Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Channel ID
              </label>
              <input
                type="text"
                value={config.channelId || ''}
                onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="1234567890"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Channel Secret
              </label>
              <input
                type="password"
                value={config.channelSecret || ''}
                onChange={(e) => setConfig({ ...config, channelSecret: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="••••••••••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Channel Access Token (Long-lived)
              </label>
              <textarea
                value={config.channelAccessToken || ''}
                onChange={(e) => setConfig({ ...config, channelAccessToken: e.target.value })}
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all resize-none"
                placeholder="Paste your access token here..."
              />
            </div>
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
              <Link2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Webhook URL</h3>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-sm text-slate-600 mb-3">
                ตั้งค่า Webhook URL นี้ใน LINE Developers Console:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg border text-sm font-mono text-slate-700 truncate">
                  {config.webhookUrl || 'https://your-project.supabase.co/functions/v1/line-webhook'}
                </code>
                <button
                  onClick={() => copyToClipboard(config.webhookUrl || '')}
                  className="p-2 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                  title="คัดลอก"
                >
                  <Copy className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Webhook URL (สำหรับอัพเดท)
              </label>
              <input
                type="text"
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="https://your-project.supabase.co/functions/v1/line-webhook"
              />
            </div>

            <a
              href="https://developers.line.biz/console/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              ไปที่ LINE Developers Console
            </a>
          </div>
        </div>

        {/* Rich Menu IDs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Rich Menu IDs (Optional)</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Housekeeper Rich Menu ID
              </label>
              <input
                type="text"
                value={config.housekeeperRichMenuId || ''}
                onChange={(e) => setConfig({ ...config, housekeeperRichMenuId: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="richmenu-xxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Technician Rich Menu ID
              </label>
              <input
                type="text"
                value={config.technicianRichMenuId || ''}
                onChange={(e) => setConfig({ ...config, technicianRichMenuId: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="richmenu-xxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Admin Rich Menu ID
              </label>
              <input
                type="text"
                value={config.adminRichMenuId || ''}
                onChange={(e) => setConfig({ ...config, adminRichMenuId: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-100 focus:border-green-400 outline-none transition-all"
                placeholder="richmenu-xxxxxxxx"
              />
            </div>
          </div>
        </div>

        {/* Connected Staff */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl text-green-600">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">พนักงานที่เชื่อมต่อ LINE</h3>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
              {staffMappings.length} คน
            </span>
          </div>

          {staffMappings.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>ยังไม่มีพนักงานเชื่อมต่อ LINE</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {staffMappings.map((mapping) => (
                <div
                  key={mapping.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                    {mapping.pictureUrl ? (
                      <img src={mapping.pictureUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <MessageSquare className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">
                      {mapping.displayName || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {mapping.lineUserId}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    mapping.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {mapping.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-2xl text-blue-600 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">วิธีติดตั้ง LINE Messaging API</h3>
            <ol className="text-blue-700 text-sm space-y-2 list-decimal list-inside">
              <li>สร้าง <strong>LINE Official Account</strong> ที่ LINE for Business</li>
              <li>เปิดใช้งาน <strong>Messaging API</strong> ใน LINE Official Account Manager</li>
              <li>ไปที่ <strong>LINE Developers Console</strong> เพื่อดู Channel ID และ Secret</li>
              <li>สร้าง <strong>Long-lived Channel Access Token</strong></li>
              <li>ตั้งค่า <strong>Webhook URL</strong> ให้ชี้ไปที่ Supabase Edge Function</li>
              <li>Deploy Edge Functions: <code className="bg-white px-2 py-1 rounded text-xs">supabase functions deploy line-webhook</code></li>
              <li>เปิด <strong>Use webhook</strong> ใน LINE Developers Console</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Warning */}
      {!config.channelAccessToken && config.isActive && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <span className="text-yellow-700 font-medium">
            กรุณากรอก Channel Access Token ก่อนเปิดใช้งาน
          </span>
        </div>
      )}
    </div>
  );
}
