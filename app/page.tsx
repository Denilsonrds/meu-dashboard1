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
  const [user, setUser] = useState<any>(null)
  const [lista, setLista] = useState<any[]>([])
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

  async function salvar(e: any) {
    e.preventDefault()
    await supabase.from('transacoes').insert([{ descricao, valor: parseFloat(valor), tipo, estabelecimento, categoria, metodo, user_id: user.id }])
    setDescricao(''); setValor(''); buscarDados()
  }

  const gerarPDF = () => {
    const doc = new jsPDF(); doc.text("Relatorio de Caixa", 14, 20)
    autoTable(doc, { head: [['Data', 'Loja', 'Valor']], body: listaFiltrada.map(i => [new Date(i.created_at).toLocaleDateString(), i.estabelecimento, i.valor]) })
    doc.save("relatorio.pdf")
  }

  if (!user) return <div className="p-20 text-center font-bold">Carregando...</div>

  return (
    <main className="max-w-6xl mx-auto p-6 font-sans bg-slate-50 min-h-screen text-slate-900">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black text-blue-600">MEU CAIXA <span className="text-slate-400">PRO</span></h1>
        <div className="flex gap-2">
            <button onClick={() => setPeriodo('hoje')} className={`px-4 py-2 rounded-lg text-xs font-bold ${periodo === 'hoje' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>HOJE</button>
            <button onClick={() => setPeriodo('mes')} className={`px-4 py-2 rounded-lg text-xs font-bold ${periodo === 'mes' ? 'bg-blue-600 text-white' : 'bg-white border'}`}>MÊS</button>
            <button onClick={gerarPDF} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold">PDF</button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Meta Mensal (R$)</p>
            <input type="number" value={metaMensal} onChange={(e) => setMetaMensal(Number(e.target.value))} className="text-2xl font-black w-full outline-none focus:text-blue-600" />
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4"><div className="bg-blue-600 h-full rounded-full" style={{width: `${progressoMeta}%`}}></div></div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Entradas</p>
            <p className="text-2xl font-black text-emerald-500">R$ {entradas.toLocaleString('pt-BR')}</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl shadow-lg text-white">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 text-white/50">Saldo Atual</p>
            <p className="text-2xl font-black">R$ {(entradas - saidas).toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* GRAFICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h3 className="text-xs font-bold mb-6 text-slate-400 uppercase">Meios de Pagamento</h3>
            <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dadosPagamento} innerRadius={40} outerRadius={60} dataKey="value">
                            {dadosPagamento.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
        <form onSubmit={salvar} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase">Novo Registro</h3>
            <div className="grid grid-cols-2 gap-2">
                <select value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
                    <option>Loja de Roupa</option>
                    <option>Depósito de Bebidas</option>
                </select>
                <select value={metodo} onChange={e => setMetodo(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none text-blue-600">
                    <option>PIX</option>
                    <option>Dinheiro</option>
                    <option>Cartão</option>
                </select>
            </div>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm outline-none" placeholder="Descrição" />
            <div className="flex gap-2">
                <input type="number" value={valor} onChange={e => setValor(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-sm font-bold w-full outline-none" placeholder="Valor R$" />
                <button className="bg-blue-600 text-white px-6 rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-200">Lançar</button>
            </div>
        </form>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                    <th className="p-4">Loja</th>
                    <th className="p-4">Descrição</th>
                    <th className="p-4 text-right">Valor</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {listaFiltrada.map(i => (
                    <tr key={i.id} className="hover:bg-slate-50">
                        <td className="p-4 font-bold">{i.estabelecimento} <span className="block text-[10px] text-blue-500">{i.metodo}</span></td>
                        <td className="p-4 text-slate-500">{i.descricao}</td>
                        <td className={`p-4 text-right font-black ${i.tipo === 'entrada' ? 'text-emerald-500' : 'text-red-500'}`}>R$ {i.valor.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </main>
  )
}