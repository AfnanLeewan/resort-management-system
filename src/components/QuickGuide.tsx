import { X, HelpCircle, AlertCircle, Phone } from 'lucide-react';

interface QuickGuideProps {
  onClose: () => void;
}

export function QuickGuide({ onClose }: QuickGuideProps) {
  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-8 py-6 border-b border-neutral-100 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">คู่มือใช้งานด่วน / Quick Guide</h2>
            <p className="text-neutral-500 text-sm">ข้อมูลสำคัญและการใช้งานเบื้องต้น</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-10">
          {/* Room Rates */}
          <section>
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-neutral-900 rounded-full"></span>
              อัตราค่าห้องพัก / Room Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-neutral-500 mb-1 text-sm">ทั่วไป / General</div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">฿890</div>
                <div className="text-xs text-neutral-400">ราคาปกติ</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-neutral-500 mb-1 text-sm">ทัวร์ / Tour</div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">฿840</div>
                <div className="text-xs text-neutral-400">ราคาแนะนำ</div>
              </div>
              <div className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                <div className="text-neutral-500 mb-1 text-sm">VIP</div>
                <div className="text-3xl font-bold text-neutral-900 mb-1">฿400</div>
                <div className="text-xs text-neutral-400">ผู้ถือหุ้น</div>
              </div>
            </div>
          </section>

          {/* Additional Charges */}
          <section>
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-neutral-900 rounded-full"></span>
              ค่าธรรมเนียม / Additional Charges
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <div className="text-neutral-900 font-medium">เช็คอินก่อนเวลา (Early Check-in)</div>
                  <div className="text-xs text-neutral-500">ก่อน 14:00 น.</div>
                </div>
                <div className="text-lg font-bold text-neutral-900">฿50<span className="text-xs font-normal text-neutral-500">/ชม.</span></div>
              </div>
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                <div>
                  <div className="text-neutral-900 font-medium">เช็คเอาท์ช้า (Late Check-out)</div>
                  <div className="text-xs text-neutral-500">หลัง 12:00 น.</div>
                </div>
                <div className="text-lg font-bold text-neutral-900">฿50<span className="text-xs font-normal text-neutral-500">/ชม.</span></div>
              </div>
            </div>
          </section>

          {/* Quick Steps */}
          <section>
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-neutral-900 rounded-full"></span>
              ขั้นตอนการทำงาน / Workflows
            </h3>
            <div className="space-y-4">
              <div className="group flex items-start gap-4 p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors">
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold shrink-0">1</div>
                <div>
                  <div className="font-bold text-neutral-900 mb-1">การจองห้อง / Booking</div>
                  <div className="text-neutral-600 text-sm">ไปที่เมนู <span className="font-medium bg-neutral-100 px-1 rounded">Front Desk</span> หรือ <span className="font-medium bg-neutral-100 px-1 rounded">ผังห้องพัก</span> → เลือกห้อง/วันที่ → กรอกข้อมูลลูกค้า → บันทึก</div>
                </div>
              </div>
              
              <div className="group flex items-start gap-4 p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors">
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold shrink-0">2</div>
                <div>
                  <div className="font-bold text-neutral-900 mb-1">เช็คอิน / Check-in</div>
                  <div className="text-neutral-600 text-sm">ค้นหาการจอง → ตรวจสอบเอกสาร → กดปุ่ม <span className="font-medium bg-neutral-100 px-1 rounded">เช็คอิน</span> → ส่งกุญแจ</div>
                </div>
              </div>

              <div className="group flex items-start gap-4 p-4 rounded-xl border border-neutral-100 hover:border-neutral-200 transition-colors">
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold shrink-0">3</div>
                <div>
                  <div className="font-bold text-neutral-900 mb-1">เช็คเอาท์ / Check-out</div>
                  <div className="text-neutral-600 text-sm">กดปุ่ม <span className="font-medium bg-neutral-100 px-1 rounded">เช็คเอาท์</span> → ตรวจสอบค่าใช้จ่ายเพิ่มเติม → รับชำระเงิน → พิมพ์ใบเสร็จ</div>
                </div>
              </div>
            </div>
          </section>

          {/* Room Status Legend */}
          <section>
            <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-neutral-900 rounded-full"></span>
              สถานะห้องพัก / Status Legend
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 px-4 py-2 border border-neutral-200 rounded-lg">
                <div className="w-3 h-3 border border-neutral-400 rounded-full"></div>
                <span className="text-neutral-700">ว่าง (Available)</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 border border-neutral-200 rounded-lg">
                <div className="w-3 h-3 bg-neutral-900 rounded-full"></div>
                <span className="text-neutral-700">มีผู้พัก (Occupied)</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 border border-neutral-200 rounded-lg">
                <div className="w-3 h-3 bg-yellow-200 rounded-full"></div>
                <span className="text-neutral-700">รอทำความสะอาด (Cleaning)</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 border border-neutral-200 rounded-lg">
                <div className="w-3 h-3 bg-red-200 rounded-full"></div>
                <span className="text-neutral-700">ซ่อมบำรุง (Maintenance)</span>
              </div>
            </div>
          </section>

          {/* Warning */}
          <section className="bg-neutral-50 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-neutral-900 shrink-0" />
            <div className="space-y-2">
              <h4 className="font-bold text-neutral-900">ข้อควรระวัง / Important</h4>
              <ul className="list-disc list-inside text-sm text-neutral-600 space-y-1">
                <li>ระบบคำนวณ VAT 7% อัตโนมัติ (รวมในราคาสินค้า)</li>
                <li>ใบกำกับภาษีจะถูกสร้างทันทีที่รับชำระเงิน</li>
                <li>อย่าล้างข้อมูล Browser (Clear Cache) เพราะข้อมูลทั้งหมดจะหายไป</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-neutral-100 px-8 py-6 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white py-4 rounded-xl transition-colors font-bold text-lg"
          >
            รับทราบ / Got it
          </button>
        </div>
      </div>
    </div>
  );
}
