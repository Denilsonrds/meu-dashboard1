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
    const { error } = await supabase.from('transacoes').insert([{ descricao, valor: parseFloat(valor), tipo, user_id: user.id }])
    if (!error) { setDescricao(''); setValor(''); buscarDados() }
  }

  async function excluir(id: string) {
    const { error } = await supabase.from('transacoes').delete().eq('id', id)
    if (!error) buscarDados()
  }

  if (!user) return <div className="p-20 text-center">Carregando ou Por favor, faça login...</div>

  return (
    <main className="max-w-4xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center border-b pb-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Meu Caixa Pro</h1>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.reload())} className="text-red-500 font-medium">Sair</button>
      </div>

      <form onSubmit={salvar} className="bg-gray-50 p-6 rounded-2xl mb-8 flex gap-4 items-end shadow-sm">
        <div className="flex-1">
          <label className="block text-sm mb-1 font-medium">Descrição</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Ex: Venda de Bolo" />
        </div>
        <div className="w-32">
          <label className="block text-sm mb-1 font-medium">Valor (R$)</label>
          <input type="number" value={valor} onChange={e => setValor(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="0.00" />
        </div>
        <select value={tipo} onChange={e => setTipo(e.target.value)} className="p-2 border rounded-lg bg-white">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700">Adicionar</button>
      </form>

      <div className="grid gap-3">
        {lista.map(item => (
          <div key={item.id} className="flex justify-between items-center p-4 border rounded-xl hover:shadow-md transition">
            <div>
              <p className="font-bold text-gray-700">{item.descricao}</p>
              <p className={item.tipo === 'entrada' ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toFixed(2)}
              </p>
            </div>
            <button onClick={() => excluir(item.id)} className="text-gray-400 hover:text-red-500">Excluir</button>
          </div>
        ))}
      </div>
    </main>
  )
}