import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

process.env.TZ = 'America/Sao_Paulo';
dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://sistema-ponto-beta.vercel.app',
    'https://sistema-ponto-frontend-*.vercel.app',
    'https://*.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

let db;
let mongoClient;

const createDefaultPauseReasons = async () => {
  try {
    const defaultReasons = [
      { name: 'Almoço', description: 'Pausa para refeição' },
      { name: 'Café', description: 'Pausa para café/descanso' },
      { name: 'Assunto Pessoal', description: 'Assuntos pessoais urgentes' },
      { name: 'Assunto Corporativo', description: 'Assuntos internos da empresa' },
      { name: 'Reunião', description: 'Participação em reunião' },
      { name: 'Médico', description: 'Consulta médica' }
    ];

    for (const reason of defaultReasons) {
      const exists = await db.collection('pause_reasons').findOne({ name: reason.name });
      if (!exists) {
        await db.collection('pause_reasons').insertOne({
          ...reason,
          created_at: new Date()
        });
      }
    }

    console.log('✅ Justificativas de pausa padrão criadas');
  } catch (error) {
    console.error('❌ Erro ao criar justificativas padrão:', error);
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

    await createDefaultPauseReasons();
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
};

const connectToMongoDB = async () => {
  try {
    console.log('🔗 Conectando ao MongoDB...');

    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    db = mongoClient.db('sistema_ponto');
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');

    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('employees').createIndex({ email: 1 }, { unique: true });
    await db.collection('time_records').createIndex({ employee_id: 1, timestamp: 1 });
    await db.collection('pause_reasons').createIndex({ name: 1 }, { unique: true });
    await db.collection('requests').createIndex({ employee_id: 1, created_at: -1 });
    await db.collection('requests').createIndex({ status: 1 });

    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
  }
};

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

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};

const requireEmployee = (req, res, next) => {
  if (req.user.role !== 'employee' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
};

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

app.get('/', (req, res) => {
  res.redirect('/health');
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API está funcionando!',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/login', async (req, res) => {
  console.log('🔐 Recebida requisição de login');

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username e password são obrigatórios' });
  }

  try {
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

app.post('/api/register', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, employee_id, role } = req.body;

  try {
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }

    if (employee_id && !ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

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

    delete newUser.password;

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('👥 Buscando lista de usuários...');

    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ username: 1 })
      .toArray();

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

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, employee_id, role, password } = req.body;

  try {
    console.log('✏️ Editando usuário:', id);

    const existingUser = await db.collection('users').findOne({
      _id: new ObjectId(id)
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (username && username !== existingUser.username) {
      const userWithSameUsername = await db.collection('users').findOne({
        username,
        _id: { $ne: new ObjectId(id) }
      });

      if (userWithSameUsername) {
        return res.status(400).json({ error: 'Username já está em uso' });
      }
    }

    if (employee_id && !ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

    if (employee_id) {
      const employee = await db.collection('employees').findOne({
        _id: new ObjectId(employee_id)
      });
      if (!employee) {
        return res.status(400).json({ error: 'Funcionário não encontrado' });
      }
    }

    const updateData = {
      updated_at: new Date()
    };

    if (username) updateData.username = username;
    if (employee_id) updateData.employee_id = new ObjectId(employee_id);
    if (role) updateData.role = role;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

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

    const updatedUser = await db.collection('users').findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

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

app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    console.log('🗑️ Excluindo usuário:', id);

    const userToDelete = await db.collection('users').findOne({
      _id: new ObjectId(id)
    });

    if (!userToDelete) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

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

app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    console.log('👥 Buscando lista de funcionários...');

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
      .sort({ timestamp: 1 })
      .limit(100)
      .toArray();

    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    if (!['entry', 'pause', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastRecord = await db.collection('time_records')
      .findOne({
        employee_id: user.employee_id,
        timestamp: { $gte: today }
      }, {
        sort: { timestamp: -1 }
      });

    if (type === 'entry') {
      // Entrada é permitida exceto se o último registro for saída
      if (lastRecord && lastRecord.type === 'exit') {
        return res.status(400).json({
          error: 'O dia já foi encerrado. Registre novamente amanhã.'
        });
      }
    }

    if (type === 'pause') {
      if (!lastRecord || lastRecord.type !== 'entry') {
        return res.status(400).json({
          error: 'Você só pode pausar após uma entrada.'
        });
      }
    }

    if (type === 'exit') {
      if (!lastRecord || (lastRecord.type !== 'entry' && lastRecord.type !== 'pause')) {
        return res.status(400).json({
          error: 'Registre uma entrada antes de encerrar o dia.'
        });
      }
    }

    const result = await db.collection('time_records').insertOne({
      employee_id: user.employee_id,
      type,
      timestamp,
      created_at: new Date()
    });

    const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });

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

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
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
        .sort({ timestamp: 1 })
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

app.get('/api/pause-reasons', authenticateToken, async (req, res) => {
  try {
    const reasons = await db.collection('pause_reasons')
      .find()
      .sort({ name: 1 })
      .toArray();
    res.json(reasons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pause-reasons', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description } = req.body;

  try {
    const result = await db.collection('pause_reasons').insertOne({
      name,
      description,
      created_at: new Date()
    });

    const newReason = await db.collection('pause_reasons').findOne({ _id: result.insertedId });
    res.status(201).json(newReason);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pause-reasons/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const existingReason = await db.collection('pause_reasons').findOne({
      _id: new ObjectId(id)
    });

    if (!existingReason) {
      return res.status(404).json({ error: 'Justificativa não encontrada' });
    }

    if (name && name !== existingReason.name) {
      const reasonWithSameName = await db.collection('pause_reasons').findOne({
        name,
        _id: { $ne: new ObjectId(id) }
      });

      if (reasonWithSameName) {
        return res.status(400).json({ error: 'Já existe uma justificativa com este nome' });
      }
    }

    const result = await db.collection('pause_reasons').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          description,
          updated_at: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Justificativa não encontrada' });
    }

    const updatedReason = await db.collection('pause_reasons').findOne({ _id: new ObjectId(id) });
    res.json(updatedReason);
  } catch (error) {
    console.error('❌ Erro ao editar justificativa:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pause-reasons/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection('pause_reasons').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Justificativa não encontrada' });
    }

    res.json({ message: 'Justificativa excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const REQUEST_TYPES = {
  ABSENCE: 'absence',
  TIME_RECORD: 'time_record'
};

const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

app.post('/api/requests', authenticateToken, async (req, res) => {
  const { type, date, reason, description, requested_time } = req.body;

  try {
    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id)
    });

    if (!user || !user.employee_id) {
      return res.status(400).json({ error: 'Funcionário não vinculado' });
    }

    if (![REQUEST_TYPES.ABSENCE, REQUEST_TYPES.TIME_RECORD].includes(type)) {
      return res.status(400).json({ error: 'Tipo de solicitação inválido' });
    }

    if (type === REQUEST_TYPES.TIME_RECORD && !requested_time) {
      return res.status(400).json({ error: 'Horário é obrigatório para solicitação de ponto' });
    }

    const result = await db.collection('requests').insertOne({
      employee_id: user.employee_id,
      user_id: new ObjectId(req.user.id),
      type,
      date: new Date(date),
      reason,
      description,
      requested_time: requested_time ? new Date(`${date}T${requested_time}`) : null,
      status: REQUEST_STATUS.PENDING,
      created_at: new Date(),
      updated_at: new Date()
    });

    const newRequest = await db.collection('requests').findOne({ _id: result.insertedId });

    const employee = await db.collection('employees').findOne({
      _id: user.employee_id
    });

    res.status(201).json({
      ...newRequest,
      employee_name: employee?.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests', authenticateToken, async (req, res) => {
  try {
    let query = {};

    if (req.user.role !== 'admin') {
      const user = await db.collection('users').findOne({
        _id: new ObjectId(req.user.id)
      });

      if (user && user.employee_id) {
        query.employee_id = user.employee_id;
      } else {
        return res.json([]);
      }
    }

    const requests = await db.collection('requests')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();

    const requestsWithEmployees = await Promise.all(
      requests.map(async (request) => {
        const employee = await db.collection('employees').findOne({
          _id: request.employee_id
        });

        const user = await db.collection('users').findOne({
          _id: request.user_id
        });

        return {
          ...request,
          employee_name: employee?.name,
          employee_department: employee?.department,
          username: user?.username
        };
      })
    );

    res.json(requestsWithEmployees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, admin_notes } = req.body;

  try {
    if (![REQUEST_STATUS.APPROVED, REQUEST_STATUS.REJECTED].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const request = await db.collection('requests').findOne({
      _id: new ObjectId(id)
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    const updateData = {
      status,
      admin_notes,
      updated_at: new Date(),
      processed_by: new ObjectId(req.user.id),
      processed_at: new Date()
    };

    if (status === REQUEST_STATUS.APPROVED && request.type === REQUEST_TYPES.TIME_RECORD) {
      let recordType = 'entry';
      const hour = request.requested_time.getHours();
      if (hour >= 12) {
        recordType = 'exit';
      }

      await db.collection('time_records').insertOne({
        employee_id: request.employee_id,
        type: recordType,
        timestamp: request.requested_time,
        created_by: new ObjectId(req.user.id),
        created_at: new Date(),
        is_correction: true,
        original_request: new ObjectId(id)
      });

      updateData.correction_applied = true;
    }

    const result = await db.collection('requests').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedRequest = await db.collection('requests').findOne({ _id: new ObjectId(id) });

    const employee = await db.collection('employees').findOne({ _id: request.employee_id });
    const user = await db.collection('users').findOne({ _id: request.user_id });

    res.json({
      ...updatedRequest,
      employee_name: employee?.name,
      username: user?.username
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/me/time-records-with-reason', authenticateToken, requireEmployee, async (req, res) => {
  const { type, pause_reason_id, custom_reason } = req.body;
  const timestamp = new Date();

  try {
    const user = await db.collection('users').findOne({
      _id: new ObjectId(req.user.id)
    });

    if (!user || !user.employee_id) {
      return res.status(400).json({ error: 'Funcionário não vinculado' });
    }

    if (!['entry', 'pause', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
    }

    if (type === 'pause') {
      if (!pause_reason_id && !custom_reason) {
        return res.status(400).json({ error: 'Justificativa é obrigatória para pausas' });
      }

      if (pause_reason_id) {
        const reasonExists = await db.collection('pause_reasons').findOne({
          _id: new ObjectId(pause_reason_id)
        });
        if (!reasonExists) {
          return res.status(400).json({ error: 'Justificativa selecionada não existe' });
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastRecord = await db.collection('time_records')
      .findOne({
        employee_id: user.employee_id,
        timestamp: { $gte: today }
      }, {
        sort: { timestamp: -1 }
      });

    if (type === 'entry') {
      if (lastRecord && lastRecord.type === 'entry') {
        return res.status(400).json({
          error: 'Entrada já registrada. Registre uma pausa ou saída primeiro.'
        });
      }
    } else if (type === 'pause') {
      if (!lastRecord || lastRecord.type !== 'entry') {
        return res.status(400).json({
          error: 'Você precisa registrar uma entrada antes de pausar.'
        });
      }
    } else if (type === 'exit') {
      if (!lastRecord || (lastRecord.type !== 'entry' && lastRecord.type !== 'pause')) {
        return res.status(400).json({
          error: 'Registro de entrada não encontrado para hoje.'
        });
      }
    }

    const recordData = {
      employee_id: user.employee_id,
      type,
      timestamp,
      created_at: new Date()
    };

    if (type === 'pause') {
      recordData.pause_reason_id = pause_reason_id ? new ObjectId(pause_reason_id) : null;
      recordData.custom_reason = custom_reason;
    }

    const result = await db.collection('time_records').insertOne(recordData);

    const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });

    const employee = await db.collection('employees').findOne({
      _id: user.employee_id
    });

    let pause_reason = null;
    if (type === 'pause' && pause_reason_id) {
      pause_reason = await db.collection('pause_reasons').findOne({
        _id: new ObjectId(pause_reason_id)
      });
    }

    res.status(201).json({
      ...newRecord,
      employee_name: employee?.name,
      pause_reason: pause_reason
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

startServer();

process.on('SIGTERM', async () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});