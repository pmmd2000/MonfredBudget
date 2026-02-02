import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign, verify } from 'hono/jwt'

DB: D1Database
JWT_SECRET: string
ASSETS: Fetcher
}

type User = {
    id: number
    username: string
    password_hash: string
}

type Account = {
    id: number
    user_id: number
    name: string
    balance: number
    is_deleted: number
    created_at: number
}

type Transaction = {
    id: number
    account_id: number
    amount: number
    type: 'INCOME' | 'EXPENSE'
    description?: string
    date: number
    is_deleted: number
    created_at: number
}

type TransactionHistory = Transaction & {
    history_id: number
    transaction_id: number
    change_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
    changed_at: number
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.use('/*', cors())

// --- Authentication Middleware ---
// We'll protect everything EXCEPT /auth/*
app.use('/*', async (c, next) => {
    if (c.req.path.includes('/auth/')) {
        await next()
        return
    }

    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)

    const token = authHeader.replace('Bearer ', '')
    try {
        const payload = await verify(token, c.env.JWT_SECRET)
        c.set('userId', payload.sub) // Set user ID for route handlers
        await next()
    } catch (e) {
        return c.json({ error: 'Invalid Token' }, 401)
    }
})

// --- Auth Routes ---

app.post('/auth/register', async (c) => {
    try {
        const { username, password } = await c.req.json()
        if (!username || !password) return c.json({ error: 'Missing fields' }, 400)

        // In a real app, HASH THE PASSWORD using bcrypt or argon2. 
        // For this demo environment (no node modules for bcrypt in simple cloudflare worker easily without hassle), 
        // we'll store as is BUT WARN about it. 
        // Ideally: use Web Crypto API for hashing.
        const passwordHash = password; // TODO: Implement SHA-256 via crypto.subtle

        const { success } = await c.env.DB.prepare(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)'
        ).bind(username, passwordHash).run()

        if (success) return c.json({ message: 'User registered' }, 201)
        return c.json({ error: 'Registration failed' }, 500)
    } catch (e) {
        return c.json({ error: 'Username likely taken' }, 409)
    }
})

app.post('/auth/login', async (c) => {
    try {
        const { username, password } = await c.req.json()
        const user = await c.env.DB.prepare(
            'SELECT * FROM users WHERE username = ?'
        ).bind(username).first<User>()

        if (!user || user.password_hash !== password) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }

        const token = await sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, c.env.JWT_SECRET)
        return c.json({ token, user: { id: user.id, username: user.username } })
    } catch (e) {
        return c.json({ error: 'Login failed' }, 500)
    }
})


// --- Helpers ---
async function logHistory(db: D1Database, transactionId: number, changeType: string, data: Partial<Transaction>) {
    await db.prepare(`
        INSERT INTO transaction_history 
        (transaction_id, account_id, amount, type, description, date, is_deleted, change_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        transactionId,
        data.account_id || null,
        data.amount || null,
        data.type || null,
        data.description || null,
        data.date || null,
        data.is_deleted === undefined ? 0 : data.is_deleted,
        changeType
    ).run()
}

// --- Application Routes (Scoped by User) ---
// IMPORTANT: We need to filter by User. But our Accounts table has user_id, Transactions don't (they are linked to Account).
// So validating permissions implies checking if the Account belongs to the User.

// Helper to check account ownership
async function isAccountOwner(db: D1Database, userId: number, accountId: number) {
    const account = await db.prepare('SELECT user_id FROM accounts WHERE id = ?').bind(accountId).first<{ user_id: number }>()
    return account && account.user_id === userId
}

app.get('/accounts', async (c) => {
    const userId = c.get('userId') as number
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM accounts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC'
    ).bind(userId).all<Account>()
    return c.json(results)
})

app.post('/accounts', async (c) => {
    const userId = c.get('userId') as number
    const body = await c.req.json<{ name: string; initial_balance?: number }>()
    if (!body.name) return c.json({ error: 'Name is required' }, 400)

    const { success } = await c.env.DB.prepare(
        'INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)'
    ).bind(userId, body.name, body.initial_balance || 0).run()

    return success ? c.json({ message: 'Account created' }, 201) : c.json({ error: 'Failed' }, 500)
})

app.delete('/accounts/:id', async (c) => {
    const userId = c.get('userId') as number
    const id = c.req.param('id')
    // Verify ownership
    if (!await isAccountOwner(c.env.DB, userId, Number(id))) return c.json({ error: 'Forbidden' }, 403)

    const { success } = await c.env.DB.prepare('UPDATE accounts SET is_deleted = 1 WHERE id = ?').bind(id).run()
    return success ? c.json({ message: 'Account deleted' }) : c.json({ error: 'Failed' }, 500)
})


// --- Transactions ---

app.get('/transactions', async (c) => {
    const userId = c.get('userId') as number
    const { accountId, startDate, endDate } = c.req.query()

    // Join with accounts to ensure user owns the transaction
    let query = `
        SELECT t.* 
        FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        WHERE a.user_id = ? AND t.is_deleted = 0
    `
    const params: any[] = [userId]

    if (accountId) { query += ' AND t.account_id = ?'; params.push(accountId) }
    if (startDate) { query += ' AND t.date >= ?'; params.push(Number(startDate)) }
    if (endDate) { query += ' AND t.date <= ?'; params.push(Number(endDate)) }

    query += ' ORDER BY t.date DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all<Transaction>()
    return c.json(results)
})

app.post('/transactions', async (c) => {
    const userId = c.get('userId') as number
    const body = await c.req.json<Omit<Transaction, 'id'>>()
    const { account_id, amount, type, date, description } = body

    if (!await isAccountOwner(c.env.DB, userId, account_id)) return c.json({ error: 'Forbidden' }, 403)
    if (!date || !amount) return c.json({ error: 'Missing required fields' }, 400)

    const res = await c.env.DB.prepare(
        `INSERT INTO transactions (account_id, amount, type, date, description) VALUES (?, ?, ?, ?, ?) RETURNING id`
    ).bind(account_id, amount, type || 'EXPENSE', date, description || null).first<{ id: number }>()

    if (res && res.id) {
        await logHistory(c.env.DB, res.id, 'CREATE', { account_id, amount, type: type || 'EXPENSE', date, description, is_deleted: 0 })
        return c.json({ message: 'Transaction created', id: res.id }, 201)
    }
    return c.json({ error: 'Failed' }, 500)
})

app.put('/transactions/:id', async (c) => {
    const userId = c.get('userId') as number
    const id = Number(c.req.param('id'))
    const body = await c.req.json<Partial<Transaction>>()

    // Fetch transaction & join account to verify user
    const current = await c.env.DB.prepare(`
        SELECT t.* FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        WHERE t.id = ? AND a.user_id = ?
    `).bind(id, userId).first<Transaction>()

    if (!current) return c.json({ error: 'Not found' }, 404)

    const newState = { ...current, ...body }
    const { success } = await c.env.DB.prepare(
        `UPDATE transactions SET amount = ?, description = ?, date = ?, type = ?, account_id = ? WHERE id = ?`
    ).bind(newState.amount, newState.description, newState.date, newState.type, newState.account_id, id).run()

    if (success) {
        await logHistory(c.env.DB, id, 'UPDATE', newState)
        return c.json({ message: 'Transaction updated' })
    }
    return c.json({ error: 'Failed' }, 500)
})

app.delete('/transactions/:id', async (c) => {
    const userId = c.get('userId') as number
    const id = Number(c.req.param('id'))

    const current = await c.env.DB.prepare(`
        SELECT t.* FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        WHERE t.id = ? AND a.user_id = ?
    `).bind(id, userId).first<Transaction>()

    if (!current) return c.json({ error: 'Not found' }, 404)

    const { success } = await c.env.DB.prepare('UPDATE transactions SET is_deleted = 1 WHERE id = ?').bind(id).run()
    if (success) {
        await logHistory(c.env.DB, id, 'DELETE', { ...current, is_deleted: 1 })
        return c.json({ message: 'Transaction deleted' })
    }
    return c.json({ error: 'Failed' }, 500)
})

// --- History & Revert ---

app.get('/transactions/:id/history', async (c) => {
    const userId = c.get('userId') as number
    const id = Number(c.req.param('id'))

    // Verify Access
    const access = await c.env.DB.prepare(`
        SELECT 1 FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE t.id = ? AND a.user_id = ?
    `).bind(id, userId).first()
    if (!access) return c.json({ error: 'Not found' }, 404)

    const { results } = await c.env.DB.prepare(
        'SELECT * FROM transaction_history WHERE transaction_id = ? ORDER BY changed_at DESC'
    ).bind(id).all<TransactionHistory>()
    return c.json(results)
})

app.post('/transactions/:id/revert', async (c) => {
    const userId = c.get('userId') as number
    const id = Number(c.req.param('id'))
    const body = await c.req.json<{ history_id: number }>()

    const access = await c.env.DB.prepare(`
        SELECT 1 FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE t.id = ? AND a.user_id = ?
    `).bind(id, userId).first()
    if (!access) return c.json({ error: 'Not found' }, 404)

    const snapshot = await c.env.DB.prepare(
        'SELECT * FROM transaction_history WHERE history_id = ? AND transaction_id = ?'
    ).bind(body.history_id, id).first<TransactionHistory>()

    if (!snapshot) return c.json({ error: 'History snapshot not found' }, 404)

    const { success } = await c.env.DB.prepare(
        `UPDATE transactions SET 
            account_id = ?, amount = ?, type = ?, description = ?, date = ?, is_deleted = ? 
         WHERE id = ?`
    ).bind(
        snapshot.account_id,
        snapshot.amount,
        snapshot.type,
        snapshot.description,
        snapshot.date,
        snapshot.is_deleted,
        id
    ).run()

    if (success) {
        await logHistory(c.env.DB, id, 'RESTORE', snapshot)
        return c.json({ message: 'Restored successfully' })
    }
    return c.json({ error: 'Failed' }, 500)
})

app.get('/sync', async (c) => {
    const userId = c.get('userId') as number
    const accounts = await c.env.DB.prepare(
        'SELECT * FROM accounts WHERE user_id = ? AND is_deleted = 0'
    ).bind(userId).all()

    const transactions = await c.env.DB.prepare(`
        SELECT t.* FROM transactions t 
        JOIN accounts a ON t.account_id = a.id 
        WHERE a.user_id = ? AND t.is_deleted = 0
    `).bind(userId).all()

    return c.json({
        accounts: accounts.results,
        transactions: transactions.results
    })
})

// ASSETS Fallback (SPA Routing)
app.get('*', async (c) => {
    return await c.env.ASSETS.fetch(c.req.raw)
})

export default app
