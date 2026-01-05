import { X, HelpCircle, AlertCircle, Phone, BookOpen, ChevronRight } from 'lucide-react';

interface QuickGuideProps {
  onClose: () => void;
}

export function QuickGuide({ onClose }: QuickGuideProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[70] overflow-y-auto backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-200 scale-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">คู่มือใช้งานด่วน / Quick Guide</h2>
              <p className="text-slate-500 text-sm">ข้อมูลสำคัญและการใช้งานเบื้องต้น</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-10 flex-1 overflow-y-auto">
          {/* Room Rates */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
              อัตราค่าห้องพัก / Room Rates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-orange-200 group">
                <div className="text-slate-500 mb-2 text-sm font-medium">ทั่วไป / General</div>
                <div className="text-3xl font-bold text-slate-800 mb-1 group-hover:text-orange-500 transition-colors">฿890</div>
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg inline-block">ราคาปกติ</div>
              </div>
              <div className="bg-orange-500 border border-orange-400 rounded-2xl p-6 shadow-xl shadow-orange-200 transform scale-105">
                <div className="text-orange-100 mb-2 text-sm font-medium">ทัวร์ / Tour</div>
                <div className="text-3xl font-bold text-white mb-1">฿840</div>
                <div className="text-xs text-orange-200 bg-white/20 px-2 py-1 rounded-lg inline-block backdrop-blur-sm">ราคาแนะนำ</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 hover:border-orange-200 group">
                <div className="text-slate-500 mb-2 text-sm font-medium">VIP</div>
                <div className="text-3xl font-bold text-slate-800 mb-1 group-hover:text-orange-500 transition-colors">฿400</div>
                <div className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg inline-block">ผู้ถือหุ้น</div>
              </div>
            </div>
          </section>

          {/* Additional Charges */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
              ค่าธรรมเนียม / Additional Charges
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-slate-800 font-bold mb-1">เช็คอินก่อนเวลา (Early Check-in)</div>
                  <div className="text-xs text-slate-500 font-medium">ก่อน 14:00 น.</div>
                </div>
                <div className="text-xl font-bold text-orange-600">฿50<span className="text-xs font-normal text-slate-500 ml-1">/ชม.</span></div>
              </div>
              <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="text-slate-800 font-bold mb-1">เช็คเอาท์ช้า (Late Check-out)</div>
                  <div className="text-xs text-slate-500 font-medium">หลัง 12:00 น.</div>
                </div>
                <div className="text-xl font-bold text-orange-600">฿50<span className="text-xs font-normal text-slate-500 ml-1">/ชม.</span></div>
              </div>
            </div>
          </section>

          {/* Quick Steps */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
              ขั้นตอนการทำงาน / Workflows
            </h3>
            <div className="space-y-4">
              <div className="group flex items-start gap-5 p-5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center text-slate-600 group-hover:text-orange-600 font-bold shrink-0 transition-colors text-lg">1</div>
                <div>
                  <div className="font-bold text-slate-800 mb-2 text-lg">การจองห้อง / Booking</div>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    ไปที่เมนู <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">ผังห้องพัก</span> → เลือกห้อง/วันที่ → กรอกข้อมูลลูกค้า → บันทึก
                  </div>
                </div>
              </div>
              
              <div className="group flex items-start gap-5 p-5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center text-slate-600 group-hover:text-orange-600 font-bold shrink-0 transition-colors text-lg">2</div>
                <div>
                  <div className="font-bold text-slate-800 mb-2 text-lg">เช็คอิน / Check-in</div>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    ค้นหาการจอง → ตรวจสอบเอกสาร → กดปุ่ม <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">เช็คอิน</span> → ส่งกุญแจ
                  </div>
                </div>
              </div>

              <div className="group flex items-start gap-5 p-5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center text-slate-600 group-hover:text-orange-600 font-bold shrink-0 transition-colors text-lg">3</div>
                <div>
                  <div className="font-bold text-slate-800 mb-2 text-lg">เช็คเอาท์ / Check-out</div>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    กดปุ่ม <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">เช็คเอาท์</span> → ตรวจสอบค่าใช้จ่ายเพิ่มเติม → รับชำระเงิน → พิมพ์ใบเสร็จ
                  </div>
                </div>
              </div>

              <div className="group flex items-start gap-5 p-5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center text-slate-600 group-hover:text-orange-600 font-bold shrink-0 transition-colors text-lg">4</div>
                <div>
                  <div className="font-bold text-slate-800 mb-2 text-lg">เบิกพัสดุ / Inventory Issue</div>
                  <div className="text-slate-600 text-sm leading-relaxed">
                    ไปที่เมนู <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">คลังพัสดุ</span> → กดปุ่ม <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">รับเข้า / เบิกใช้</span> → เลือกประเภท "เบิกใช้" → ระบุรายการและจำนวน
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Services Info */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
              บริการเสริม & สิ่งอำนวยความสะดวก
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Additional Services */}
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                        <span className="p-1.5 bg-orange-100 rounded-lg text-orange-600">
                            <AlertCircle className="w-5 h-5" />
                        </span>
                        ค่าบริการเสริม (เพิ่มใน Booking)
                    </h4>
                    <ul className="space-y-3">
                        <li className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                            <span className="text-slate-600">เตียงเสริม (Extra Bed)</span>
                            <span className="font-bold text-slate-800">฿150</span>
                        </li>
                        <li className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                            <span className="text-slate-600">ถ่านก่อไฟ (Charcoal)</span>
                            <span className="font-bold text-slate-800">฿25</span>
                        </li>
                        <li className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                            <span className="text-slate-600">เตาปิ้งย่าง (Grill Stove)</span>
                            <span className="font-bold text-green-600">ฟรี / Free</span>
                        </li>
                        <li className="flex justify-between items-center text-sm pt-1">
                            <span className="text-slate-600">อื่นๆ (กำหนดเอง)</span>
                            <span className="font-bold text-slate-800">ตามระบุ</span>
                        </li>
                    </ul>
                </div>

                {/* Pool Service */}
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                        <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                            <AlertCircle className="w-5 h-5" />
                        </span>
                        สระว่ายน้ำ (Swimming Pool)
                    </h4>
                    <ul className="space-y-3 text-sm text-slate-600">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                            <span>เวลาทำการ: <span className="font-bold text-slate-800">08:00 - 20:00 น.</span></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                            <span>ลูกค้าเข้าพัก: <span className="font-bold text-green-600">ใช้บริการฟรี</span></span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                            <span>บุคคลภายนอก: ผู้ใหญ่ ฿100 / เด็ก ฿50</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                            <span>ติดต่อขอรับผ้าเช็ดตัวได้ที่เคาน์เตอร์</span>
                        </li>
                    </ul>
                </div>
            </div>
          </section>

          {/* Room Status Legend */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
              สถานะห้องพัก / Status Legend
            </h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-3 px-5 py-3 border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="w-4 h-4 border-2 border-slate-300 rounded-full"></div>
                <span className="text-slate-600 font-medium">ว่าง (Available)</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 border border-slate-800 bg-slate-800 text-white rounded-xl shadow-sm">
                <div className="w-4 h-4 bg-white rounded-full"></div>
                <span className="font-medium">มีผู้พัก (Occupied)</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 border border-orange-200 bg-orange-50 text-orange-800 rounded-xl shadow-sm">
                <div className="w-4 h-4 bg-orange-400 rounded-full"></div>
                <span className="font-medium">รอทำความสะอาด (Cleaning)</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 border border-red-200 bg-red-50 text-red-800 rounded-xl shadow-sm">
                <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                <span className="font-medium">ซ่อมบำรุง (Maintenance)</span>
              </div>
            </div>
          </section>

          {/* Warning */}
          <section className="bg-red-50 rounded-2xl p-6 flex items-start gap-4 border border-red-100">
            <div className="p-2 bg-white rounded-full shrink-0 shadow-sm text-red-500">
               <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-red-800 text-lg">ข้อควรระวัง / Important</h4>
              <ul className="list-disc list-inside text-sm text-red-700/80 space-y-1 font-medium">
                <li>ระบบคำนวณ VAT 7% อัตโนมัติ (รวมในราคาสินค้า)</li>
                <li>ใบกำกับภาษีจะถูกสร้างทันทีที่รับชำระเงิน</li>
                <li>อย่าล้างข้อมูล Browser (Clear Cache) เพราะข้อมูลทั้งหมดจะหายไป</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-8 py-6 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl transition-all font-bold text-lg shadow-xl shadow-slate-200 active:scale-[0.99]"
          >
            รับทราบ / Got it
          </button>
        </div>
      </div>
    </div>
  );
}