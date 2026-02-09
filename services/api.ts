
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            console.debug(`[API GET] Requesting: ${url}`);
            const res = await fetch(url);
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    errorMsg = errBody.error || errorMsg;
                } catch (e) {}
                console.error(`[API GET ERROR] ${url}:`, errorMsg);
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[NETWORK ERROR] GET ${url}:`, error.message);
            throw error;
        }
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            console.debug(`[API POST] Requesting: ${url}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    errorMsg = errBody.error || errorMsg;
                } catch (e) {}
                console.error(`[API POST ERROR] ${url}:`, errorMsg);
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[NETWORK ERROR] POST ${url}:`, error.message);
            throw error;
        }
    },

    patch: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            console.debug(`[API PATCH] Requesting: ${url}`);
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    errorMsg = errBody.error || errorMsg;
                } catch (e) {}
                console.error(`[API PATCH ERROR] ${url}:`, errorMsg);
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[NETWORK ERROR] PATCH ${url}:`, error.message);
            throw error;
        }
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `/api${cleanEndpoint}`;
        try {
            console.debug(`[API DELETE] Requesting: ${url}`);
            const res = await fetch(url, {
                method: 'DELETE',
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    errorMsg = errBody.error || errorMsg;
                } catch (e) {}
                console.error(`[API DELETE ERROR] ${url}:`, errorMsg);
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[NETWORK ERROR] DELETE ${url}:`, error.message);
            throw error;
        }
    }
};
