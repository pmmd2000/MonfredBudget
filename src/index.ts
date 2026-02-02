import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
    DB: D1Database
    API_KEY: string
}

type Account = {
    id: number
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

// Header Auth
app.use('/*', async (c, next) => {
    const apiKey = c.req.header('X-API-Key')
    const validApiKey = c.env.API_KEY
    if (validApiKey && apiKey !== validApiKey) return c.json({ error: 'Unauthorized' }, 401)
    await next()
})

// Helper: Log History
async function logHistory(
    db: D1Database,
    transactionId: number,
    changeType: string,
    data: Partial<Transaction>
) {
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

// --- Accounts ---

app.get('/accounts', async (c) => {
    const { results } = await c.env.DB.prepare('SELECT * FROM accounts WHERE is_deleted = 0 ORDER BY created_at DESC').all<Account>()
    return c.json(results)
})

app.post('/accounts', async (c) => {
    const body = await c.req.json<{ name: string; initial_balance?: number }>()
    if (!body.name) return c.json({ error: 'Name is required' }, 400)
    const { success } = await c.env.DB.prepare('INSERT INTO accounts (name, balance) VALUES (?, ?)').bind(body.name, body.initial_balance || 0).run()
    return success ? c.json({ message: 'Account created' }, 201) : c.json({ error: 'Failed' }, 500)
})

app.delete('/accounts/:id', async (c) => {
    const id = c.req.param('id')
    const { success } = await c.env.DB.prepare('UPDATE accounts SET is_deleted = 1 WHERE id = ?').bind(id).run()
    return success ? c.json({ message: 'Account deleted' }) : c.json({ error: 'Failed' }, 500)
})

// --- Transactions (With History) ---

app.get('/transactions', async (c) => {
    const { accountId, startDate, endDate } = c.req.query()
    let query = 'SELECT * FROM transactions WHERE is_deleted = 0'
    const params: any[] = []

    if (accountId) { query += ' AND account_id = ?'; params.push(accountId) }
    if (startDate) { query += ' AND date >= ?'; params.push(Number(startDate)) }
    if (endDate) { query += ' AND date <= ?'; params.push(Number(endDate)) }
    query += ' ORDER BY date DESC'

    const { results } = await c.env.DB.prepare(query).bind(...params).all<Transaction>()
    return c.json(results)
})

app.post('/transactions', async (c) => {
    const body = await c.req.json<Omit<Transaction, 'id'>>()
    const { account_id, amount, type, date, description } = body

    if (!account_id || !date || !amount) return c.json({ error: 'Missing required fields' }, 400)

    const res = await c.env.DB.prepare(
        `INSERT INTO transactions (account_id, amount, type, date, description) VALUES (?, ?, ?, ?, ?) RETURNING id`
    ).bind(account_id, amount, type || 'EXPENSE', date, description || null).first<{ id: number }>()

    if (res && res.id) {
        // Log Creation
        await logHistory(c.env.DB, res.id, 'CREATE', { account_id, amount, type: type || 'EXPENSE', date, description, is_deleted: 0 })
        return c.json({ message: 'Transaction created', id: res.id }, 201)
    }
    return c.json({ error: 'Failed' }, 500)
})

app.put('/transactions/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json<Partial<Transaction>>()

    // 1. Get current state for partial updates or logging? 
    // Actually, for history, we want to log the *New* State.
    // So we fetch current, merge with body, then update.
    const current = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first<Transaction>()
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
    const id = Number(c.req.param('id'))
    const current = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first<Transaction>()
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
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare(
        'SELECT * FROM transaction_history WHERE transaction_id = ? ORDER BY changed_at DESC'
    ).bind(id).all<TransactionHistory>()
    return c.json(results)
})

app.post('/transactions/:id/revert', async (c) => {
    const id = Number(c.req.param('id'))
    const body = await c.req.json<{ history_id: number }>()

    // 1. Fetch the historical snapshot
    const snapshot = await c.env.DB.prepare(
        'SELECT * FROM transaction_history WHERE history_id = ? AND transaction_id = ?'
    ).bind(body.history_id, id).first<TransactionHistory>()

    if (!snapshot) return c.json({ error: 'History snapshot not found' }, 404)

    // 2. Restore Main Table
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
        // 3. Log the Restore Action as a new History event
        await logHistory(c.env.DB, id, 'RESTORE', snapshot)
        return c.json({ message: 'Restored successfully' })
    }
    return c.json({ error: 'Failed' }, 500)
})

// Sync
app.get('/sync', async (c) => {
    const accounts = await c.env.DB.prepare('SELECT * FROM accounts WHERE is_deleted = 0').all()
    const transactions = await c.env.DB.prepare('SELECT * FROM transactions WHERE is_deleted = 0').all()
    return c.json({ accounts: accounts.results, transactions: transactions.results })
})

export default app
