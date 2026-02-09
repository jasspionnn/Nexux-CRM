// Removido para evitar shadowing do roteador global [[route]].ts
// O Cloudflare Pages irá agora direcionar /api/users para [[route]].ts automaticamente
export { onRequest } from './[[route]].ts';