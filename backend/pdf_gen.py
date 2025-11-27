import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from models import Payslip, Employee, db

def generate_payslip_pdf(payslip_id):
    # re-query to ensure latest
    sess = db.session
    p = sess.get(Payslip, payslip_id)
    if not p:
        raise Exception('payslip not found')
    e = sess.get(Employee, p.employee_id)
    if not e:
        raise Exception('employee not found')

    os.makedirs('static/pdfs', exist_ok=True)
    out = os.path.join('static', 'pdfs', f'payslip_{p.id}.pdf')
    c = canvas.Canvas(out, pagesize=A4)
    width, height = A4
    y = height - 50
    c.setFont('Helvetica-Bold', 16)
    c.drawString(50, y, 'Company Name - Payslip')
    y -= 30
    c.setFont('Helvetica', 12)
    c.drawString(50, y, f'Employee: {e.first_name} {e.last_name}')
    y -= 20
    c.drawString(50, y, f'Designation: {e.designation or ""}')
    y -= 30
    # table-like
    c.drawString(50, y, 'Description')
    c.drawString(300, y, 'Amount')
    y -= 20
    c.drawString(50, y, 'Gross')
    c.drawString(300, y, f"{float(p.gross):.2f}")
    y -= 20
    c.drawString(50, y, 'Deductions')
    c.drawString(300, y, f"{float(p.deductions):.2f}")
    y -= 20
    c.drawString(50, y, 'Net Pay')
    c.drawString(300, y, f"{float(p.net_pay):.2f}")
    c.showPage()
    c.save()
    # update record
    p.pdf_path = out
    p.status = 'done'
    sess.commit()
    return out
