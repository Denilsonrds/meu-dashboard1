"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [lista, setLista] = useState<any[]>([])
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState('entrada')

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

  async function salvar(e: any) {
    e.preventDefault()
    if (!descricao || !valor) return alert("Preencha todos os campos!")
    
    const { error } = await supabase.from('transacoes').insert([
      { descricao, valor: parseFloat(valor), tipo, user_id: user.id }
    ])
    
    if (!error) { 
      setDescricao('')
      setValor('')
      buscarDados() 
    }
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('transacoes').delete().eq('id', id)
    if (!error) buscarDados()
  }

  // Lógica de Cálculos de Saldo
  const entradas = lista.filter(i => i.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0)
  const saidas = lista.filter(i => i.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0)
  const saldo = entradas - saidas

  if (!user) return <div className="p-20 text-center font-sans">Carregando painel de controle...</div>

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans text-gray-800">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-600">Meu Caixa Pro</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition">Sair</button>
      </div>

      {/* Cartões de Resumo (O que adicionamos agora) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl shadow-sm">
          <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Entradas</p>
          <p className="text-2xl font-black text-green-700">R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl shadow-sm">
          <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Saídas</p>
          <p className="text-2xl font-black text-red-700">R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm ${saldo >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-xs font-bold uppercase tracking-wider ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Saldo Atual</p>
          <p className={`text-2xl font-black ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={salvar} className="bg-white p-6 border rounded-2xl mb-8 flex flex-col md:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Descrição</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ex: Venda de Produto" />
        </div>
        <div className="w-full md:w-40">
          <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Valor (R$)</label>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.00" />
        </div>
        <div className="w-full md:w-40">
          <label className="block text-xs font-bold mb-1 text-gray-500 uppercase">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="entrada text-green-600">↑ Entrada</option>
            <option value="saida text-red-600">↓ Saída</option>
          </select>
        </div>
        <button className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Lançar</button>
      </form>

      {/* Lista de Itens */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Últimas Movimentações</h2>
        {lista.map(item => (
          <div key={item.id} className="flex justify-between items-center p-4 bg-white border rounded-2xl hover:border-blue-200 transition group shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${item.tipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {item.tipo === 'entrada' ? 'E' : 'S'}
              </div>
              <div>
                <p className="font-bold text-gray-800">{item.descricao}</p>
                <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <p className={`text-lg font-black ${item.tipo === 'entrada' ? "text-green-600" : "text-red-600"}`}>
                {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toFixed(2)}
              </p>
              <button onClick={() => excluir(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition font-medium">Excluir</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-center py-10 text-gray-400 italic">Nenhum lançamento encontrado.</p>}
      </div>
    </main>
  )
}