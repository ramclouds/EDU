import os
from flask import Flask, jsonify, request, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from datetime import datetime
import threading
from worker import init_worker, enqueue_payslip

load_dotenv()

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('MYSQL_DSN', 'mysql+pymysql://root:password@127.0.0.1/edu_payroll')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'verysecret')

db = SQLAlchemy(app)
jwt = JWTManager(app)

# models defined in models.py
from models import Admin, Employee, PayrollRun, Payslip

@app.route('/api/register-admin', methods=['POST'])
def register_admin():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error':'username/password required'}), 400
    if Admin.query.filter_by(username=data['username']).first():
        return jsonify({'error':'username exists'}), 400
    a = Admin(username=data['username'], password_hash=generate_password_hash(data['password']))
    db.session.add(a)
    db.session.commit()
    return '', 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error':'username/password required'}), 400
    a = Admin.query.filter_by(username=data['username']).first()
    if not a or not check_password_hash(a.password_hash, data['password']):
        return jsonify({'error':'invalid credentials'}), 401
    token = create_access_token(identity={'id': a.id, 'username': a.username})
    return jsonify({'token': token})

@app.route('/api/employees', methods=['GET'])
@jwt_required()
def get_employees():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
    except:
        page, limit = 1, 20
    if page < 1: page = 1
    if limit < 1: limit = 20
    q = Employee.query.order_by(Employee.id)
    total = q.count()
    items = q.offset((page-1)*limit).limit(limit).all()
    return jsonify({'data':[i.to_dict() for i in items], 'page':page, 'limit':limit, 'total':total})

@app.route('/api/employees', methods=['POST'])
@jwt_required()
def create_employee():
    data = request.get_json()
    if not data:
        return jsonify({'error':'bad request'}), 400
    e = Employee(first_name=data.get('first_name'), last_name=data.get('last_name'),
                 email=data.get('email'), designation=data.get('designation'),
                 salary=data.get('salary', 0.0))
    db.session.add(e)
    db.session.commit()
    return jsonify(e.to_dict()), 201

@app.route('/api/payrolls/run', methods=['POST'])
@jwt_required()
def run_payroll():
    run = PayrollRun(run_date=datetime.utcnow().date(), status='queued')
    db.session.add(run)
    db.session.commit()
    employees = Employee.query.all()
    created = 0
    for e in employees:
        gross = float(e.salary)
        deductions = gross * 0.10
        net = gross - deductions
        p = Payslip(employee_id=e.id, payroll_run_id=run.id,
                   gross=gross, deductions=deductions, net_pay=net, status='pending')
        db.session.add(p)
        db.session.commit()
        enqueue_payslip(p.id)
        p.status = 'queued'
        db.session.commit()
        created += 1
    run.status = 'completed'
    db.session.commit()
    return jsonify({'run_id': run.id, 'created': created})

@app.route('/api/payrolls', methods=['GET'])
@jwt_required()
def list_payrolls():
    runs = PayrollRun.query.order_by(PayrollRun.id.desc()).all()
    return jsonify([r.to_dict() for r in runs])

@app.route('/api/payslips', methods=['GET'])
@jwt_required()
def list_payslips():
    slips = Payslip.query.order_by(Payslip.id.desc()).limit(200).all()
    return jsonify([s.to_dict() for s in slips])

@app.route('/api/payslips/<int:pid>/pdf', methods=['GET'])
@jwt_required()
def get_payslip_pdf(pid):
    p = Payslip.query.get(pid)
    if not p:
        return jsonify({'error':'not found'}), 404
    if not p.pdf_path:
        return jsonify({'error':'pdf not ready'}), 404
    return send_file(p.pdf_path, as_attachment=False)

# serve frontend
@app.route('/', defaults={'path':''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return app.send_static_file(path)
    return app.send_static_file('index.html')

if __name__ == '__main__':
    # Initialize DB tables if missing
    from models import init_models
    init_models(db)
    # start worker
    init_worker()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8080)), debug=True)
