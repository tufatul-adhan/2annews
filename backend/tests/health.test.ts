import request from 'supertest';
import { app } from '../src/app.js';
describe('health endpoint', () => { it('returns application health', async () => { const response = await request(app).get('/health'); expect(response.status).toBe(200); expect(response.body.data.status).toBe('ok'); }); });
