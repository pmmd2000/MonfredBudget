import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
    DB: D1Database
    API_KEY: string
}

type Transaction = {
    id: number
    account_name: string
    deposit_amount: number
    withdrawal_amount: number
    transaction_date: number
    description?: string
    created_at: number
}

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.use('/*', cors())

// Authentication Middleware
app.use('/*', async (c, next) => {
    const apiKey = c.req.header('X-API-Key')
    const validApiKey = c.env.API_KEY

    // If no API_KEY is set in environment, allow all (dev mode safety or initial setup warning)
    // BUT for security, we should enforce it if the env var exists.
    if (validApiKey && apiKey !== validApiKey) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    await next()
})

app.get('/transactions', async (c) => {
    const { startDate, endDate } = c.req.query()

    let query = 'SELECT * FROM transactions'
    const params: any[] = []
    const conditions: string[] = []

    if (startDate) {
        conditions.push('transaction_date >= ?')
        params.push(Number(startDate))
    }

    if (endDate) {
        conditions.push('transaction_date <= ?')
        params.push(Number(endDate))
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY transaction_date DESC'

    try {
        const { results } = await c.env.DB.prepare(query).bind(...params).all<Transaction>()
        return c.json(results)
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
    }
})

app.post('/transactions', async (c) => {
    try {
        const body = await c.req.json<Omit<Transaction, 'id' | 'created_at'>>()
        const { account_name, deposit_amount, withdrawal_amount, transaction_date, description } = body

        if (!account_name || transaction_date === undefined) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        const { success } = await c.env.DB.prepare(
            `INSERT INTO transactions (account_name, deposit_amount, withdrawal_amount, transaction_date, description) VALUES (?, ?, ?, ?, ?)`
        ).bind(account_name, deposit_amount || 0, withdrawal_amount || 0, transaction_date, description || null).run()

        if (success) {
            return c.json({ message: 'Transaction created successfully' }, 201)
        } else {
            return c.json({ error: 'Failed to create transaction' }, 500)
        }
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
    }
})

app.delete('/transactions/:id', async (c) => {
    const id = c.req.param('id')
    try {
        const { success } = await c.env.DB.prepare('DELETE FROM transactions WHERE id = ?').bind(id).run()
        if (success) {
            return c.json({ message: 'Transaction deleted' })
        } else {
            return c.json({ error: 'Failed to delete transaction' }, 500)
        }
    } catch (e) {
        return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
    }
})

export default app
