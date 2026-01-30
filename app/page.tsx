// @ts-nocheck
"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const THEME = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bg: '#0f172a'
}

export default function DashboardElite() {
  const [user, setUser] = useState(null)
  const [lista, setLista] = useState([])
  const [meta, setMeta] = useState(20000)
  const [lojaAtiva, setLojaAtiva] = useState('Todas')
  
  // Form States
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [metodo, setMetodo] = useState('PIX')
  const [unidade, setUnidade] = useState('Loja de Roupa')

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) { setUser(data.user); buscar(); }
    }
    init()
  }, [])

  const buscar = async () => {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  const salvar = async (e) => {
    e.preventDefault()
    if (!valor || !desc) return
    const { error } = await supabase.from('transacoes').insert([{
      descricao: desc, valor: parseFloat(valor), tipo: 'entrada', estabelecimento: unidade, metodo, user_id: user.id
    }])
    if (!error) { setDesc(''); setValor(''); buscar(); }
  }

  // Lógica de Inteligência de Dados
  const filtrados = lojaAtiva === 'Todas' ? lista : lista.filter(i => i.estabelecimento === lojaAtiva)
  const total = filtrados.reduce((acc, i) => acc + i.valor, 0)
  const progressoMeta = Math.min((total / meta) * 100, 100)

  const dadosPizza = [
    { name: 'PIX', value: filtrados.filter(i => i.metodo === 'PIX').reduce((a, b) => a + b.valor, 0) },
    { name: 'Dinheiro', value: filtrados.filter(i => i.metodo === 'Dinheiro').reduce((a, b) => a + b.valor, 0) },
    { name: 'Cartão', value: filtrados.filter(i => i.metodo === 'Cartão').reduce((a, b) => a + b.valor, 0) },
  ].filter(v => v.value > 0)

  const gerarPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(20); doc.text("Relatório Executivo de Vendas", 14, 20)
    autoTable(doc, { 
      head: [['Data', 'Unidade', 'Método', 'Descrição', 'Valor']], 
      body: filtrados.map(i => [new Date(i.created_at).toLocaleDateString(), i.estabelecimento, i.metodo, i.descricao, `R$ ${i.valor.toFixed(2)}`]),
      theme: 'striped', headStyles: { fillColor: [59, 130, 246] }
    })
    doc.save(`relatorio_${lojaAtiva}.pdf`)
  }

  if (!user) return <div className="h-screen flex items-center justify-center bg-[#0f172a] text-blue-500 font-bold">AUTENTICANDO SISTEMA ELITE...</div>

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER EXECUTIVO */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">SISTEMA <span className="text-blue-500">PRO</span></h1>
            <p className="text-slate-500 text-sm font-medium">Gestão de Fluxo de Caixa Centralizada</p>
          </div>
          
          <div className="flex bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700">
            {['Todas', 'Loja de Roupa', 'Depósito de Bebidas'].map((l) => (
              <button key={l} onClick={() => setLojaAtiva(l)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${lojaAtiva === l ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>{l}</button>
            ))}
          </div>
        </header>

        {/* DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* CARD DE META - O CÉREBRO DO NEGÓCIO */}
          <div className="lg:col-span-2 bg-slate-800/40 p-8 rounded-[2rem] border border-slate-700/50 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Faturamento {lojaAtiva}</p>
                <h2 className="text-5xl font-black text-white italic">R$ {total.toLocaleString('pt-BR')}</h2>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Meta Mensal</p>
                <input type="number" value={meta} onChange={(e) => setMeta(Number(e.target.value))} className="bg-transparent text-xl font-bold text-blue-400 text-right outline-none w-32" />
              </div>
            </div>
            <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden flex p-1">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ width: `${progressoMeta}%` }}></div>
            </div>
            <p className="text-[10px] mt-4 font-bold text-slate-400">{progressoMeta.toFixed(1)}% da meta atingida</p>
          </div>

          {/* MEIOS DE PAGAMENTO */}
          <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-slate-700/50 flex flex-col items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase mb-4 self-start">Distribuição de Receita</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dadosPizza} innerRadius={55} outerRadius={75} dataKey="value" stroke="none" paddingAngle={5}>
                    <Cell fill={THEME.primary} />
                    <Cell fill={THEME.success} />
                    <Cell fill={THEME.warning} />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2">
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[9px] font-bold">PIX</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-[9px] font-bold">DIN</span></div>
               <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-[9px] font-bold">CART</span></div>
            </div>
          </div>
        </div>

        {/* OPERAÇÃO E HISTÓRICO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FORMULÁRIO DE LANÇAMENTO */}
          <form onSubmit={salvar} className="bg-white p-8 rounded-[2rem] text-slate-900 h-fit">
            <h3 className="font-black text-lg mb-6 tracking-tighter">Registrar Venda</h3>
            <div className="space-y-4">
              <select value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-sm outline-none">
                <option>Loja de Roupa</option>
                <option>Depósito de Bebidas</option>
              </select>
              <select value={metodo} onChange={e => setMetodo(e.target.value)} className="w-full p-4 bg-blue-50 text-blue-600 rounded-2xl font-bold text-sm outline-none">
                <option>PIX</option>
                <option>Dinheiro</option>
                <option>Cartão</option>
              </select>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição da Venda" className="w-full p-4 bg-slate-100 rounded-2xl text-sm outline-none" />
              <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor R$" className="w-full p-4 bg-slate-100 rounded-2xl font-black text-xl outline-none" />
              <button className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Lançar Receita</button>
              <button type="button" onClick={gerarPDF} className="w-full text-slate-400 font-bold text-[10px] uppercase hover:text-slate-600 transition">Baixar Relatório em PDF</button>
            </div>
          </form>

          {/* LISTA DE TRANSAÇÕES EXECUTIVA */}
          <div className="lg:col-span-2 bg-slate-800/20 rounded-[2rem] border border-slate-700/30 overflow-hidden">
            <div className="p-8 border-b border-slate-700/30 flex justify-between items-center">
              <h3 className="font-black text-white">Fluxo Detalhado</h3>
              <span className="text-[10px] bg-slate-700 px-3 py-1 rounded-full font-bold">{filtrados.length} Transações</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <tr>
                    <th className="p-6">Data</th>
                    <th className="p-6">Unidade</th>
                    <th className="p-6">Descrição</th>
                    <th className="p-6 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filtrados.map(i => (
                    <tr key={i.id} className="hover:bg-slate-700/10 transition-all">
                      <td className="p-6 text-xs text-slate-500 font-medium">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="p-6">
                        <span className="font-bold text-white text-xs block">{i.estabelecimento}</span>
                        <span className="text-[9px] text-blue-400 font-black uppercase italic">{i.metodo}</span>
                      </td>
                      <td className="p-6 text-sm text-slate-400">{i.descricao}</td>
                      <td className="p-6 text-right font-black text-blue-500 text-lg">R$ {i.valor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}