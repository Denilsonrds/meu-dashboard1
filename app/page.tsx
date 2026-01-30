// @ts-nocheck
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

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [lista, setLista] = useState([])
  const [periodo, setPeriodo] = useState('mes')
  const [metaMensal, setMetaMensal] = useState(10000)
  
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

  const listaFiltrada = lista.filter(item => {
    const d = new Date(item.created_at); const agora = new Date()
    if (periodo === 'hoje') return d.toDateString() === agora.toDateString()
    return d.getMonth() === agora.getMonth()
  })

  const entradas = listaFiltrada.filter(i => i.tipo === 'entrada').reduce((acc, c) => acc + c.valor, 0)
  const saidas = listaFiltrada.filter(i => i.tipo === 'saida').reduce((acc, c) => acc + c.valor, 0)
  const progressoMeta = Math.min((entradas / metaMensal) * 100, 100)

  const dadosPagamento = [
    { name: 'PIX', value: listaFiltrada.filter(i => i.metodo === 'PIX').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Dinheiro', value: listaFiltrada.filter(i => i.metodo === 'Dinheiro').reduce((acc, c) => acc + c.valor, 0) },
    { name: 'Cartão', value: listaFiltrada.filter(i => i.metodo === 'Cartão').reduce((acc, c) => acc + c.valor, 0) },
  ].filter(d => d.value > 0)

  async function salvar(e) {
    e.preventDefault()
    await supabase.from('transacoes').insert([{ descricao, valor: parseFloat(valor), tipo, estabelecimento, categoria, metodo, user_id: user.id }])
    setDescricao(''); setValor(''); buscarDados()
  }

  const gerarPDF = () => {
    const doc = new jsPDF(); 
    doc.text("Relatorio de Caixa Profissional", 14, 20)
    autoTable(doc, { 
      head: [['Data', 'Loja', 'Metodo', 'Valor']], 
      body: listaFiltrada.map(i => [new Date(i.created_at).toLocaleDateString(), i.estabelecimento, i.metodo, `R$ ${i.valor.toFixed(2)}`]) 
    })
    doc.save("relatorio.pdf")
  }

  if (!user) return <div className="p-20 text-center font-bold text-blue-600">Iniciando Painel Pro...</div>

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans bg-slate-50 min-h-screen text-slate-900">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-blue-600 tracking-tighter">MEU CAIXA <span className="text-slate-400">PRO</span></h1>
        <div className="flex gap-2">
            <button onClick={() => setPeriodo('hoje')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${periodo === 'hoje' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-400'}`}>HOJE</button>
            <button onClick={() => setPeriodo('mes')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${periodo === 'mes' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-400'}`}>ESTE MÊS</button>
            <button onClick={gerarPDF} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-black transition">PDF</button>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Meta Mensal de Vendas</p>
            <input type="number" value={metaMensal} onChange={(e) => setMetaMensal(Number(e.target.value))} className="text-3xl font-black w-full outline-none text-slate-900 focus:text-blue-600" />
            <div className="w-full bg-slate-100 h-3 rounded-full mt-4 overflow-hidden"><div className="bg-blue-600 h-full transition-all" style={{width: `${progressoMeta}%`}}></div></div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col justify-center">
            <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">Entradas no Período</p>
            <p className="text-3xl font-black text-slate-900">R$ {entradas.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-blue-600 p-6 rounded-[2rem] shadow-xl text-white flex flex-col justify-center">
            <p className="text-[10px] font-black text-blue-200 uppercase mb-1">Saldo em Caixa</p>
            <p className="text-3xl font-black">R$ {(entradas - saidas).toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* ÁREA TÉCNICA: GRÁFICO E FORMULÁRIO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
            <h3 className="text-[10px] font-black mb-6 text-slate-400 uppercase tracking-widest">Meios de Pagamento</h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dadosPagamento} innerRadius={50} outerRadius={70} dataKey="value" stroke="none">
                            {dadosPagamento.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '15px', border: 'none', fontWeight: 'bold'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <form onSubmit={salvar} className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Novo Lançamento</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 ml-1">UNIDADE</label>
                    <select value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-blue-200">
                        <option>Loja de Roupa</option>
                        <option>Depósito de Bebidas</option>
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 ml-1">FORMA</label>
                    <select value={metodo} onChange={e => setMetodo(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none text-blue-600 border border-transparent focus:border-blue-200">
                        <option>PIX</option>
                        <option>Dinheiro</option>
                        <option>Cartão</option>
                    </select>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 ml-1">DESCRIÇÃO</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-xs font-medium outline-none border border-transparent focus:border-blue-200" placeholder="Ex: Venda Camiseta G" />
            </div>
            <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-400 ml-1">VALOR (R$)</label>
                    <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-black w-full outline-none" placeholder="0.00" />
                </div>
                <button className="bg-blue-600 text-white px-8 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-200 hover:scale-105 transition mt-5">REGISTRAR</button>
            </div>
        </form>
      </div>

      {/* LISTAGEM */}
      <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <tr>
                    <th className="p-6">Unidade / Método</th>
                    <th className="p-6">Descrição</th>
                    <th className="p-6 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {listaFiltrada.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-6">
                            <span className="font-black text-slate-900 text-xs block">{i.estabelecimento}</span>
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">{i.metodo}</span>
                        </td>
                        <td className="p-6 text-slate-500 text-xs font-medium">{i.descricao}</td>
                        <td className={`p-6 text-right font-black text-base ${i.tipo === 'entrada' ? 'text-emerald-500' : 'text-rose-500'}`}>R$ {i.valor.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </main>
  )
}