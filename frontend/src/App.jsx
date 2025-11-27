import React from 'react'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import EmployeeList from './pages/EmployeeList'
import PayrollRun from './pages/PayrollRun'
import PayslipView from './pages/PayslipView'

function requireAuth() {
  return localStorage.getItem('token')
}

export default function App(){
  if (!requireAuth()) return <Navigate to="/login" replace />
  return (
    <div className="p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Basic Education Management - Payroll</h1>
        <nav className="space-x-4 mt-2">
          <Link to="/" className="text-blue-600">Employees</Link>
          <Link to="/payroll" className="text-blue-600">Run Payroll</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<EmployeeList/>} />
        <Route path="/payroll" element={<PayrollRun/>} />
        <Route path="/payslip/:id" element={<PayslipView/>} />
      </Routes>
    </div>
  )
}
