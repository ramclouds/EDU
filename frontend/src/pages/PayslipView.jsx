import React from 'react'
import { useParams } from 'react-router-dom'

export default function PayslipView(){
  const { id } = useParams()
  const url = `/api/payslips/${id}/pdf`
  return (
    <div>
      <h2 className="text-xl">Payslip {id}</h2>
      <iframe src={url} style={{width:'100%', height:'80vh'}} title="payslip"/>
      <a href={url} className="block mt-2">Download</a>
    </div>
  )
}
