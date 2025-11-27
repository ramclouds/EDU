import React, {useEffect, useState} from 'react'
import axios from 'axios'

function api() {
  const token = localStorage.getItem('token')
  return axios.create({ headers: { Authorization: 'Bearer ' + token } })
}

export default function EmployeeList(){
  const [data, setData] = useState({data:[], page:1, limit:20, total:0})
  useEffect(()=> {
    api().get('/api/employees?page=1&limit=20').then(r=> setData(r.data)).catch(()=>{})
  }, [])
  return (
    <div>
      <h2 className="text-xl mb-2">Employees</h2>
      <table className="min-w-full border">
        <thead><tr><th className="border p-2">Name</th><th className="border p-2">Email</th><th className="border p-2">Salary</th></tr></thead>
        <tbody>
          {data.data.map(e => (
            <tr key={e.id}>
              <td className="border p-2">{e.first_name} {e.last_name}</td>
              <td className="border p-2">{e.email}</td>
              <td className="border p-2">{e.salary}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2">Total: {data.total}</div>
    </div>
  )
}
