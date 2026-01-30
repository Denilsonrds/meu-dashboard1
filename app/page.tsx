"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// CONFIGURAÇÃO DO BANCO DE DADOS
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
      if (data.user) {
        setUser(data.user)
        buscarDados()
      }
    }
    checkUser()
  }, [])

  async function buscarDados() {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  // Lógica de Filtros de Tempo
  const listaFiltrada = lista.filter(item => {
    const dataItem = new Date(item.created_at)
    const agora = new Date()
    if (periodo === 'hoje') return dataItem.toDateString() === agora.toDateString()
    if (periodo === 'mes') return dataItem.getMonth() === agora.getMonth() && dataItem.getFullYear() === agora.getFullYear()
    return true
  })

  // Cálculos Financeiros
  const totalEntradas = listaFiltrada.filter(i => i.tipo === 'entrada').reduce((acc, c) => acc + c.valor, 0)
  const totalSaidas = listaFiltrada.filter(i => i.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
  const saldo = totalEntradas - totalSaidas
  const progressoMeta = Math.min((totalEntradas / metaMensal) * 100, 100)

  // Dados para Gráfico de Pizza (Formas de Pagamento)
  const dadosPagamento = [
    { name: 'PIX', value: listaFiltrada.filter(i => i.metodo === 'PIX').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Dinheiro', value: listaFiltrada.filter(i => i.metodo === 'Dinheiro').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Cartão', value: listaFiltrada.filter(i => i.metodo === 'Cartão').reduce((acc, c) => acc + c.valor, 0) },
  ].filter(d => d.value > 0)

  async function salvar(e: any) {
    e.preventDefault()
    if (!descricao || !valor) return alert("Preencha todos os campos!")
    
    const { error } = await supabase.from('transacoes').insert([
      { 
        descricao, 
        valor: parseFloat(valor), 
        tipo, 
        estabelecimento, 
        categoria, 
        metodo, 
        user_id: user.id 
      }
    ])
    
    if (!error) { 
      setDescricao('')
      setValor('')
      buscarDados() 
    }
  }

  // FUNÇÃO PARA GERAR PDF PROFISSIONAL
  const gerarPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Relatório MultiGestão PRO`, 14, 20)
    doc.setFontSize(10)
    doc.text(`Período: ${periodo.toUpperCase()} | Saldo: R$ ${saldo.toFixed(2)}`, 14, 30)

    const tableRows = listaFiltrada.map(item => [
      new Date(item.created_at).toLocaleDateString('pt-BR'),
      item.estabelecimento,
      item.metodo,
      item.descricao,
      `R$ ${item.valor.toFixed(2)}`
    ])

    autoTable(doc, {
      head: [['Data', 'Loja', 'Pagamento', 'Descrição', 'Valor']],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    })

    doc.save(`relatorio_${periodo}.pdf`)
  }

  if (!user) return <div className="p-20 text-center font-sans font-bold text-blue-600 animate-pulse">Carregando Sistema de Gestão...</div>

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-10 font-sans text-gray-800 bg-[#F8FAFC] min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">MultiGestão <span className="text-blue-600 italic">Business</span></h1>
          <p className="text-slate-500 font-medium text-sm">Operador: {user.email}</p>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
            {['hoje', 'mes', 'todos'].map((t) => (
                <button key={t} onClick={() => setPeriodo(t)} className={`px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${periodo === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
            ))}
            </div>
            <button onClick={gerarPDF} className="bg-slate-900 text-white p-3 rounded-xl hover:scale-105 transition-all shadow-lg">
                <span className="text-xs font-bold uppercase">Exportar PDF</span>
            </button>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Card de Meta Mensal */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Meta de Faturamento</h3>
                    <span className="text-blue-600 font-black text-sm">{progressoMeta.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 h-5 rounded-full overflow-hidden mb-6 p-1">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-700 h-full rounded-full transition-all duration-1000" style={{ width: `${progressoMeta}%` }}></div>
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-3xl font-black text-slate-900">R$ {totalEntradas.toLocaleString('pt-BR')}</p>
                    <p className="text-slate-400 text-xs font-medium italic">Faltam R$ {Math.max(0, metaMensal - totalEntradas).toLocaleString('pt-BR')} para bater a meta</p>
                </div>
                <button 
                  onClick={() => {
                    const m = prompt("Definir nova meta mensal (apenas números):", metaMensal.toString());
                    if (m) setMetaMensal(parseFloat(m));
                  }} 
                  className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-colors"
                >
                  AJUSTAR META
                </button>
            </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 min-h-[300px]">
            <h3 className="text-slate-400 text-[10px] font-black uppercase mb-4 text-center">Meios de Pagamento</h3>
            <div className="h-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie data={dadosPagamento} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                            {dadosPagamento.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: 'bold'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Resumo de Saldo */}
        <div className={`p-8 rounded-[2rem] shadow-xl text-white flex flex-col justify-between ${saldo >= 0 ? 'bg-slate-900' : 'bg-red-900'}`}>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl mb-4">
              {saldo >= 0 ? '💰' : '⚠️'}
            </div>
            <div>
                <h3 className="text-[10px] font-black uppercase text-white/50 mb-1 tracking-widest">Saldo Líquido</h3>
                <p className="text-2xl font-black">R$ {saldo.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] mt-3 font-medium text-white/40 italic">
                  {saldo >= 0 ? "Operação operando no azul. Lucro garantido." : "Atenção! Você está operando no prejuízo."}
                </p>
            </div>
        </div>
      </div>

      {/* FORMULÁRIO DE REGISTRO */}
      <form onSubmit={salvar} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-10">
        <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span> 
          Lançamento de Caixa
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Unidade</label>
            <select value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>Loja de Roupa</option>
              <option>Depósito de Bebidas</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Categoria</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none">
              <option>Venda</option>
              <option>Reposição</option>
              <option>Marketing</option>
              <option>Aluguel/Luz</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Método</label>
            <select value={metodo} onChange={e => setMetodo(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-sm outline-none text-blue-600">
              <option>PIX</option>
              <option>Dinheiro</option>
              <option>Cartão</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-medium text-sm outline-none" placeholder="Ex: Cerveja Gelada" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Valor R$</label>
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-sm outline-none" placeholder="0.00" />
          </div>
          <button className="bg-slate-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">Registrar</button>
        </div>
      </form>

      {/* TABELA DE HISTÓRICO */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">Fluxo de Caixa Detalhado</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                <th className="p-6">Data</th>
                <th className="p-6">Estabelecimento / Pagamento</th>
                <th className="p-6">Descrição</th>
                <th className="p-6 text-right">Valor Final</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {listaFiltrada.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="p-6 text-xs font-bold text-slate-400">{new Date(item.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="p-6">
                        <span className="font-black text-slate-900 text-sm block">{item.estabelecimento}</span>
                        <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md uppercase">{item.metodo}</span>
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