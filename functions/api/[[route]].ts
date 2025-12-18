
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

interface D1Database {
  prepare(query: string): any;
}

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// --- TEAMS ---
app.post('/api/teams', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO teams (id, account_id, name, goal) VALUES (?, ?, ?, ?)')
        .bind(data.id, data.accountId, data.name, data.goal).run();
    return c.json({ success: true });
});

app.patch('/api/teams/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    
    if (data.name !== undefined && data.goal !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET name = ?, goal = ? WHERE id = ?').bind(data.name, data.goal, id).run();
    } else if (data.name !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET name = ? WHERE id = ?').bind(data.name, id).run();
    } else if (data.goal !== undefined) {
        await c.env.DB.prepare('UPDATE teams SET goal = ? WHERE id = ?').bind(data.goal, id).run();
    }
    
    return c.json({ success: true });
});

app.delete('/api/teams/:id', async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE users SET team_id = NULL WHERE team_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM teams WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// --- USERS ---
app.post('/api/users', async (c) => {
    const data = await c.req.json() as any;
    await c.env.DB.prepare('INSERT INTO users (id, account_id, name, email, role, team_id, avatar, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(data.id, data.accountId, data.name, data.email, data.role, data.teamId, data.avatar, data.status, data.joinedAt).run();
    return c.json({ success: true });
});

app.patch('/api/users/:id', async (c) => {
    const id = c.req.param('id');
    const data = await c.req.json() as any;
    const fields = Object.keys(data);
    const sets = fields.map(f => `${f.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`).join(', ');
    const values = Object.values(data);
    
    await c.env.DB.prepare(`UPDATE users SET ${sets} WHERE id = ?`).bind(...values, id).run();
    return c.json({ success: true });
});

export const onRequest = handle(app);
