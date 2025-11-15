import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient, ObjectId } from 'mongodb';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// CONFIGURAR FUSO HORÁRIO DO BRASIL
process.env.TZ = 'America/Sao_Paulo';

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

    // Criar justificativas padrão
    await createDefaultPauseReasons();
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error);
  }
};


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
    await db.collection('pause_reasons').createIndex({ name: 1 }, { unique: true }); // NOVO
    await db.collection('requests').createIndex({ employee_id: 1, created_at: -1 }); // NOVO
    await db.collection('requests').createIndex({ status: 1 }); // NOVO
    
    // Criar usuário admin padrão e justificativas
    await createDefaultAdmin();
  } catch (error) {
    console.error('❌ Erro ao conectar com MongoDB:', error.message);
    console.error('💡 Dica: Verifique a string de conexão no Render');
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
// app.post('/api/time-records', authenticateToken, requireAdmin, async (req, res) => {
//   const { employee_id, type } = req.body;
//   const timestamp = new Date();

//   try {
//     // Validar o tipo de registro
//     if (!['entry', 'pause', 'exit'].includes(type)) {
//       return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
//     }

//     // Buscar o último registro do funcionário hoje
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const lastRecord = await db.collection('time_records')
//       .findOne({
//         employee_id: new ObjectId(employee_id),
//         timestamp: { $gte: today }
//       }, {
//         sort: { timestamp: -1 }
//       });

//     if (type === 'entry') {
//       if (lastRecord && lastRecord.type === 'entry') {
//         return res.status(400).json({ 
//           error: 'Entrada já registrada. Registre pausa ou saída primeiro.' 
//         });
//       }
//       // Permite entrada após saída (novo turno no mesmo dia)
//     } 
//     else if (type === 'pause') {
//       // Só pode pausar se a última ação foi entrada
//       if (!lastRecord || lastRecord.type !== 'entry') {
//         return res.status(400).json({ 
//           error: 'Você precisa registrar uma entrada antes de pausar.' 
//         });
//       }
//     } 
//     else if (type === 'exit') {
//       // Pode sair se:
//       // - Último registro foi entrada (expediente sem pausa)
//       // - Último registro foi pausa (saída direta após pausa)
//       // - Último registro foi entrada após retorno (expediente com pausa)
//       if (!lastRecord) {
//         return res.status(400).json({ 
//           error: 'Registro de entrada não encontrado para hoje.' 
//         });
//       }
//       if (lastRecord.type === 'exit') {
//         return res.status(400).json({ 
//           error: 'Saída já registrada para hoje.' 
//         });
//       }
//     }

//     const result = await db.collection('time_records').insertOne({
//       employee_id: new ObjectId(employee_id),
//       type,
//       timestamp,
//       created_at: new Date()
//     });

//     const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });
//     res.status(201).json(newRecord);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// app.get('/api/time-records/:employee_id', authenticateToken, requireAdmin, async (req, res) => {
//   const { employee_id } = req.params;
//   const { start_date, end_date } = req.query;

//   try {
//     const records = await db.collection('time_records')
//       .find({
//         employee_id: new ObjectId(employee_id),
//         timestamp: {
//           $gte: new Date(start_date),
//           $lte: new Date(end_date + 'T23:59:59.999Z')
//         }
//       })
//       .sort({ timestamp: -1 })
//       .toArray();

//     res.json(records);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Função para criar justificativas padrão

// ==================== ROTAS PESSOAIS DO FUNCIONÁRIO ====================

// Funcionário ver seus próprios dados
// app.post('/api/me/time-records', authenticateToken, requireEmployee, async (req, res) => {
//   const { type } = req.body;
//   const timestamp = new Date();

//   try {
//     const user = await db.collection('users').findOne({ 
//       _id: new ObjectId(req.user.id) 
//     });

//     if (!user || !user.employee_id) {
//       return res.status(400).json({ error: 'Funcionário não vinculado' });
//     }

//     // Validar o tipo de registro
//     if (!['entry', 'pause', 'exit'].includes(type)) {
//       return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
//     }

//     // Buscar o último registro do funcionário hoje
//     const today = new Date();
//     today.setHours(0, 0, 0, 0);
    
//     const lastRecord = await db.collection('time_records')
//       .findOne({
//         employee_id: user.employee_id,
//         timestamp: { $gte: today }
//       }, {
//         sort: { timestamp: -1 }
//       });

//     // MESMA LÓGICA CORRIGIDA APLICADA AQUI
//     if (type === 'entry') {
//       if (lastRecord && lastRecord.type === 'entry') {
//         return res.status(400).json({ 
//           error: 'Entrada já registrada. Registre pausa ou saída primeiro.' 
//         });
//       }
//     } 
//     else if (type === 'pause') {
//       if (!lastRecord || lastRecord.type !== 'entry') {
//         return res.status(400).json({ 
//           error: 'Você precisa registrar uma entrada antes de pausar.' 
//         });
//       }
//     } 
//     else if (type === 'exit') {
//       if (!lastRecord) {
//         return res.status(400).json({ 
//           error: 'Registro de entrada não encontrado para hoje.' 
//         });
//       }
//       if (lastRecord.type === 'exit') {
//         return res.status(400).json({ 
//           error: 'Saída já registrada para hoje.' 
//         });
//       }
//     }

//     const result = await db.collection('time_records').insertOne({
//       employee_id: user.employee_id,
//       type,
//       timestamp,
//       created_at: new Date()
//     });

//     const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });
    
//     // Buscar dados do funcionário para a resposta
//     const employee = await db.collection('employees').findOne({ 
//       _id: user.employee_id 
//     });

//     res.status(201).json({
//       ...newRecord,
//       employee_name: employee?.name
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// Editar justificativa
app.put('/api/pause-reasons/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    // Verificar se a justificativa existe
    const existingReason = await db.collection('pause_reasons').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingReason) {
      return res.status(404).json({ error: 'Justificativa não encontrada' });
    }

    // Verificar se nome já existe (excluindo a própria justificativa)
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

    // Validar o tipo de registro
    if (!['entry', 'pause', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
    }

    // Buscar o último registro do funcionário hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastRecord = await db.collection('time_records')
      .findOne({
        employee_id: user.employee_id,
        timestamp: { $gte: today }
      }, {
        sort: { timestamp: -1 }
      });

    // Validar regras de negócio
    if (type === 'entry') {
      // Não pode dar entrada se já houver uma entrada sem saída
      if (lastRecord && lastRecord.type === 'entry') {
        return res.status(400).json({ 
          error: 'Você já registrou uma entrada. Registre pausa ou saída primeiro.' 
        });
      }
      if (lastRecord && lastRecord.type === 'pause') {
        return res.status(400).json({ 
          error: 'Você está em pausa. Registre saída primeiro antes de uma nova entrada.' 
        });
      }
    } else if (type === 'pause') {
      // Só pode dar pausa se houver entrada sem saída
      if (!lastRecord || lastRecord.type !== 'entry') {
        return res.status(400).json({ 
          error: 'Você precisa registrar uma entrada antes de pausar.' 
        });
      }
    } else if (type === 'exit') {
      // Só pode dar saída se houver entrada (e não pode ter saída já registrada)
      if (!lastRecord || (lastRecord.type !== 'entry' && lastRecord.type !== 'pause')) {
        return res.status(400).json({ 
          error: 'Você precisa registrar uma entrada antes de sair.' 
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

// ==================== RELATÓRIOS PDF - ESPELHO DE PONTO FORMATADO ====================
app.get('/api/reports/timesheet/:employee_id/pdf', authenticateToken, requireAdmin, async (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  console.log('📊 Gerando PDF para funcionário:', employee_id);
  console.log('📅 Período:', start_date, 'até', end_date);

  try {
    if (!ObjectId.isValid(employee_id)) {
      return res.status(400).json({ error: 'ID do funcionário inválido' });
    }

    const employee = await db.collection('employees').findOne({ 
      _id: new ObjectId(employee_id) 
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    // Buscar registros ordenados por data
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

    // Agrupar registros por dia
    const recordsByDay = {};
    records.forEach(record => {
      const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
      if (!recordsByDay[dateKey]) {
        recordsByDay[dateKey] = [];
      }
      recordsByDay[dateKey].push(record);
    });

    // Criar PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=espelho-ponto-${employee.name.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(16).font('Helvetica-Bold')
       .text('ESPELHO DE PONTO', { align: 'center' });
    
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
       .text(`Funcionário: ${employee.name}`, { align: 'left' })
       .text(`Matrícula: ${employee._id.toString().substring(18, 24)}`, { align: 'left' })
       .text(`Departamento: ${employee.department}`, { align: 'left' })
       .text(`Período: ${new Date(start_date).toLocaleDateString('pt-BR')} à ${new Date(end_date).toLocaleDateString('pt-BR')}`, { align: 'left' })
       .text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'left' });

    doc.moveDown(1);

    // Tabela de registros
    let yPosition = doc.y;
    const pageWidth = doc.page.width - 100;
    const colWidth = pageWidth / 6;

    // Cabeçalho da tabela
    const pageWidthNew = doc.page.width - 100;
    const colWidthNew = pageWidthNew / 8;
    
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('DATA', 50, yPosition);
    doc.text('DIA', 50 + colWidthNew, yPosition);
    doc.text('ENTRADA', 50 + colWidthNew * 2, yPosition);
    doc.text('PAUSA', 50 + colWidthNew * 3, yPosition);
    doc.text('RETORNO', 50 + colWidthNew * 4, yPosition);
    doc.text('SAÍDA', 50 + colWidthNew * 5, yPosition);
    doc.text('TOTAL', 50 + colWidthNew * 6, yPosition);
    doc.text('H. EXTRA', 50 + colWidthNew * 7, yPosition);
    
    yPosition += 15;
    doc.moveTo(50, yPosition).lineTo(50 + pageWidthNew, yPosition).stroke();
    yPosition += 10;

    // Linhas da tabela
    doc.fontSize(7).font('Helvetica');
    
    let totalHorasNormais = 0;
    let totalHorasExtras = 0;
    const diasUteis = Object.keys(recordsByDay).length;

    Object.keys(recordsByDay).sort().forEach(dateKey => {
      const dayRecords = recordsByDay[dateKey];
      const date = new Date(dateKey);
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      
      // Encontrar entrada, pausa e saída do dia
      const entradas = dayRecords.filter(r => r.type === 'entry');
      const pausas = dayRecords.filter(r => r.type === 'pause');
      const saida = dayRecords.find(r => r.type === 'exit');

      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
        
        // Cabeçalho na nova página
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('DATA', 50, yPosition);
        doc.text('DIA', 50 + colWidthNew, yPosition);
        doc.text('ENTRADA', 50 + colWidthNew * 2, yPosition);
        doc.text('PAUSA', 50 + colWidthNew * 3, yPosition);
        doc.text('RETORNO', 50 + colWidthNew * 4, yPosition);
        doc.text('SAÍDA', 50 + colWidthNew * 5, yPosition);
        doc.text('TOTAL', 50 + colWidthNew * 6, yPosition);
        doc.text('H. EXTRA', 50 + colWidthNew * 7, yPosition);
        
        yPosition += 15;
        doc.moveTo(50, yPosition).lineTo(50 + pageWidthNew, yPosition).stroke();
        yPosition += 10;
        doc.fontSize(7).font('Helvetica');
      }

      // Data
      doc.text(date.toLocaleDateString('pt-BR'), 50, yPosition);
      
      // Dia da semana
      const dayShort = dayName.substring(0, 3);
      doc.text(dayShort.charAt(0).toUpperCase() + dayShort.slice(1), 50 + colWidthNew, yPosition);
      
      // Primeira entrada
      const primeiraEntrada = entradas[0];
      if (primeiraEntrada) {
        doc.text(new Date(primeiraEntrada.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}), 50 + colWidthNew * 2, yPosition);
      } else {
        doc.text('--:--', 50 + colWidthNew * 2, yPosition);
      }
      
      // Pausa
      const pausa = pausas[0];
      if (pausa) {
        doc.text(new Date(pausa.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}), 50 + colWidthNew * 3, yPosition);
      } else {
        doc.text('--:--', 50 + colWidthNew * 3, yPosition);
      }
      
      // Retorno (segunda entrada)
      const retorno = entradas[1];
      if (retorno) {
        doc.text(new Date(retorno.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}), 50 + colWidthNew * 4, yPosition);
      } else {
        doc.text('--:--', 50 + colWidthNew * 4, yPosition);
      }
      
      // Saída
      if (saida) {
        doc.text(new Date(saida.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}), 50 + colWidthNew * 5, yPosition);
      } else {
        doc.text('--:--', 50 + colWidthNew * 5, yPosition);
      }
      
      // Cálculo de horas trabalhadas: (saída - primeira entrada) - (retorno - pausa)
      let horasTrabalhadas = '--:--';
      let horasExtras = '--:--';
      
      if (primeiraEntrada && saida) {
        // Tempo total (saída - primeira entrada)
        let diffMs = new Date(saida.timestamp) - new Date(primeiraEntrada.timestamp);
        
        // Subtrair tempo de pausa se houver pausa e retorno
        if (pausa && retorno) {
          const pausaMs = new Date(retorno.timestamp) - new Date(pausa.timestamp);
          diffMs -= pausaMs;
        }
        
        const diffHours = diffMs / (1000 * 60 * 60);
        
        const horas = Math.floor(diffHours);
        const minutos = Math.floor((diffHours - horas) * 60);
        horasTrabalhadas = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        
        // Calcular horas extras (acima de 8 horas)
        if (diffHours > 8) {
          const extraHours = diffHours - 8;
          const extraHoras = Math.floor(extraHours);
          const extraMinutos = Math.floor((extraHours - extraHoras) * 60);
          horasExtras = `${extraHoras.toString().padStart(2, '0')}:${extraMinutos.toString().padStart(2, '0')}`;
          totalHorasExtras += extraHours;
        } else {
          horasExtras = '00:00';
        }
        
        totalHorasNormais += Math.min(diffHours, 8);
      }
      
      doc.text(horasTrabalhadas, 50 + colWidthNew * 6, yPosition);
      doc.text(horasExtras, 50 + colWidthNew * 7, yPosition);
      
      yPosition += 12;
    });

    // Resumo
    yPosition += 20;
    doc.fontSize(9).font('Helvetica-Bold')
       .text('RESUMO DO PERÍODO', 50, yPosition);
    
    yPosition += 15;
    doc.fontSize(8).font('Helvetica')
       .text(`Total de dias úteis: ${diasUteis}`, 50, yPosition)
       .text(`Horas normais: ${Math.floor(totalHorasNormais)}h ${Math.floor((totalHorasNormais - Math.floor(totalHorasNormais)) * 60)}min`, 50, yPosition + 12)
       .text(`Horas extras: ${Math.floor(totalHorasExtras)}h ${Math.floor((totalHorasExtras - Math.floor(totalHorasExtras)) * 60)}min`, 50, yPosition + 24)
       .text(`Salário base: R$ ${employee.salary.toFixed(2)}`, 50, yPosition + 36);

    // Assinaturas
    const assinaturaY = doc.page.height - 100;
    doc.moveTo(50, assinaturaY).lineTo(250, assinaturaY).stroke();
    doc.moveTo(300, assinaturaY).lineTo(500, assinaturaY).stroke();
    
    doc.text('Assinatura do Funcionário', 100, assinaturaY + 10);
    doc.text('Assinatura do Responsável', 350, assinaturaY + 10);

    doc.end();
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).json({ error: 'Erro ao gerar PDF: ' + error.message });
  }
});

// ==================== RELATÓRIOS EXCEL - FOLHA DE PAGAMENTO COMPLETA ====================
app.get('/api/reports/payroll/excel', authenticateToken, requireAdmin, async (req, res) => {
  const { month, year } = req.query;

  console.log('💰 Gerando Excel - Mês:', month, 'Ano:', year);

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Buscar todos os funcionários
    const employees = await db.collection('employees').find().toArray();
    console.log(`👥 ${employees.length} funcionários encontrados`);

    // Para cada funcionário, calcular dados de ponto
    const payrollData = await Promise.all(
      employees.map(async (employee) => {
        // Buscar todos os registros do mês
        const records = await db.collection('time_records')
          .find({
            employee_id: employee._id,
            timestamp: { $gte: startDate, $lte: endDate }
          })
          .sort({ timestamp: 1 })
          .toArray();

        // Agrupar registros por dia
        const recordsByDay = {};
        records.forEach(record => {
          const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
          if (!recordsByDay[dateKey]) {
            recordsByDay[dateKey] = [];
          }
          recordsByDay[dateKey].push(record);
        });

        // Calcular totais
        let totalHorasNormais = 0;
        let totalHorasExtras = 0;
        let diasTrabalhados = 0;

        Object.keys(recordsByDay).forEach(dateKey => {
          const dayRecords = recordsByDay[dateKey];
          const entradas = dayRecords.filter(r => r.type === 'entry');
          const pausas = dayRecords.filter(r => r.type === 'pause');
          const saida = dayRecords.find(r => r.type === 'exit');

          const primeiraEntrada = entradas[0];
          const retorno = entradas[1];
          const pausa = pausas[0];

          if (primeiraEntrada && saida) {
            // Tempo total (saída - primeira entrada)
            let diffMs = new Date(saida.timestamp) - new Date(primeiraEntrada.timestamp);
            
            // Subtrair tempo de pausa se houver pausa e retorno
            if (pausa && retorno) {
              const pausaMs = new Date(retorno.timestamp) - new Date(pausa.timestamp);
              diffMs -= pausaMs;
            }
            
            const diffHours = diffMs / (1000 * 60 * 60);
            
            totalHorasNormais += Math.min(diffHours, 8);
            if (diffHours > 8) {
              totalHorasExtras += diffHours - 8;
            }
            diasTrabalhados++;
          }
        });

        // Calcular salários
        const valorHoraNormal = employee.salary / 30 / 8; // Salário por hora
        const valorHoraExtra = valorHoraNormal * 1.5; // Hora extra com 50% de acréscimo
        
        const salarioNormal = valorHoraNormal * totalHorasNormais;
        const salarioExtra = valorHoraExtra * totalHorasExtras;
        const salarioTotal = salarioNormal + salarioExtra;

        return {
          nome: employee.name,
          data_admissao: new Date(employee.hire_date),
          dias_trabalhados: diasTrabalhados,
          horas_normais: totalHorasNormais,
          horas_extras: totalHorasExtras,
          salario_base: employee.salary,
          salario_normal: salarioNormal,
          salario_extra: salarioExtra,
          salario_total: salarioTotal,
          registros: records
        };
      })
    );

    // Criar Excel
    const workbook = new ExcelJS.Workbook();
    
    // Planilha principal - Folha de Pagamento
    const worksheet = workbook.addWorksheet('Folha de Pagamento');

    // Cabeçalhos
    worksheet.columns = [
      { header: 'Funcionário', key: 'nome', width: 25 },
      { header: 'Data Admissão', key: 'data_admissao', width: 15 },
      { header: 'Dias Trabalhados', key: 'dias_trabalhados', width: 15 },
      { header: 'Horas Normais', key: 'horas_normais', width: 15 },
      { header: 'Horas Extras', key: 'horas_extras', width: 15 },
      { header: 'Salário Base', key: 'salario_base', width: 15 },
      { header: 'Salário Normal', key: 'salario_normal', width: 15 },
      { header: 'Hora Extra', key: 'salario_extra', width: 15 },
      { header: 'Salário Total', key: 'salario_total', width: 15 }
    ];
    
    // Planilha detalhada de registros com pausas
    const detailedSheet = workbook.addWorksheet('Registros Detalhados');
    detailedSheet.columns = [
      { header: 'Funcionário', key: 'nome', width: 25 },
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Entrada', key: 'entrada', width: 10 },
      { header: 'Pausa', key: 'pausa', width: 10 },
      { header: 'Retorno', key: 'retorno', width: 10 },
      { header: 'Saída', key: 'saida', width: 10 },
      { header: 'Total Horas', key: 'total_horas', width: 12 }
    ];

    // Adicionar dados na planilha principal
    payrollData.forEach(emp => {
      worksheet.addRow({
        nome: emp.nome,
        data_admissao: emp.data_admissao,
        dias_trabalhados: emp.dias_trabalhados,
        horas_normais: Math.round(emp.horas_normais * 100) / 100,
        horas_extras: Math.round(emp.horas_extras * 100) / 100,
        salario_base: emp.salario_base,
        salario_normal: Math.round(emp.salario_normal * 100) / 100,
        salario_extra: Math.round(emp.salario_extra * 100) / 100,
        salario_total: Math.round(emp.salario_total * 100) / 100
      });
      
      // Adicionar registros detalhados do funcionário
      const recordsByDay = {};
      emp.registros.forEach(record => {
        const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
        if (!recordsByDay[dateKey]) {
          recordsByDay[dateKey] = [];
        }
        recordsByDay[dateKey].push(record);
      });

      Object.keys(recordsByDay).sort().forEach(dateKey => {
        const dayRecords = recordsByDay[dateKey];
        const entradas = dayRecords.filter(r => r.type === 'entry');
        const pausas = dayRecords.filter(r => r.type === 'pause');
        const saida = dayRecords.find(r => r.type === 'exit');

        const primeiraEntrada = entradas[0];
        const retorno = entradas[1];
        const pausa = pausas[0];

        let totalHoras = '--:--';
        if (primeiraEntrada && saida) {
          let diffMs = new Date(saida.timestamp) - new Date(primeiraEntrada.timestamp);
          
          if (pausa && retorno) {
            const pausaMs = new Date(retorno.timestamp) - new Date(pausa.timestamp);
            diffMs -= pausaMs;
          }
          
          const diffHours = diffMs / (1000 * 60 * 60);
          const horas = Math.floor(diffHours);
          const minutos = Math.floor((diffHours - horas) * 60);
          totalHoras = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }

        detailedSheet.addRow({
          nome: emp.nome,
          data: new Date(dateKey),
          entrada: primeiraEntrada ? new Date(primeiraEntrada.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '--:--',
          pausa: pausa ? new Date(pausa.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '--:--',
          retorno: retorno ? new Date(retorno.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '--:--',
          saida: saida ? new Date(saida.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : '--:--',
          total_horas: totalHoras
        });
      });
    });

    // Formatar a planilha detalhada
    const detailedHeaderRow = detailedSheet.getRow(1);
    detailedHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailedHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2E86AB' }
    };
    detailedHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    detailedSheet.getColumn(2).numFmt = 'dd/mm/yyyy';

    // Formatar números na planilha principal
    [5, 6, 7, 8].forEach(colIndex => {
      worksheet.getColumn(colIndex).numFmt = '"R$"#,##0.00';
    });

    [3, 4].forEach(colIndex => {
      worksheet.getColumn(colIndex).numFmt = '0.00"h"';
    });

    // Formatar data
    worksheet.getColumn(2).numFmt = 'dd/mm/yyyy';

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
      
      worksheet.mergeCells(`A${totalRow}:E${totalRow}`);
      worksheet.getCell(`A${totalRow}`).value = 'TOTAIS:';
      worksheet.getCell(`A${totalRow}`).font = { bold: true };
      worksheet.getCell(`A${totalRow}`).alignment = { horizontal: 'right' };
      
      // Fórmulas para totais
      worksheet.getCell(`F${totalRow}`).value = { formula: `SUM(F2:F${payrollData.length + 1})` };
      worksheet.getCell(`G${totalRow}`).value = { formula: `SUM(G2:G${payrollData.length + 1})` };
      worksheet.getCell(`H${totalRow}`).value = { formula: `SUM(H2:H${payrollData.length + 1})` };
      worksheet.getCell(`I${totalRow}`).value = { formula: `SUM(I2:I${payrollData.length + 1})` };
      
      // Formatar células de totais
      for (let col = 6; col <= 9; col++) {
        worksheet.getCell(totalRow, col).font = { bold: true };
        worksheet.getCell(totalRow, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        };
      }
    }

    // Planilha 2 - Detalhes dos Registros
    const detailsWorksheet = workbook.addWorksheet('Detalhes Registros');

    detailsWorksheet.columns = [
      { header: 'Funcionário', key: 'funcionario', width: 25 },
      { header: 'Data', key: 'data', width: 12 },
      { header: 'Dia', key: 'dia', width: 12 },
      { header: 'Entrada', key: 'entrada', width: 10 },
      { header: 'Saída', key: 'saida', width: 10 },
      { header: 'Total Horas', key: 'total_horas', width: 12 },
      { header: 'Horas Extras', key: 'horas_extras', width: 12 }
    ];

    // Adicionar detalhes de todos os registros
    payrollData.forEach(emp => {
      const recordsByDay = {};
      emp.registros.forEach(record => {
        const dateKey = new Date(record.timestamp).toISOString().split('T')[0];
        if (!recordsByDay[dateKey]) {
          recordsByDay[dateKey] = [];
        }
        recordsByDay[dateKey].push(record);
      });

      Object.keys(recordsByDay).sort().forEach(dateKey => {
        const dayRecords = recordsByDay[dateKey];
        const date = new Date(dateKey);
        const entrada = dayRecords.find(r => r.type === 'entry');
        const saida = dayRecords.find(r => r.type === 'exit');

        let totalHoras = '--:--';
        let horasExtras = '00:00';

        if (entrada && saida) {
          const diffMs = new Date(saida.timestamp) - new Date(entrada.timestamp);
          const diffHours = diffMs / (1000 * 60 * 60);
          
          const horas = Math.floor(diffHours);
          const minutos = Math.floor((diffHours - horas) * 60);
          totalHoras = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
          
          if (diffHours > 8) {
            const extraHours = diffHours - 8;
            const extraHoras = Math.floor(extraHours);
            const extraMinutos = Math.floor((extraHours - extraHoras) * 60);
            horasExtras = `${extraHoras.toString().padStart(2, '0')}:${extraMinutos.toString().padStart(2, '0')}`;
          }
        }

        detailsWorksheet.addRow({
          funcionario: emp.nome,
          data: date,
          dia: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
          entrada: entrada ? new Date(entrada.timestamp).toLocaleTimeString('pt-BR') : '--:--',
          saida: saida ? new Date(saida.timestamp).toLocaleTimeString('pt-BR') : '--:--',
          total_horas: totalHoras,
          horas_extras: horasExtras
        });
      });
    });

    // Formatar cabeçalhos da segunda planilha
    const detailsHeader = detailsWorksheet.getRow(1);
    detailsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    detailsHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF28A745' }
    };
    detailsHeader.alignment = { vertical: 'middle', horizontal: 'center' };

    // Formatar datas
    detailsWorksheet.getColumn(2).numFmt = 'dd/mm/yyyy';

    // Configurar headers
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

// Coleção de tipos de justificativa de pausa
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

// ==================== SOLICITAÇÕES ====================

// Tipos de solicitação
const REQUEST_TYPES = {
  ABSENCE: 'absence',
  TIME_RECORD: 'time_record'
};

// Status das solicitações
const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Criar solicitação
app.post('/api/requests', authenticateToken, async (req, res) => {
  const { type, date, reason, description, requested_time } = req.body;

  try {
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(req.user.id) 
    });

    if (!user || !user.employee_id) {
      return res.status(400).json({ error: 'Funcionário não vinculado' });
    }

    // Validar tipo de solicitação
    if (![REQUEST_TYPES.ABSENCE, REQUEST_TYPES.TIME_RECORD].includes(type)) {
      return res.status(400).json({ error: 'Tipo de solicitação inválido' });
    }

    // Para solicitação de ponto, horário é obrigatório
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
    
    // Buscar dados do funcionário
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

// Listar solicitações (admin vê todas, funcionário vê apenas as próprias)
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

    // Buscar dados dos funcionários
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

// Aprovar/rejeitar solicitação (apenas admin)
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

    // Se aprovada e for solicitação de ponto, criar o registro automaticamente
    if (status === REQUEST_STATUS.APPROVED && request.type === REQUEST_TYPES.TIME_RECORD) {
      // Determinar o tipo baseado no horário solicitado
      let recordType = 'entry';
      // Lógica simples: se for antes das 12h é entrada, depois é saída
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
    
    // Buscar dados adicionais
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

// ==================== ATUALIZAÇÃO DO REGISTRO DE PAUSA COM JUSTIFICATIVA ====================

// NOVO endpoint para registro de ponto com justificativa para pausas
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

    // Validar o tipo de registro
    if (!['entry', 'pause', 'exit'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de registro inválido. Use: entry, pause ou exit' });
    }

    // Para pausas, validar justificativa
    if (type === 'pause') {
      if (!pause_reason_id && !custom_reason) {
        return res.status(400).json({ error: 'Justificativa é obrigatória para pausas' });
      }

      // Se foi selecionada uma razão pré-definida, validar se existe
      if (pause_reason_id) {
        const reasonExists = await db.collection('pause_reasons').findOne({ 
          _id: new ObjectId(pause_reason_id) 
        });
        if (!reasonExists) {
          return res.status(400).json({ error: 'Justificativa selecionada não existe' });
        }
      }
    }

    // Buscar o último registro do funcionário hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastRecord = await db.collection('time_records')
      .findOne({
        employee_id: user.employee_id,
        timestamp: { $gte: today }
      }, {
        sort: { timestamp: -1 }
      });

    // Validar regras de negócio
    if (type === 'entry') {
      if (lastRecord && lastRecord.type === 'entry') {
        return res.status(400).json({ 
          error: 'Você já registrou uma entrada. Registre pausa ou saída primeiro.' 
        });
      }
      if (lastRecord && lastRecord.type === 'pause') {
        return res.status(400).json({ 
          error: 'Você está em pausa. Registre saída primeiro antes de uma nova entrada.' 
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
          error: 'Você precisa registrar uma entrada antes de sair.' 
        });
      }
    }

    const recordData = {
      employee_id: user.employee_id,
      type,
      timestamp,
      created_at: new Date()
    };

    // Adicionar dados da justificativa se for pausa
    if (type === 'pause') {
      recordData.pause_reason_id = pause_reason_id ? new ObjectId(pause_reason_id) : null;
      recordData.custom_reason = custom_reason;
    }

    const result = await db.collection('time_records').insertOne(recordData);

    const newRecord = await db.collection('time_records').findOne({ _id: result.insertedId });
    
    // Buscar dados do funcionário e da justificativa se houver
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