
// Fetch Wrapper para facilitar chamadas API
// No Cloudflare Pages, chamadas para /api/... são roteadas automaticamente para as Functions

export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`/api${endpoint}`);
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const res = await fetch(`/api${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },

    patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const res = await fetch(`/api${endpoint}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const res = await fetch(`/api${endpoint}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    }
};
