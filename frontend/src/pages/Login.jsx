import React, {useState} from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [username,setUsername] = useState('')
  const [password,setPassword] = useState('')
  const [err,setErr] = useState('')
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post('/api/login', { username, password })
      localStorage.setItem('token', res.data.token)
      nav('/')
    } catch(e) {
      setErr('Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <h2 className="text-xl mb-4">Admin Login</h2>
      <form onSubmit={submit} className="space-y-2">
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" className="w-full p-2 border"/>
        <input value={password} type="password" onChange={e=>setPassword(e.target.value)} placeholder="password" className="w-full p-2 border"/>
        <button className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
        {err && <div className="text-red-600">{err}</div>}
      </form>
    </div>
  )
}
