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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];

export default function SistemaGestao() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [lista, setLista] = useState([])
  const [valor, setValor] = useState('')
  const [desc, setDesc] = useState('')
  const [unidade, setUnidade] = useState('Loja de Roupa')
  const [metodo, setMetodo] = useState('PIX')

  // MONITORAR LOGIN
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user) {
        setUser(data.user)
        buscarDados()
      }
    }
    checkUser()
  }, [])

  // FUNÇÕES DE ACESSO
  async function logar(e) {
    e.preventDefault()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return alert("Erro no login: " + error.message)
    setUser(data.user)
    buscarDados()
  }

  async function sair() {
    await supabase.auth.signOut()
    setUser(null)
  }

  // FUNÇÕES DO SISTEMA
  async function buscarDados() {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!valor || !desc) return alert("Preencha Valor e Descrição")
    
    const { error } = await supabase.from('transacoes').insert([{
      descricao: desc, valor: parseFloat(valor), tipo: 'entrada', estabelecimento: unidade, metodo, user_id: user.id
    }])

    if (error) alert("Erro ao salvar: " + error.message)
    else { setDesc(''); setValor(''); buscarDados(); }
  }

  // MATEMÁTICA
  const totalGeral = lista.reduce((acc, i) => acc + Number(i.valor), 0)
  const dadosGrafico = [
    { name: 'PIX', value: lista.filter(i => i.metodo === 'PIX').reduce((a, b) => a + Number(b.valor), 0) },
    { name: 'Dinheiro', value: lista.filter(i => i.metodo === 'Dinheiro').reduce((a, b) => a + Number(b.valor), 0) },
    { name: 'Cartão', value: lista.filter(i => i.metodo === 'Cartão').reduce((a, b) => a + Number(b.valor), 0) },
  ].filter(d => d.value > 0)

  const gerarPDF = () => {
    const doc = new jsPDF()
    doc.text("RELATORIO DE VENDAS PROFISSIONAL", 14, 20)
    autoTable(doc, {
      head: [['Data', 'Loja', 'Metodo', 'Desc', 'Valor']],
      body: lista.map(i => [new Date(i.created_at).toLocaleDateString(), i.estabelecimento, i.metodo, i.descricao, `R$ ${i.valor.toFixed(2)}`])
    })
    doc.save("financeiro.pdf")
  }

  // TELA DE LOGIN (O QUE VOCÊ QUERIA)
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
        <form onSubmit={logar} className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 w-full max-w-sm">
          <h1 className="text-white text-2xl font-black mb-2 tracking-tighter">MEU SISTEMA <span className="text-blue-500 italic text-sm">PRO</span></h1>
          <p className="text-slate-500 text-xs font-bold mb-8 uppercase tracking-widest">Acesse sua conta</p>
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-slate-800 rounded-2xl text-white outline-none border border-transparent focus:border-blue-500" />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-800 rounded-2xl text-white outline-none border border-transparent focus:border-blue-500" />
            <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition">Entrar no Painel</button>
          </div>
        </form>
      </div>
    )
  }

  // DASHBOARD
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <nav className="bg-white border-b p-6 flex justify-between items-center">
        <h2 className="font-black text-xl tracking-tighter">SISTEMA <span className="text-blue-600 italic">ELITE</span></h2>
        <div className="flex gap-4 items-center">
            <span className="text-[10px] font-bold text-slate-400">{user.email}</span>
            <button onClick={sair} className="text-[10px] font-black bg-red-50 text-red-500 px-4 py-2 rounded-xl">SAIR</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col justify-between">
            <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Faturamento Total</p>
            <h3 className="text-5xl font-black text-emerald-400 my-4">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            <button onClick={gerarPDF} className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-6 py-3 rounded-full w-fit transition">GERAR RELATÓRIO PDF</button>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border flex flex-col items-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 self-start">Meios de Recebimento</p>
             <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dadosGrafico} innerRadius={40} outerRadius={60} dataKey="value" stroke="none">
                            {dadosGrafico.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <form onSubmit={salvar} className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-sm border space-y-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Novo Registro</p>
            <select value={unidade} onChange={e => setUnidade(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none">
                <option>Loja de Roupa</option>
                <option>Depósito de Bebidas</option>
            </select>
            <select value={metodo} onChange={e => setMetodo(e.target.value)} className="w-full p-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs outline-none">
                <option>PIX</option>
                <option>Dinheiro</option>
                <option>Cartão</option>
            </select>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="O que vendeu?" className="w-full p-3 bg-slate-50 rounded-xl text-xs outline-none" />
            <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="R$ 0,00" className="w-full p-3 bg-slate-50 rounded-xl font-black text-lg outline-none" />
            <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-200">Lançar Venda</button>
          </form>

          <div className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <tr>
                        <th className="p-6">Unidade / Método</th>
                        <th className="p-6">Descrição</th>
                        <th className="p-6 text-right">Valor Bruto</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {lista.map(i => (
                        <tr key={i.id} className="hover:bg-slate-50 transition">
                            <td className="p-6">
                                <span className="font-bold text-slate-900 text-xs block">{i.estabelecimento}</span>
                                <span className="text-[9px] font-black text-blue-500 uppercase">{i.metodo}</span>
                            </td>
                            <td className="p-6 text-xs text-slate-500 font-medium">{i.descricao}</td>
                            <td className="p-6 text-right font-black text-emerald-600 text-sm">R$ {i.valor.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}