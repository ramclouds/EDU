import React, {useState} from 'react'
import axios from 'axios'

function api() {
  const token = localStorage.getItem('token')
  return axios.create({ headers: { Authorization: 'Bearer ' + token } })
}

export default function PayrollRun(){
  const [msg,setMsg] = useState('')
  const run = async () => {
    try {
      const r = await api().post('/api/payrolls/run')
      setMsg('Created: ' + r.data.created)
    } catch(e) { setMsg('Error') }
  }
  return (
    <div>
      <h2 className="text-xl mb-4">Run Payroll</h2>
      <button onClick={run} className="px-4 py-2 bg-blue-600 text-white rounded">Run</button>
      <p className="mt-2">{msg}</p>
    </div>
  )
}
