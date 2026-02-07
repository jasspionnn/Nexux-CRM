export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const res = await fetch(`/api${cleanEndpoint}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const res = await fetch(`/api${cleanEndpoint}`, {
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
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const res = await fetch(`/api${cleanEndpoint}`, {
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
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const res = await fetch(`/api${cleanEndpoint}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Erro API: ${res.status}`);
        }
        return res.json();
    }
};