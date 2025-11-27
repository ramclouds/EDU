from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

def init_models(db_obj):
    global db
    db = db_obj
    db.create_all()

class Admin(db.Model):
    __tablename__ = 'admins'
    id = db.Column(db.BigInteger, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.BigInteger, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True)
    designation = db.Column(db.String(100))
    salary = db.Column(db.Numeric(12,2), default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'designation': self.designation,
            'salary': float(self.salary) if self.salary is not None else 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PayrollRun(db.Model):
    __tablename__ = 'payroll_runs'
    id = db.Column(db.BigInteger, primary_key=True)
    run_date = db.Column(db.Date)
    status = db.Column(db.Enum('draft','queued','completed', name='payroll_status'), default='draft')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'run_date': self.run_date.isoformat() if self.run_date else None, 'status': self.status, 'created_at': self.created_at.isoformat()}

class Payslip(db.Model):
    __tablename__ = 'payslips'
    id = db.Column(db.BigInteger, primary_key=True)
    employee_id = db.Column(db.BigInteger, db.ForeignKey('employees.id'))
    payroll_run_id = db.Column(db.BigInteger, db.ForeignKey('payroll_runs.id'))
    gross = db.Column(db.Numeric(12,2))
    deductions = db.Column(db.Numeric(12,2))
    net_pay = db.Column(db.Numeric(12,2))
    pdf_path = db.Column(db.String(255))
    status = db.Column(db.Enum('pending','queued','done','error', name='payslip_status'), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'payroll_run_id': self.payroll_run_id,
            'gross': float(self.gross) if self.gross is not None else 0.0,
            'deductions': float(self.deductions) if self.deductions is not None else 0.0,
            'net_pay': float(self.net_pay) if self.net_pay is not None else 0.0,
            'pdf_path': self.pdf_path,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
