
export const api = {
    get: async <T>(endpoint: string): Promise<T> => {
        const url = `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[API GET ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    post: async <T>(endpoint: string, data: unknown): Promise<T> => {
        const url = `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[API POST ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    patch: async <T>(endpoint: string, idOrData: string | any, data?: any): Promise<T> => {
        let url = '';
        let payload = null;

        if (typeof idOrData === 'string' && data !== undefined) {
             const cleanPath = idOrData.startsWith('/') ? idOrData : `/${idOrData}`;
             url = `/api${cleanPath}`;
             payload = data;
        } else {
             const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
             url = `/api${cleanPath}`;
             payload = idOrData;
        }

        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[API PATCH ERROR] ${url}:`, error.message);
            throw error;
        }
    },

    delete: async <T>(endpoint: string): Promise<T> => {
        const url = `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
        try {
            const res = await fetch(url, {
                method: 'DELETE',
            });
            if (!res.ok) {
                let errorMsg = `Erro API: ${res.status} ${res.statusText}`;
                try {
                    const errBody = await res.json();
                    if (errBody && errBody.error) errorMsg = errBody.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            return res.json();
        } catch (error: any) {
            console.error(`[API DELETE ERROR] ${url}:`, error.message);
            throw error;
        }
    }
};
