// @ts-nocheck
"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardFinal() {
  const [user, setUser] = useState(null)
  const [lista, setLista] = useState([])
  const [meta, setMeta] = useState(5000)
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [metodo, setMetodo] = useState('PIX')
  const [loja, setLoja] = useState('Loja de Roupa')

  useEffect(() => {
    const carregar = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) { setUser(data.user); buscar() }
    }
    carregar()
  }, [])

  const buscar = async () => {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!valor || !desc) return alert("Preencha os campos!")
    await supabase.from('transacoes').insert([{ 
      descricao: desc, valor: parseFloat(valor), tipo: 'entrada', estabelecimento: loja, metodo, user_id: user.id 
    }])
    setDesc(''); setValor(''); buscar()
  }

  const entradas = lista.reduce((acc, i) => acc + i.valor, 0)
  const dadosPizza = [
    { name: 'PIX', value: lista.filter(i => i.metodo === 'PIX').reduce((a, b) => a + b.valor, 0) },
    { name: 'Dinheiro', value: lista.filter(i => i.metodo === 'Dinheiro').reduce((a, b) => a + b.valor, 0) },
    { name: 'Cartão', value: lista.filter(i => i.metodo === 'Cartão').reduce((a, b) => a + b.valor, 0) },
  ].filter(v => v.value > 0)

  if (!user) return <div className="p-20 text-center font-sans text-slate-400">Carregando...</div>

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-12 font-sans bg-white min-h-screen text-slate-800">
      
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-16">
        <h1 className="text-lg font-bold tracking-tighter text-slate-900 uppercase">Sistema de Caixa</h1>
        <button onClick={() => {
          const doc = new jsPDF()
          autoTable(doc, { head: [['Loja', 'Metodo', 'Valor']], body: lista.map(i => [i.estabelecimento, i.metodo, i.valor]) })
          doc.save("caixa.pdf")
        }} className="text-[10px] font-bold bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition">PDF</button>
      </div>

      {/* RESUMO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20 items-center">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vendas Totais</p>
          <p className="text-3xl font-light text-slate-900 font-mono">R$ {entradas.toLocaleString('pt-BR')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Definir Meta</p>
          <input type="number" value={meta} onChange={e => setMeta(e.target.value)} className="text-3xl font-light w-full outline-none focus:text-blue-600 bg-transparent font-mono" />
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={dadosPizza} innerRadius={30} outerRadius={40} dataKey="value" stroke="none">
                {['#2563eb', '#10b981', '#f59e0b'].map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FORMULÁRIO DISCRETO */}
      <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20 p-8 border border-slate-100 rounded-3xl shadow-sm">
        <select value={loja} onChange={e => setLoja(e.target.value)} className="bg-transparent text-xs font-bold outline-none border-b pb-2 cursor-pointer">
          <option>Loja de Roupa</option>
          <option>Depósito de Bebidas</option>
        </select>
        <select value={metodo} onChange={e => setMetodo(e.target.value)} className="bg-transparent text-xs font-bold outline-none border-b pb-2 text-blue-600 cursor-pointer">
          <option>PIX</option>
          <option>Dinheiro</option>
          <option>Cartão</option>
        </select>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição" className="bg-transparent text-xs outline-none border-b pb-2" />
        <div className="flex gap-4">
          <input value={valor} onChange={e => setValor(e.target.value)} placeholder="R$" type="number" className="bg-transparent text-xs font-bold outline-none border-b pb-2 w-full" />
          <button className="bg-blue-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg shadow-lg shadow-blue-100">OK</button>
        </div>
      </form>

      {/* LISTA */}
      <div className="space-y-6">
        <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-8">Histórico Recente</h3>
        {lista.map(i => (
          <div key={i.id} className="flex justify-between items-center group">
            <div className="flex gap-4 items-center">
              <div className={`w-1 h-8 rounded-full ${i.metodo === 'PIX' ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tighter">{i.estabelecimento}</p>
                <p className="text-[10px] text-slate-400">{i.descricao} • {i.metodo}</p>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-900 font-mono">R$ {i.valor.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </main>
  )
}