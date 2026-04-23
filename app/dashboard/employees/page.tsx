'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Shield, Loader2, MapPin, KeyRound, AlertTriangle } from 'lucide-react'
import { SYSTEM_ROLES, type SystemRole } from '@/lib/constants'

type Branch = {
  _id: string
  name: string
}

type User = {
  id: string
  name: string
  username: string
  role: SystemRole
  branchId?: string
  branchName?: string
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [modal, setModal] = useState(false)
  
  const [form, setForm] = useState({ id: '', name: '', username: '', password: '', role: 'Cashier' as SystemRole, branchId: '' })
  const [currentUser, setCurrentUser] = useState<{role: string} | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [uRes, bRes, meRes] = await Promise.all([ 
        fetch('/api/users'), 
        fetch('/api/branches'),
        fetch('/api/auth/me') 
      ])
      const uData = await uRes.json()
      const bData = await bRes.json()
      const meData = await meRes.json()
      
      if (meData?.user) {
        setCurrentUser(meData.user)
        const role = meData.user.role
        if (role !== 'Admin' && role !== 'SuperAdmin') {
          setAccessDenied(true)
          return
        }
      }
      setUsers(uData.users || [])
      setBranches(bData.branches || [])
    } catch {
      showToast('خطأ في تحميل البيانات', 'err')
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg: string, type: 'ok'|'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function openEdit(u: User) {
    setForm({ id: u.id, name: u.name, username: u.username, password: '', role: u.role, branchId: u.branchId || '' })
    setModal(true)
  }

  function openNew() {
    setForm({ id: '', name: '', username: '', password: '', role: 'Cashier', branchId: '' })
    setModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.username || (!form.id && !form.password)) {
      showToast('يرجى ملء كافة الحقول الإلزامية', 'err')
      return
    }

    setSubmitting(true)
    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'فشل حفظ البيانات')
      
      showToast(form.id ? 'تم تحديث الموظف بنجاح' : 'تم إضافة الموظف بنجاح', 'ok')
      setModal(false)
      fetchAll()
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟')) return
    try {
      const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      showToast('تم حذف الموظف بنجاح', 'ok')
      fetchAll()
    } catch {
      showToast('فشل الحذف', 'err')
    }
  }

  /* ── UI Elements ── */
  const inpProps = { style: {
    width: '100%', padding: '0.8rem 1rem', borderRadius: 12, border: '1px solid #E2E8F0', background: '#0a0a0a', color: '#0F172A', outline: 'none', fontFamily: 'inherit', marginTop: '0.35rem'
  }}
  const lblStyle = { fontSize: '0.8rem', fontWeight: 600, color: '#475569' }

  if (accessDenied) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#475569', textAlign: 'center' }}>
        <Shield size={48} color="#EF4444" style={{ opacity: 0.6 }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444' }}>وصول مرفوض</h2>
        <p style={{ fontSize: '0.9rem', maxWidth: 340, lineHeight: 1.7 }}>ليس لديك صلاحية الوصول إلى هذه الصفحة. هذه الصفحة مخصصة للمدراء والمشرفين فقط.</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.2em', color: '#0ea5e9', textTransform: 'uppercase', marginBottom: '0.3rem' }}>الإدارة والأمان</p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0F172A' }}>صلاحيات الموظفين</h1>
        </div>
        <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0ea5e9', color: '#0F172A', border: 'none', padding: '0.75rem 1.4rem', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
          <Plus size={18} />
          إضافة موظف جديد
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '0.75rem' }}>
           <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ background: '#111111', borderRadius: 16, border: '1px solid #F1F5F9', overflow: 'hidden' }}>
          {users.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>لا توجد موظفين حتى الآن.</div>
          ) : (
            <table style={{ width: '100%', textAlign: 'right', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #F1F5F9' }}>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>الاسم بالكامل</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>إسم الدخول</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>الصلاحية</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600 }}>تعيين فرع</th>
                  <th style={{ padding: '1rem 1.5rem', color: '#475569', fontWeight: 600, width: 120 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', ...({ ':hover': { background: '#F8FAFC' } } as any) }}>
                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 600, color: '#0F172A' }}>{u.name}</td>
                    <td style={{ padding: '1.25rem 1.5rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>@{u.username}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                       <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.8rem', borderRadius: 50, fontSize: '0.75rem', fontWeight: 700, 
                          background: u.role === 'SuperAdmin' || u.role === 'Admin' ? 'rgba(239,68,68,0.1)' : u.role === 'Manager' ? 'rgba(14,165,233,0.1)' : 'rgba(34,197,94,0.1)',
                          color: u.role === 'SuperAdmin' || u.role === 'Admin' ? '#ef4444' : u.role === 'Manager' ? '#0ea5e9' : '#22c55e'
                       }}>
                         <Shield size={12} />
                         {SYSTEM_ROLES[u.role] || u.role}
                       </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                       {u.role === 'Cashier' ? (
                         <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#475569', fontSize: '0.8rem' }}>
                           <MapPin size={14} color="#f59e0b" />
                           {u.branchName}
                         </span>
                       ) : (
                         <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>عالمي (Global Access)</span>
                       )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <button onClick={() => openEdit(u)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', color: '#0F172A' }}><Edit2 size={16} /></button>
                         <button onClick={() => handleDelete(u.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <form style={{ background: '#111', border: '1px solid #E2E8F0', width: '100%', maxWidth: 480, borderRadius: 20, padding: '2rem' }} onSubmit={handleSave}>
             <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
               <Shield size={20} color="#0ea5e9" />
               {form.id ? 'تعديل بيانات الموظف' : 'تسجيل موظف جديد'}
             </h2>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={lblStyle}>الاسم بالكامل</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} {...inpProps} />
                </div>
                
                <div>
                  <label style={lblStyle}>إسم الدخول (Username)</label>
                  <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} style={{...inpProps.style, direction: 'ltr'}} />
                </div>

                <div>
                  <label style={lblStyle}>
                    كلمة المرور 
                    {form.id && <span style={{ color: '#f59e0b', fontSize: '0.7rem', marginRight: '0.5rem' }}>(اتركه فارغاً إذا لم ترغب بتغييره)</span>}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)' }} />
                    <input type="password" required={!form.id} value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{...inpProps.style, direction: 'ltr', paddingLeft: '2.5rem'}} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={lblStyle}>صلاحية النظام</label>
                    <select value={form.role} onChange={e => setForm({...form, role: e.target.value as any, branchId: e.target.value !== 'Cashier' ? '' : form.branchId})} {...inpProps}>
                       {Object.entries(SYSTEM_ROLES).map(([key, label]) => {
                         if (key === 'SuperAdmin' && currentUser?.role !== 'SuperAdmin') return null;
                         return <option key={key} value={key}>{label} ({key})</option>
                       })}
                    </select>
                  </div>
                  
                  {form.role === 'Cashier' && (
                    <div style={{ flex: 1 }}>
                      <label style={lblStyle}>الفرع التابع له</label>
                      <select required={form.role === 'Cashier'} value={form.branchId} onChange={e => setForm({...form, branchId: e.target.value})} style={{...inpProps.style, borderColor: '#f59e0b'}}>
                        <option value="">-- إختر الفرع --</option>
                        {branches.map(b => (
                          <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {form.role === 'Admin' && (
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '1rem', borderRadius: 12, marginTop: '0.5rem' }}>
                     <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                     <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.5 }}>هذا الدور يمنح صلاحيات كاملة وحساسة على التقارير، حذف المنتجات، وتعديل إعدادات الخزنة. استخدمه بحذر.</p>
                   </div>
                )}
             </div>

             <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid #E2E8F0', color: '#0F172A', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>إلغاء</button>
                <button type="submit" disabled={submitting} style={{ flex: 1, padding: '0.8rem', background: '#0ea5e9', border: 'none', color: '#0F172A', borderRadius: 12, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                   {submitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'حفظ الصلاحيات'}
                </button>
             </div>
          </form>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toast.type === 'ok' ? '#22c55e' : '#ef4444', color: '#0F172A', padding: '1rem 1.5rem', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', zIndex: 9999, animation: 'float-in 0.3s ease-out forwards' }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
