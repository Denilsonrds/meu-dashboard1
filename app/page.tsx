// @ts-nocheck
"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Sistema() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [lista, setLista] = useState([])
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) { setUser(data.user); buscar(); }
    }
    check()
  }, [])

  async function buscar() {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  async function logar(e) {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return alert("Erro: " + error.message)
    setUser(data.user); buscar();
  }

  async function salvar(e) {
    e.preventDefault()
    if (!valor) return alert("Digite um valor")
    const { error } = await supabase.from('transacoes').insert([
      { descricao: desc, valor: parseFloat(valor), user_id: user.id, tipo: 'entrada' }
    ])
    if (error) alert(error.message)
    else { setDesc(''); setValor(''); buscar(); }
  }

  const total = lista.reduce((acc, i) => acc + Number(i.valor), 0)

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <form onSubmit={logar} className="bg-white p-8 rounded-2xl w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Entrar no Sistema</h1>
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 mb-3 border rounded-xl outline-none" />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 mb-6 border rounded-xl outline-none" />
        <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">ENTRAR</button>
      </form>
    </div>
  )

  return (
    <main className="max-w-xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-blue-600 p-8 rounded-3xl text-white shadow-xl mb-6">
        <p className="text-xs font-bold opacity-70 uppercase">Saldo Total</p>
        <h2 className="text-4xl font-black mt-2">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
      </div>

      <form onSubmit={salvar} className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex flex-col gap-3 border">
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" className="p-3 bg-gray-50 rounded-xl outline-none" />
        <div className="flex gap-2">
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor R$" className="flex-1 p-3 bg-gray-50 rounded-xl font-bold outline-none" />
          <button className="bg-black text-white px-6 rounded-xl font-bold">VENDER</button>
        </div>
      </form>

      <div className="space-y-3">
        {lista.map(i => (
          <div key={i.id} className="bg-white p-4 rounded-xl border flex justify-between items-center">
            <span className="text-sm font-medium">{i.descricao || 'Venda'}</span>
            <span className="font-bold text-blue-600">R$ {Number(i.valor).toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="w-full mt-10 text-gray-400 text-xs font-bold">SAIR</button>
    </main>
  )
}