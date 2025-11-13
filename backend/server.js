import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Configurar dotenv primeiro
dotenv.config();

const app = express();

// CORS - Permitir tudo para teste
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sistema-ponto-beta.vercel.app',  // Seu frontend na Vercel
    'https://sistema-ponto-frontend-*.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Conexão com MongoDB
let db;
let mongoClient;

const connectToMongoDB = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    console.log('📡 MongoDB URI:', process.env.MONGODB_URI ? '✅ Configurada' : '❌ Não configurada');
    
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db('sistema_ponto');
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    
    // Criar índices
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('employees').createIndex({ email: 1 }, { unique: true });
    await db.collection('time_records').createIndex({ employee_id: 1, timestamp: 1 });
    
    // Criar usuário admin padrão
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
    console.error('💡 Dica: Verifique a string de conexão no Render');
  }
};

const createDefaultAdmin = async () => {
  try {
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
    } else {
      console.log('👤 Usuário admin já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
};

// ==================== MIDDLEWARES ====================

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

// Middleware de autorização para admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};

// Middleware de autorização para funcionários
const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
};

// ==================== ROTAS PÚBLICAS ====================

// Health check melhorado
app.get('/health', async (req, res) => {
  try {
    let dbStatus = 'Disconnected';
    let dbError = null;

    if (db) {
      try {
        await db.command({ ping: 1 });
        dbStatus = 'Connected';
      } catch (error) {
        dbStatus = 'Error';
        dbError = error.message;
      }
    }

    res.json({ 
      status: 'OK',
      service: 'Sistema Ponto Backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      databaseError: dbError,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error',
      error: error.message 
    });
  }
});

// Rota raiz - Redireciona para health
app.get('/', (req, res) => {
  res.redirect('/health');
});

// Rota simples para testar se a API está respondendo
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// ==================== ROTAS DE AUTENTICAÇÃO ====================
app.post('/api/login', async (req, res) => {
  console.log('🔐 Recebida requisição de login');
  
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  try {
    // Verificar se o MongoDB está conectado
    if (!db) {
      return res.status(500).json({ error: 'Database não conectado' });
    }

    const user = await db.collection('users').findOne({ username });

    if (!user) {
      console.log('❌ Usuário não encontrado:', username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log('❌ Senha inválida para usuário:', username);
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    console.log('✅ Login bem-sucedido:', username);

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor: ' + error.message });
  }
});

// ==================== ROTAS DE USUÁRIOS ====================

// Criar novo usuário (apenas admin)
app.post('/api/register', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, employee_id, role } = req.body;

  try {
    // Verificar se username já existe
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    // Verificar se employee_id é válido
    if (employee_id && !ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

    // Verificar se funcionário existe
    if (employee_id) {
      const employee = await db.collection('employees').findOne({ 
        _id: new ObjectId(employee_id) 
      });
      if (!employee) {
        return res.status(400).json({ error: 'Funcionário não encontrado' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userData = {
      username,
      password: hashedPassword,
      role: role || 'employee',
      employee_id: employee_id ? new ObjectId(employee_id) : null,
      created_at: new Date()
    };

    const result = await db.collection('users').insertOne(userData);
    const newUser = await db.collection('users').findOne({ _id: result.insertedId });

    // Remover password da resposta
    delete newUser.password;

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS COMPLETAS DE USUÁRIOS ====================

// Listar usuários (apenas admin)
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Buscando lista de usuários...');
    
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } }) // Excluir password
      .sort({ username: 1 })
      .toArray();
    
    // Buscar dados dos funcionários vinculados
    const usersWithEmployees = await Promise.all(
      users.map(async (user) => {
        let employee = null;
        if (user.employee_id) {
          employee = await db.collection('employees').findOne({ 
            _id: user.employee_id 
          });
        }
        return {
          ...user,
          employee: employee
        };
      })
    );

    console.log(`✅ Encontrados ${usersWithEmployees.length} usuários`);
    res.json(usersWithEmployees);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({ error: error.message });
  }
});

// Editar usuário (apenas admin)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, employee_id, role, password } = req.body;

  try {
    console.log('✏️ Editando usuário:', id);
    
    // Verificar se o usuário existe
    const existingUser = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se username já existe (excluindo o próprio usuário)
    if (username && username !== existingUser.username) {
      const userWithSameUsername = await db.collection('users').findOne({ 
        username, 
        _id: { $ne: new ObjectId(id) } 
      });
      
      if (userWithSameUsername) {
        return res.status(400).json({ error: 'Username já está em uso' });
      }
    }

    // Verificar se employee_id é válido
    if (employee_id && !ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

    // Verificar se funcionário existe
    if (employee_id) {
      const employee = await db.collection('employees').findOne({ 
        _id: new ObjectId(employee_id) 
      });
      if (!employee) {
        return res.status(400).json({ error: 'Funcionário não encontrado' });
      }
    }

    // Preparar dados para atualização
    const updateData = {
      updated_at: new Date()
    };

    if (username) updateData.username = username;
    if (employee_id) updateData.employee_id = new ObjectId(employee_id);
    if (role) updateData.role = role;
    
    // Atualizar senha se fornecida
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Se employee_id for null, remover o vínculo
    if (employee_id === null) {
      updateData.employee_id = null;
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar usuário atualizado
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    // Buscar dados do funcionário vinculado
    let employee = null;
    if (updatedUser.employee_id) {
      employee = await db.collection('employees').findOne({ 
        _id: updatedUser.employee_id 
      });
    }

    console.log('✅ Usuário atualizado com sucesso');
    res.json({
      ...updatedUser,
      employee: employee
    });
  } catch (error) {
    console.error('❌ Erro ao editar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excluir usuário (apenas admin)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🗑️ Excluindo usuário:', id);
    
    // Verificar se é o próprio usuário admin
    const userToDelete = await db.collection('users').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Impedir que o admin principal seja excluído
    if (userToDelete.username === 'admin') {
      return res.status(400).json({ error: 'Não é possível excluir o usuário admin principal' });
    }

    const result = await db.collection('users').deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    console.log('✅ Usuário excluído com sucesso');
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

// Desvincular funcionário de usuário (apenas admin)
app.put('/api/users/:id/unlink-employee', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🔗 Desvinculando funcionário do usuário:', id);
    
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          employee_id: null,
          updated_at: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Buscar usuário atualizado
    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    console.log('✅ Funcionário desvinculado com sucesso');
    res.json(updatedUser);
  } catch (error) {
    console.error('❌ Erro ao desvincular funcionário:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ROTAS DE FUNCIONÁRIOS (APENAS ADMIN) ====================
app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    console.log('👥 Buscando lista de funcionários...');
    console.log('👤 Usuário:', req.user.username, 'Role:', req.user.role);
    
    const employees = await db.collection('employees')
      .find()
      .sort({ name: 1 })
      .toArray();
    
    console.log(`✅ Encontrados ${employees.length} funcionários`);
    res.json(employees);
  } catch (error) {
    console.error('❌ Erro ao buscar funcionários:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/employees', authenticateToken, requireAdmin, async (req, res) => {
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

app.put('/api/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
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

app.delete('/api/employees/:id', authenticateToken, requireAdmin, async (req, res) => {
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

// ==================== ROTAS DE REGISTRO DE PONTO (ADMIN) ====================
app.post('/api/time-records', authenticateToken, requireAdmin, async (req, res) => {
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

app.get('/api/time-records/:employee_id', authenticateToken, requireAdmin, async (req, res) => {
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

// ==================== ROTAS PESSOAIS DO FUNCIONÁRIO ====================

// Funcionário ver seus próprios dados
app.get('/api/me/employee', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user.id) 
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    let employee = null;
    if (user.employee_id) {
      employee = await db.collection('employees').findOne({ 
        _id: user.employee_id 
      });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      },
      employee: employee
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funcionário ver seus próprios registros de ponto
app.get('/api/me/time-records', authenticateToken, requireEmployee, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user.id) 
    });

    if (!user || !user.employee_id) {
      return res.status(404).json({ error: 'Funcionário não vinculado' });
    }

    const { start_date, end_date } = req.query;
    
    let query = { employee_id: user.employee_id };
    
    if (start_date && end_date) {
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date + 'T23:59:59.999Z')
      };
    }

    const records = await db.collection('time_records')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(100) // Limitar para não sobrecarregar
      .toArray();

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Funcionário registrar seu próprio ponto
app.post('/api/me/time-records', authenticateToken, requireEmployee, async (req, res) => {
  const { type } = req.body;
  const timestamp = new Date();

  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user.id) 
    });

    if (!user || !user.employee_id) {
      return res.status(400).json({ error: 'Funcionário não vinculado' });
    }

    const result = await db.collection('time_records').insertOne({
      employee_id: user.employee_id,
      type,
      timestamp,
      created_at: new Date()
    });

    const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });
    
    // Buscar dados do funcionário para a resposta
    const employee = await db.collection('employees').findOne({ 
      _id: user.employee_id 
    });

    res.status(201).json({
      ...newRecord,
      employee_name: employee?.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD (ADAPTADO POR ROLE) ====================
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      // Stats para admin
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
        role: 'admin',
        totalEmployees,
        todayRecords,
        recentEmployees
      });
    } else {
      // Stats para funcionário
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(req.user.id) 
      });

      if (!user || !user.employee_id) {
        return res.json({
          role: 'employee',
          employee: null,
          todayRecords: 0,
          recentRecords: []
        });
      }

      const employee = await db.collection('employees').findOne({ 
        _id: user.employee_id 
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayRecords = await db.collection('time_records')
        .countDocuments({
          employee_id: user.employee_id,
          timestamp: { $gte: today }
        });

      const recentRecords = await db.collection('time_records')
        .find({
          employee_id: user.employee_id
        })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

      res.json({
        role: 'employee',
        employee,
        todayRecords,
        recentRecords
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RELATÓRIOS PDF (APENAS ADMIN) ====================
app.get('/api/reports/timesheet/:employee_id/pdf', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  console.log('📊 Gerando PDF para funcionário:', employee_id);
  console.log('📅 Período:', start_date, 'até', end_date);

  try {
    // Verificar se o employee_id é válido
    if (!ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

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

    console.log(`📈 Encontrados ${records.length} registros`);

    // Criar PDF
    const doc = new PDFDocument();
    
    // Configurar headers ANTES de escrever no PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=espelho-ponto-${employee.name.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).text('ESPELHO DE PONTO', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12)
       .text(`Funcionário: ${employee.name}`)
       .text(`Departamento: ${employee.department}`)
       .text(`Período: ${new Date(start_date).toLocaleDateString('pt-BR')} à ${new Date(end_date).toLocaleDateString('pt-BR')}`)
       .text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.moveDown();

    let yPosition = 150;
    
    // Cabeçalho da tabela
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Data', 50, yPosition);
    doc.text('Hora', 150, yPosition);
    doc.text('Tipo', 250, yPosition);
    doc.text('Dia da Semana', 350, yPosition);
    
    yPosition += 20;
    doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
    doc.font('Helvetica');

    // Registros
    records.forEach((record, index) => {
      yPosition += 20;
      
      // Quebra de página se necessário
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 100;
        
        // Cabeçalho da tabela na nova página
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Data', 50, yPosition);
        doc.text('Hora', 150, yPosition);
        doc.text('Tipo', 250, yPosition);
        doc.text('Dia da Semana', 350, yPosition);
        yPosition += 20;
        doc.moveTo(50, yPosition).lineTo(500, yPosition).stroke();
        doc.font('Helvetica');
        yPosition += 20;
      }

      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleDateString('pt-BR');
      const timeStr = date.toLocaleTimeString('pt-BR');
      const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      doc.text(dateStr, 50, yPosition);
      doc.text(timeStr, 150, yPosition);
      doc.text(record.type === 'entry' ? 'ENTRADA' : 'SAÍDA', 250, yPosition);
      doc.text(dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1), 350, yPosition);
    });

    // Resumo
    if (records.length > 0) {
      yPosition += 40;
      doc.font('Helvetica-Bold').text('RESUMO:', 50, yPosition);
      doc.font('Helvetica');
      yPosition += 20;
      doc.text(`Total de registros: ${records.length}`, 50, yPosition);
      doc.text(`Entradas: ${records.filter(r => r.type === 'entry').length}`, 50, yPosition + 15);
      doc.text(`Saídas: ${records.filter(r => r.type === 'exit').length}`, 50, yPosition + 30);
    } else {
      yPosition += 40;
      doc.font('Helvetica-Bold').text('NENHUM REGISTRO ENCONTRADO PARA O PERÍODO', 50, yPosition);
    }

    doc.end();
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF: ' + error.message });
  }
});

// ==================== RELATÓRIOS EXCEL (APENAS ADMIN) ====================
app.get('/api/reports/payroll/excel', authenticateToken, requireAdmin, async (req, res) => {
  const { month, year } = req.query;

  console.log('💰 Gerando Excel - Mês:', month, 'Ano:', year);

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Buscar todos os funcionários
    const employees = await db.collection('employees').find().toArray();
    console.log(`👥 ${employees.length} funcionários encontrados`);

    // Para cada funcionário, calcular dias trabalhados
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
        const salarioProporcional = diasTrabalhados > 0 ? (employee.salary / 30) * diasTrabalhados : 0;

        return {
          id: employee._id.toString().substring(18, 24), // ID curto
          name: employee.name,
          department: employee.department,
          salary: employee.salary,
          dias_trabalhados: diasTrabalhados,
          salario_proporcional: salarioProporcional
        };
      })
    );

    // Criar Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Folha de Pagamento');

    // Configurar cabeçalhos
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nome', key: 'name', width: 30 },
      { header: 'Departamento', key: 'department', width: 20 },
      { header: 'Salário Base (R$)', key: 'salary', width: 15 },
      { header: 'Dias Trabalhados', key: 'dias_trabalhados', width: 15 },
      { header: 'Salário Proporcional (R$)', key: 'salario_proporcional', width: 20 }
    ];

    // Adicionar dados
    payrollData.forEach(employee => {
      worksheet.addRow(employee);
    });

    // Formatar números como moeda
    worksheet.getColumn('salary').numFmt = '"R$"#,##0.00';
    worksheet.getColumn('salario_proporcional').numFmt = '"R$"#,##0.00';

    // Formatar cabeçalhos
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Adicionar totais
    if (payrollData.length > 0) {
      const totalRow = payrollData.length + 3;
      worksheet.mergeCells(`A${totalRow}:D${totalRow}`);
      worksheet.getCell(`A${totalRow}`).value = 'TOTAL GERAL:';
      worksheet.getCell(`A${totalRow}`).font = { bold: true };
      worksheet.getCell(`A${totalRow}`).alignment = { horizontal: 'right' };
      
      const totalSalario = payrollData.reduce((sum, emp) => sum + emp.salario_proporcional, 0);
      worksheet.getCell(`F${totalRow}`).value = totalSalario;
      worksheet.getCell(`F${totalRow}`).numFmt = '"R$"#,##0.00';
      worksheet.getCell(`F${totalRow}`).font = { bold: true };
      worksheet.getCell(`F${totalRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' }
      };
    }

    // Configurar headers ANTES de escrever o Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=folha-pagamento-${month}-${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
    
    console.log('✅ Excel gerado com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao gerar Excel:', error);
    res.status(500).json({ error: 'Erro ao gerar Excel: ' + error.message });
  }
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================
const startServer = async () => {
  try {
    await connectToMongoDB();
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log('🚀 =================================');
      console.log('🚀 Sistema de Ponto Backend Iniciado');
      console.log('🚀 =================================');
      console.log(`📍 Porta: ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: ${db ? 'Conectado' : 'Desconectado'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
      console.log('✅ Backend pronto para receber requisições!');
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
};

// Iniciar servidor
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});