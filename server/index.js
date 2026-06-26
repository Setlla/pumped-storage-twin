// 抽蓄土石方平衡 · 轻量后端服务
// 提供: 简单登录鉴权 + 基础资料/工区量 REST CRUD。生产可替换为 Spring Boot/.NET + PostGIS。
const express = require('express')
const cors = require('cors')
const db = require('./db')

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors())
app.use(express.json({ limit: '4mb' }))

db.init()

// --- 简单鉴权(演示) ---
const USERS = { admin: 'admin123', viewer: 'viewer' }
const tokens = new Map() // token -> {user, role}

function makeToken() { return 'tk_' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
function auth(req, res, next) {
  const h = req.headers.authorization || ''
  const tk = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (tokens.has(tk)) { req.user = tokens.get(tk); return next() }
  res.status(401).json({ error: '未登录或令牌失效' })
}

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now(), collections: db.COLLECTIONS }))

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {}
  if (USERS[username] && USERS[username] === password) {
    const role = username === 'admin' ? 'admin' : 'viewer'
    const token = makeToken()
    tokens.set(token, { user: username, role })
    return res.json({ token, user: username, role })
  }
  res.status(401).json({ error: '用户名或密码错误' })
})

// --- 集合 CRUD ---
function validColl(req, res, next) {
  if (db.COLLECTIONS.includes(req.params.coll)) return next()
  res.status(404).json({ error: '未知数据集合' })
}

app.get('/api/data/:coll', validColl, (req, res) => res.json(db.getCollection(req.params.coll)))

// 读公开, 写需登录(admin)
function writable(req, res, next) {
  if (req.user && req.user.role === 'admin') return next()
  res.status(403).json({ error: '需要管理员权限' })
}

app.put('/api/data/:coll', auth, writable, validColl, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: '需为数组' })
  res.json(db.setCollection(req.params.coll, req.body))
})
app.post('/api/data/:coll', auth, writable, validColl, (req, res) => {
  if (!req.body || !req.body.id) return res.status(400).json({ error: '缺少 id' })
  res.json(db.upsert(req.params.coll, req.body))
})
app.delete('/api/data/:coll/:id', auth, writable, validColl, (req, res) => {
  res.json(db.removeItem(req.params.coll, req.params.id))
})
app.post('/api/reset', auth, writable, (req, res) => res.json(db.resetAll()))

app.listen(PORT, () => console.log(`[psts-server] 运行于 http://localhost:${PORT}`))
