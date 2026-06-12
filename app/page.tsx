import Navbar from '@/components/Navbar'
import Link from 'next/link'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'

async function getStats() {
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${API_URL}/api/overview?api_key=${API_KEY}`, { next: { revalidate: 3600 } }),
      fetch(`${API_URL}/api/stats?api_key=${API_KEY}&days=365`, { next: { revalidate: 3600 } })
    ])
    return { overview: await r1.json(), stats: await r2.json() }
  } catch { return { overview: null, stats: null } }
}

function StatCard({ label, value, sub, color = 'slate' }: { label: string, value: string | number, sub?: string, color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-700',
    red:   'bg-red-50 border-red-200 text-red-700',
    blue:  'bg-blue-50 border-blue-200 text-blue-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">{label}</div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {sub && <div className="text-xs opacity-70">{sub}</div>}
    </div>
  )
}

export default async function Home() {
  const { overview, stats } = await getStats()

  return (
    <main>
      <Navbar />

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Trading trực tiếp
          </div>
          <h1 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
            Giao dịch có <br /><span className="text-slate-400">trách nhiệm</span>
          </h1>
          <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
            Hơn 3 năm kinh nghiệm giao dịch XAUUSD và Forex với triết lý quản lý rủi ro chặt chẽ, tăng trưởng đều đặn và bền vững.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/dashboard" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors">Xem Dashboard</Link>
            <Link href="#contact" className="border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium hover:border-slate-400 transition-colors">Liên hệ tôi</Link>
          </div>
        </div>
      </section>

      {/* PERFORMANCE */}
      {overview && stats && !stats.message && (
        <section id="performance" className="bg-slate-50 border-y border-slate-100 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-10">
              <h2 className="text-2xl font-bold text-slate-900">Kết quả thực tế</h2>
              <span className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full">Cập nhật tự động mỗi giờ</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Win Rate" value={`${stats.win_rate}%`} sub={`${stats.win_deals}W / ${stats.loss_deals}L`} color={stats.win_rate >= 50 ? 'green' : 'red'} />
              <StatCard label="Profit Factor" value={stats.profit_factor} sub="12 tháng gần nhất" color={stats.profit_factor >= 1 ? 'green' : 'red'} />
              <StatCard label="Tổng lệnh" value={stats.total_deals} sub="365 ngày qua" color="blue" />
              <StatCard label="Tổng Equity" value={`$${overview.total_equity?.toLocaleString('en')}`} sub={`${overview.account_count} tài khoản`} color="slate" />
            </div>
            <p className="text-xs text-slate-400 mt-4 text-right">* Dữ liệu thực từ tài khoản Exness · {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
        </section>
      )}

      {/* ABOUT */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Về tôi</h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>Tôi là <strong className="text-slate-900">Dam Quang Loc</strong>, trader độc lập với hơn 3 năm kinh nghiệm giao dịch XAUUSD và các cặp Forex chính.</p>
              <p>Triết lý của tôi: <strong className="text-slate-900">bảo toàn vốn trước, sinh lời sau</strong>. Mỗi lệnh đều có stop loss rõ ràng, không ôm lệnh thua và không báo thù thị trường.</p>
              <p>Hệ thống copy trade hoạt động hoàn toàn tự động, minh bạch với kết quả theo dõi real-time qua dashboard.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '📈', label: 'Kinh nghiệm', value: '3+ năm' },
              { icon: '🥇', label: 'Instrument', value: 'XAUUSD + Forex' },
              { icon: '🛡️', label: 'Triết lý', value: 'Risk management' },
              { icon: '🤖', label: 'Hệ thống', value: 'Auto copy trade' },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{item.label}</div>
                <div className="font-semibold text-slate-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-slate-50 border-y border-slate-100 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">Copy trade hoạt động như thế nào?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Kết nối tài khoản', desc: 'Bạn mở tài khoản MT5 tại Exness và cung cấp thông tin để kết nối vào hệ thống copy trade.' },
              { step: '02', title: 'Tự động copy lệnh', desc: 'Mọi lệnh từ tài khoản Master được sao chép tự động sang tài khoản của bạn theo tỷ lệ tương ứng.' },
              { step: '03', title: 'Theo dõi kết quả', desc: 'Bạn theo dõi equity, lịch sử lệnh và hiệu suất real-time qua dashboard cá nhân.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 border border-slate-100">
                <div className="text-3xl font-bold text-slate-200 mb-3">{item.step}</div>
                <div className="font-semibold text-slate-900 mb-2">{item.title}</div>
                <div className="text-sm text-slate-500 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Liên hệ</h2>
          <p className="text-slate-500 mb-10">Muốn tham gia copy trade hoặc có câu hỏi? Liên hệ trực tiếp qua các kênh bên dưới.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#" className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors">💬 Zalo</a>
            <a href="#" className="flex items-center gap-2 bg-sky-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-sky-600 transition-colors">✈️ Telegram</a>
            <a href="#" className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors">👤 Facebook</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="font-semibold text-slate-900">Dam Quang Loc</span>
          <span className="text-sm text-slate-400">© {new Date().getFullYear()} · damquangloc.com</span>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">Dashboard →</Link>
        </div>
      </footer>
    </main>
  )
}
