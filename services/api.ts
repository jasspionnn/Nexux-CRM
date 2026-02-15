
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Erro API: ${res.status}`);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[GET ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Erro API: ${res.status}`);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[POST ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Erro API: ${res.status}`);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[PATCH ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            const res = await fetch(url, { method: 'DELETE' });
            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Erro API: ${res.status}`);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[DELETE ERROR] ${url}:`, error.message);
            throw error;
        }
    }
};
