"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardPremium() {
  const [user, setUser] = useState<any>(null)
  const [lista, setLista] = useState<any[]>([])
  const [periodo, setPeriodo] = useState('mes')
  const [metaMensal, setMetaMensal] = useState(10000)
  
  // Estados do Formulário
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('entrada')
  const [metodo, setMetodo] = useState('PIX')
  const [estabelecimento, setEstabelecimento] = useState('Loja de Roupa')
  const [categoria, setCategoria] = useState('Venda')

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) { setUser(data.user); buscarDados() }
    }
    checkUser()
  }, [])

  async function buscarDados() {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  // Lógica de Filtros
  const listaFiltrada = lista.filter(item => {
    const dataItem = new Date(item.created_at)
    const agora = new Date()
    if (periodo === 'hoje') return dataItem.toDateString() === agora.toDateString()
    if (periodo === 'mes') return dataItem.getMonth() === agora.getMonth()
    return true
  })

  // Cálculos Financeiros
  const totalEntradas = listaFiltrada.filter(i => i.tipo === 'entrada').reduce((acc, c) => acc + c.valor, 0)
  const totalSaidas = listaFiltrada.filter(i => i.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
  const progressoMeta = Math.min((totalEntradas / metaMensal) * 100, 100)

  // Dados para Gráfico de Pizza (Formas de Pagamento)
  const dadosPagamento = [
    { name: 'PIX', value: listaFiltrada.filter(i => i.metodo === 'PIX').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Dinheiro', value: listaFiltrada.filter(i => i.metodo === 'Dinheiro').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Cartão', value: listaFiltrada.filter(i => i.metodo === 'Cartão').reduce((acc, c) => acc + c.valor, 0) },
  ].filter(d => d.value > 0)

  async function salvar(e: any) {
    e.preventDefault()
    const { error } = await supabase.from('transacoes').insert([
      { descricao, valor: parseFloat(valor), tipo, estabelecimento, categoria, metodo, user_id: user.id }
    ])
    if (!error) { setDescricao(''); setValor(''); buscarDados() }
  }

  if (!user) return <div className="p-20 text-center font-sans font-bold text-blue-600">Acedendo ao Sistema Seguro...</div>

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-10 font-sans text-gray-800 bg-[#F8FAFC] min-h-screen">
      
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">MultiGestão <span className="text-blue-600">Business</span></h1>
          <p className="text-slate-500 font-medium text-sm">Bem-vindo, {user.email}</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          {['hoje', 'mes', 'todos'].map((t) => (
            <button key={t} onClick={() => setPeriodo(t)} className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${periodo === t ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
          ))}
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Card de Meta (O diferencial de R$ 1000) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Meta de Faturamento (Mês)</h3>
                    <span className="text-blue-600 font-bold text-sm">{progressoMeta.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-6">
                    <div className="bg-blue-600 h-full transition-all duration-1000" style={{ width: `${progressoMeta}%` }}></div>
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-3xl font-black text-slate-900">R$ {totalEntradas.toLocaleString('pt-BR')}</p>
                    <p className="text-slate-400 text-xs font-medium italic">Faltam R$ {(metaMensal - totalEntradas).toLocaleString('pt-BR')} para o objetivo</p>
                </div>
                <button onClick={() => setMetaMensal(Number(prompt("Definir nova meta mensal:", metaMensal)))} className="text-blue-600 text-xs font-bold hover:underline">Ajustar Meta</button>
            </div>
        </div>

        {/* Gráfico de Pizza (Formas de Recebimento) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 min-h-[300px]">
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-4">Meios de Pagamento</h3>
            <div className="h-full">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie data={dadosPagamento} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {dadosPagamento.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Card Alerta (Inteligência) */}
        <div className="bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white flex flex-col justify-between">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl mb-4 text-blue-400">⚡</div>
            <div>
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-1">Status do Negócio</h3>
                <p className="text-sm font-medium leading-relaxed">
                    {totalSaidas > totalEntradas ? "Atenção! As suas saídas superaram as entradas neste período. Reduza a reposição." : "Saúde financeira excelente. O seu saldo está positivo e as metas estão próximas."}
                </p>
            </div>
        </div>
      </div>

      {/* FORMULÁRIO PRO */}
      <form onSubmit={salvar} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10">
        <h2 className="text-lg font-black text-slate-900 mb-6">Novo Lançamento Inteligente</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Onde?</label>
            <select value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all">
              <option>Loja de Roupa</option>
              <option>Depósito de Bebidas</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Categoria</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none">
              <option>Venda</option>
              <option>Reposição</option>
              <option>Marketing</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Pagamento</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none text-blue-600">
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Cartão</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-sm outline-none" placeholder="Ex: Venda Vestido Azul" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Valor R$</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-sm outline-none" placeholder="0.00" />
          </div>
          <button className="bg-blue-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-tighter hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200">Registrar</button>
        </div>
      </form>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="font-black text-slate-900">Histórico de Movimentações</h3>
            <span className="text-xs font-bold text-slate-400 uppercase">{listaFiltrada.length} Registros</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase">
                <tr>
                <th className="p-6">Data</th>
                <th className="p-6">Unidade/Método</th>
                <th className="p-6">Descrição</th>
                <th className="p-6 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {listaFiltrada.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="p-6 text-xs font-bold text-slate-400">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-6">
                        <span className="font-black text-slate-900 text-sm block">{item.estabelecimento}</span>
                        <span className="text-[10px] font-black text-blue-500 uppercase">{item.metodo}</span>
                    </td>
                    <td className="p-6 font-medium text-slate-600 text-sm">{item.descricao}</td>
                    <td className={`p-6 text-right font-black text-lg ${item.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toFixed(2)}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </main>
  )
}