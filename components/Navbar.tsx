'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-slate-900 text-lg">Dam Quang Loc</Link>
        <div className="hidden md:flex items-center gap-8">
          <Link href="#about" className="text-sm text-slate-600 hover:text-slate-900">Về tôi</Link>
          <Link href="#performance" className="text-sm text-slate-600 hover:text-slate-900">Performance</Link>
          <Link href="#contact" className="text-sm text-slate-600 hover:text-slate-900">Liên hệ</Link>
          <Link href="/dashboard" className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700">Dashboard</Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          <div className="w-5 h-0.5 bg-slate-700 mb-1"></div>
          <div className="w-5 h-0.5 bg-slate-700 mb-1"></div>
          <div className="w-5 h-0.5 bg-slate-700"></div>
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 flex flex-col gap-4">
          <Link href="#about" className="text-sm text-slate-600" onClick={() => setOpen(false)}>Về tôi</Link>
          <Link href="#performance" className="text-sm text-slate-600" onClick={() => setOpen(false)}>Performance</Link>
          <Link href="#contact" className="text-sm text-slate-600" onClick={() => setOpen(false)}>Liên hệ</Link>
          <Link href="/dashboard" className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg text-center" onClick={() => setOpen(false)}>Dashboard</Link>
        </div>
      )}
    </nav>
  )
}
