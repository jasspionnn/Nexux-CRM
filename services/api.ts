
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        // O endpoint já deve começar com / (ex: /auth/login)
        const res = await fetch(`/api${endpoint}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const res = await fetch(`/api${endpoint}`, {
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
        const res = await fetch(`/api${endpoint}`, {
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
        const res = await fetch(`/api${endpoint}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    }
};
