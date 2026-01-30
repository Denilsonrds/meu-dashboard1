"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// CONFIGURAÇÃO DO BANCO DE DADOS
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

  // 1. VERIFICA SE O USUÁRIO ESTÁ LOGADO AO ABRIR A PÁGINA
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

  // 2. BUSCA AS TRANSAÇÕES NO SUPABASE
  async function buscarDados() {
    const { data } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false })
    if (data) setLista(data)
  }

  // 3. FUNÇÃO PARA ENTRAR NO SISTEMA (LOGIN)
  async function fazerLogin() {
    const email = prompt("Digite seu e-mail do Supabase:")
    const password = prompt("Digite sua senha:")
    if (!email || !password) return alert("E-mail e senha são obrigatórios!")

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      alert("Erro ao logar: " + error.message)
    } else {
      window.location.reload()
    }
  }

  // 4. FUNÇÃO PARA SALVAR NOVA TRANSAÇÃO
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

  // 5. FUNÇÃO PARA EXCLUIR TRANSAÇÃO
  async function excluir(id: string) {
    const { error } = await supabase.from('transacoes').delete().eq('id', id)
    if (!error) buscarDados()
  }

  // 6. LÓGICA DE CÁLCULOS FINANCEIROS
  const entradas = lista.filter(i => i.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0)
  const saidas = lista.filter(i => i.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0)
  const saldo = entradas - saidas

  // TELA DE LOGIN (CASO NÃO ESTEJA LOGADO)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full border border-gray-200">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <span className="text-white text-3xl font-bold">$</span>
          </div>
          <h1 className="text-2xl font-black text-gray-800 mb-2">Meu Caixa Pro</h1>
          <p className="text-gray-500 mb-8">Gestão financeira simples para o seu negócio.</p>
          <button 
            onClick={fazerLogin}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            Entrar no Sistema
          </button>
        </div>
      </div>
    )
  }

  // TELA DO DASHBOARD (CASO ESTEJA LOGADO)
  return (
    <main className="max-w-4xl mx-auto p-6 font-sans text-gray-800">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center border-b pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-blue-600 tracking-tight">Meu Caixa Pro</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition font-medium">Sair</button>
      </div>

      {/* Cartões de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Entradas</p>
          <p className="text-2xl font-black text-gray-800">R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Saídas</p>
          <p className="text-2xl font-black text-gray-800">R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`p-5 rounded-3xl border shadow-sm ${saldo >= 0 ? 'bg-blue-600 border-blue-600' : 'bg-orange-500 border-orange-500'}`}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1 text-white/80">Saldo Atual</p>
          <p className="text-2xl font-black text-white">R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Formulário de Lançamento */}
      <form onSubmit={salvar} className="bg-white p-6 border border-gray-100 rounded-3xl mb-8 flex flex-col md:flex-row gap-4 items-end shadow-sm">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold mb-2 text-gray-400 uppercase ml-1">Descrição</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Ex: Venda de Bolo" />
        </div>
        <div className="w-full md:w-32">
          <label className="block text-xs font-bold mb-2 text-gray-400 uppercase ml-1">Valor</label>
          <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="0.00" />
        </div>
        <div className="w-full md:w-40">
          <label className="block text-xs font-bold mb-2 text-gray-400 uppercase ml-1">Tipo</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold">
            <option value="entrada">↑ Entrada</option>
            <option value="saida">↓ Saída</option>
          </select>
        </div>
        <button className="w-full md:w-auto bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-200">Lançar</button>
      </form>

      {/* Lista de Movimentações */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Histórico Recente</h2>
        {lista.map(item => (
          <div key={item.id} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-3xl hover:border-blue-200 transition group shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${item.tipo === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {item.tipo === 'entrada' ? '↑' : '↓'}
              </div>
              <div>
                <p className="font-bold text-gray-800">{item.descricao}</p>
                <p className="text-xs text-gray-400 font-medium">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <p className={`text-xl font-black ${item.tipo === 'entrada' ? "text-green-600" : "text-red-600"}`}>
                R$ {item.valor.toFixed(2)}
              </p>
              <button onClick={() => excluir(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all font-bold p-2">✕</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-400">
            Nenhuma movimentação registrada.
          </div>
        )}
      </div>
    </main>
  )
}