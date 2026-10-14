import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotFoundPage } from './pages/AppPages';

test('menampilkan tautan kembali pada halaman yang tidak ditemukan', () => {
  render(<BrowserRouter><NotFoundPage /></BrowserRouter>);
  expect(screen.getByRole('link', { name: /kembali ke beranda/i }).getAttribute('href')).toBe('/');
});
