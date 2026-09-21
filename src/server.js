/**
 * 上海如静知华信息科技有限公司 https://www.zhuatech.cn/
 * 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HotelTvService, createDemoService } from './domain.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.resolve(process.env.HOTEL_TV_DATA_FILE || './data/hotel-tv.json');
const apiKey = process.env.HOTEL_TV_API_KEY || 'zhuatech-demo-key';
const port = Number(process.env.PORT || 18201);

/** 读取持久化快照。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
function load() { try { return new HotelTvService(JSON.parse(fs.readFileSync(dataFile, 'utf8'))); } catch { return createDemoService(); } }
const service = load();
const persist = () => { fs.mkdirSync(path.dirname(dataFile), { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(service.dump(), null, 2)); };
persist();

const send = (res, code, body, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const parse = async (req) => { const chunks = []; for await (const c of req) { chunks.push(c); if (chunks.reduce((n, x) => n + x.length, 0) > 1_048_576) throw new Error('请求体超过1MB'); } return chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}; };
const pages = { '/': 'console.html', '/console': 'console.html', '/tv': 'tv.html', '/styles.css': 'styles.css' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/favicon.ico') return send(res, 204, '');
    if (pages[url.pathname]) return send(res, 200, fs.readFileSync(path.join(root, '..', 'public', pages[url.pathname]), 'utf8'), url.pathname.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8');
    if (url.pathname === '/health') return send(res, 200, { status: 'UP', service: 'zhuatech-hotel-tv' });
    if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'NOT_FOUND' });
    if (req.headers['x-api-key'] !== apiKey && req.headers['x-device-token'] === undefined) return send(res, 401, { error: 'UNAUTHORIZED' });
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await parse(req) : {};
    const actor = req.headers['x-actor'] || 'api-user';
    let result;
    if (req.method === 'GET' && url.pathname === '/api/dashboard') result = service.dashboard();
    else if (req.method === 'POST' && url.pathname === '/api/properties') result = service.createProperty(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/rooms') result = service.createRoom(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/devices') result = service.pairDevice(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/contents') result = service.publishContent(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/stays') result = service.checkIn(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/service-orders') result = service.requestService(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/playbacks') result = service.startPlayback(body, actor);
    else if (req.method === 'POST' && url.pathname === '/api/broadcasts') result = service.emergencyBroadcast(body, actor);
    else {
      const heartbeat = url.pathname.match(/^\/api\/devices\/([^/]+)\/heartbeat$/);
      const checkout = url.pathname.match(/^\/api\/stays\/([^/]+)\/checkout$/);
      const action = url.pathname.match(/^\/api\/service-orders\/([^/]+)\/(accept|complete)$/);
      if (req.method === 'POST' && heartbeat) result = service.heartbeat(heartbeat[1], body);
      else if (req.method === 'POST' && checkout) result = service.checkOut(checkout[1], actor);
      else if (req.method === 'POST' && action) result = service.transitionService(action[1], action[2], body, actor);
      else return send(res, 404, { error: 'NOT_FOUND' });
    }
    if (req.method !== 'GET') persist();
    return send(res, req.method === 'POST' ? 201 : 200, result);
  } catch (error) { return send(res, 400, { error: 'BUSINESS_ERROR', message: error.message }); }
}).listen(port, () => console.log(`ZhuaTech Hotel TV running at http://127.0.0.1:${port}`));
