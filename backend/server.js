import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

dotenv.config();

const app = express();

// CORS config para produção
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sistema-ponto-frontend.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// Conexão com MongoDB
let db;
const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('sistema_ponto');
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    
    // Criar índices
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('employees').createIndex({ email: 1 }, { unique: true });
    await db.collection('time_records').createIndex({ employee_id: 1, timestamp: 1 });
    
    // Criar usuário admin padrão se não existir
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error);
    process.exit(1);
  }
};

const createDefaultAdmin = async () => {
  const adminExists = await db.collection('users').findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.collection('users').insertOne({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date()
    });
    console.log('👤 Usuário admin criado: admin / admin123');
  }
};

// Inicializar conexão
connectToMongoDB();

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Health check route para Render
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: db ? 'Connected' : 'Disconnected'
  });
});

// Rotas de Autenticação
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.collection('users').findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas de Funcionários
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await db.collection('employees')
      .find()
      .sort({ name: 1 })
      .toArray();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', authenticateToken, async (req, res) => {
  const { name, email, department, salary, hire_date } = req.body;

  try {
    const result = await db.collection('employees').insertOne({
      name,
      email,
      department,
      salary: parseFloat(salary),
      hire_date: new Date(hire_date),
      created_at: new Date()
    });

    const newEmployee = await db.collection('employees').findOne({ _id: result.insertedId });
    res.status(201).json(newEmployee);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email já cadastrado' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, email, department, salary } = req.body;

  try {
    const result = await db.collection('employees').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          name, 
          email, 
          department, 
          salary: parseFloat(salary),
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const updatedEmployee = await db.collection('employees').findOne({ _id: new ObjectId(id) });
    res.json(updatedEmployee);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Email já cadastrado' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection('employees').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    await db.collection('time_records').deleteMany({ employee_id: new ObjectId(id) });

    res.json({ message: 'Funcionário excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rotas de Registro de Ponto
app.post('/api/time-records', authenticateToken, async (req, res) => {
  const { employee_id, type } = req.body;
  const timestamp = new Date();

  try {
    const result = await db.collection('time_records').insertOne({
      employee_id: new ObjectId(employee_id),
      type,
      timestamp,
      created_at: new Date()
    });

    const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/time-records/:employee_id', authenticateToken, async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    const records = await db.collection('time_records')
      .find({
        employee_id: new ObjectId(employee_id),
        timestamp: {
          $gte: new Date(start_date),
          $lte: new Date(end_date + 'T23:59:59.999Z')
        }
      })
      .sort({ timestamp: -1 })
      .toArray();

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Geração de Relatórios PDF (Espelho de Ponto)
app.get('/api/reports/timesheet/:employee_id/pdf', authenticateToken, async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    const employee = await db.collection('employees').findOne({ 
      _id: new ObjectId(employee_id) 
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const records = await db.collection('time_records')
      .find({
        employee_id: new ObjectId(employee_id),
        timestamp: {
          $gte: new Date(start_date),
          $lte: new Date(end_date + 'T23:59:59.999Z')
        }
      })
      .sort({ timestamp: 1 })
      .toArray();

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=espelho-ponto-${employee.name}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text('ESPELHO DE PONTO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Funcionário: ${employee.name}`);
    doc.text(`Departamento: ${employee.department}`);
    doc.text(`Período: ${new Date(start_date).toLocaleDateString('pt-BR')} à ${new Date(end_date).toLocaleDateString('pt-BR')}`);
    doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.moveDown();

    let yPosition = 200;
    
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Data', 50, yPosition);
    doc.text('Hora', 150, yPosition);
    doc.text('Tipo', 250, yPosition);
    doc.text('Dia da Semana', 320, yPosition);
    
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(450, yPosition).stroke();
    doc.font('Helvetica');

    records.forEach(record => {
      yPosition += 20;
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 100;
      }

      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleDateString('pt-BR');
      const timeStr = date.toLocaleTimeString('pt-BR');
      const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      doc.text(dateStr, 50, yPosition);
      doc.text(timeStr, 150, yPosition);
      doc.text(record.type === 'entry' ? 'Entrada' : 'Saída', 250, yPosition);
      doc.text(dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), 320, yPosition);
    });

    yPosition += 40;
    doc.font('Helvetica-Bold').text('RESUMO:', 50, yPosition);
    doc.font('Helvetica');
    yPosition += 20;
    doc.text(`Total de registros: ${records.length}`, 50, yPosition);
    doc.text(`Entradas: ${records.filter(r => r.type === 'entry').length}`, 50, yPosition + 15);
    doc.text(`Saídas: ${records.filter(r => r.type === 'exit').length}`, 50, yPosition + 30);

    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Geração de Relatórios Excel (Folha de Pagamento)
app.get('/api/reports/payroll/excel', authenticateToken, async (req, res) => {
  const { month, year } = req.query;

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const employees = await db.collection('employees').find().toArray();

    const payrollData = await Promise.all(
      employees.map(async (employee) => {
        const records = await db.collection('time_records')
          .find({
            employee_id: employee._id,
            timestamp: { $gte: startDate, $lte: endDate },
            type: 'entry'
          })
          .toArray();

        const diasTrabalhados = records.length;
        const salarioProporcional = (employee.salary / 30) * diasTrabalhados;

        return {
          id: employee._id.toString(),
          name: employee.name,
          department: employee.department,
          salary: employee.salary,
          dias_trabalhados: diasTrabalhados,
          salario_proporcional: salarioProporcional
        };
      })
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Folha de Pagamento');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Salário Base (R$)', key: 'salary', width: 15 },
      { header: 'Dias Trabalhados', key: 'dias_trabalhados', width: 15 },
      { header: 'Salário Proporcional (R$)', key: 'salario_proporcional', width: 20 }
    ];

    payrollData.forEach(employee => {
      worksheet.addRow(employee);
    });

    worksheet.getColumn('salary').numFmt = '"R$"#,##0.00';
    worksheet.getColumn('salario_proporcional').numFmt = '"R$"#,##0.00';

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    const totalRow = payrollData.length + 3;
    worksheet.getCell(`E${totalRow}`).value = 'TOTAL:';
    worksheet.getCell(`E${totalRow}`).font = { bold: true };
    
    const totalSalario = payrollData.reduce((sum, emp) => sum + emp.salario_proporcional, 0);
    worksheet.getCell(`F${totalRow}`).value = totalSalario;
    worksheet.getCell(`F${totalRow}`).numFmt = '"R$"#,##0.00';
    worksheet.getCell(`F${totalRow}`).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=folha-pagamento-${month}-${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para dashboard
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalEmployees = await db.collection('employees').countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = await db.collection('time_records')
      .countDocuments({
        timestamp: { $gte: today }
      });

    const recentEmployees = await db.collection('employees')
      .find()
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    res.json({
      totalEmployees,
      todayRecords,
      recentEmployees
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sistema de Ponto API', 
    version: '1.0.0',
    status: 'Online',
    environment: process.env.NODE_ENV
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV}`);
});