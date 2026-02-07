export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const res = await fetch(path);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    },

    patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const res = await fetch(path, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const res = await fetch(path, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    }
};
