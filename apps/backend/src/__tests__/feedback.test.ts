import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../app';
import { systemSettings } from '../models/schema';
import { db } from '../utils/db';
import { clearDatabase, getAuthToken } from './test-helper';

async function createFeedback(token: string, overrides: Record<string, unknown> = {}) {
  const res = await app.handle(
    new Request('http://localhost/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        kategori: 'usul_pengembangan',
        judul: 'Tambah fitur export PDF',
        pesan: 'Mohon tambahkan fitur export PDF untuk KHS',
        rating: 4,
        ...overrides,
      }),
    }),
  );
  return res;
}

describe('Feedback & Evaluasi Sistem API', () => {
  let adminToken: string;
  let dosenToken: string;
  let mhsToken: string;

  beforeEach(async () => {
    await clearDatabase();
    adminToken = await getAuthToken('admin-fb@test.com', 'admin');
    dosenToken = await getAuthToken('dosen-fb@test.com', 'dosen');
    mhsToken = await getAuthToken('mhs-fb@test.com', 'mahasiswa');

    // Pastikan modul feedback aktif (setting dapat berubah dari test lain di DB bersama).
    await db
      .insert(systemSettings)
      .values({
        key: 'feature_feedback_enabled',
        value: 'true',
        paramType: 'boolean',
        description: 'Enable feedback module',
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: 'true' },
      });
  });

  it('pengguna terautentikasi harus dapat mengirim masukan/evaluasi', async () => {
    const res = await createFeedback(mhsToken);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBeDefined();
    expect(json.judul).toBe('Tambah fitur export PDF');
    expect(json.status).toBe('pending');
  });

  it('getAll harus mengembalikan respons terpaginasi dengan semua feedback untuk semua user', async () => {
    await createFeedback(mhsToken);
    await createFeedback(dosenToken, { judul: 'Usulan dari dosen', pesan: 'Perlu perbaikan jadwal' });

    const res = await app.handle(
      new Request('http://localhost/feedback?page=1&limit=10&sortBy=createdAt&sortOrder=desc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeArray();
    expect(json.data.length).toBe(2);
    expect(json.meta.total).toBe(2);
    expect(json.meta.totalPages).toBe(1);
  });

  it('sortBy yang tidak valid (SQL injection attempt) harus ditolak', async () => {
    await createFeedback(mhsToken);

    const res = await app.handle(
      new Request('http://localhost/feedback?sortBy=createdAt%3B%20DROP%20TABLE%20system_feedback&sortOrder=asc', {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    // Elysia query schema (whitelist union) menolak sortBy non-literal.
    expect(res.status).toBe(422);

    const listRes = await app.handle(
      new Request('http://localhost/feedback', {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(listRes.status).toBe(200);
    const json = await listRes.json();
    expect(json.data).toBeArray();
    expect(json.data.length).toBe(1);
  });

  it('getById harus mengembalikan detail dengan likeCount, commentCount, isLiked, dan comments', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const detailRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json();
    expect(detail.id).toBe(created.id);
    expect(detail.likeCount).toBe(0);
    expect(detail.commentCount).toBe(0);
    expect(detail.isLiked).toBe(false);
    expect(detail.comments).toBeArray();
  });

  it('toggleLike harus like dan unlike dengan hitungan yang benar', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    // Like oleh mahasiswa
    const likeRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(likeRes.status).toBe(200);
    const likeJson = await likeRes.json();
    expect(likeJson.liked).toBe(true);
    expect(likeJson.likeCount).toBe(1);

    // Detail menampilkan isLiked true
    const detailRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    const detail = await detailRes.json();
    expect(detail.isLiked).toBe(true);
    expect(detail.likeCount).toBe(1);

    // Unlike
    const unlikeRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    const unlikeJson = await unlikeRes.json();
    expect(unlikeJson.liked).toBe(false);
    expect(unlikeJson.likeCount).toBe(0);
  });

  it('tambah komentar harus berhasil dan muncul di detail', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const commentRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({ pesan: 'Setuju, fitur ini sangat berguna.' }),
      }),
    );
    expect(commentRes.status).toBe(200);
    const comment = await commentRes.json();
    expect(comment.pesan).toBe('Setuju, fitur ini sangat berguna.');

    const detailRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    const detail = await detailRes.json();
    expect(detail.comments).toHaveLength(1);
    expect(detail.comments[0].pesan).toBe('Setuju, fitur ini sangat berguna.');
    expect(detail.commentCount).toBe(1);
  });

  it('pengirim dapat mengedit dan menghapus feedback sendiri', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const updateRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mhsToken}`,
        },
        body: JSON.stringify({ judul: 'Judul diperbarui', pesan: 'Isi diperbarui', rating: 5 }),
      }),
    );
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.judul).toBe('Judul diperbarui');
    expect(updated.rating).toBe(5);

    const deleteRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mhsToken}` },
      }),
    );
    expect(deleteRes.status).toBe(200);
    const delJson = await deleteRes.json();
    expect(delJson.success).toBe(true);

    // Sudah tidak ada
    const detailRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(detailRes.status).toBe(404);
  });

  it('non-pengirim dan non-admin dilarang mengedit atau menghapus feedback', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const updateRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dosenToken}`,
        },
        body: JSON.stringify({ judul: 'Usaha mengedit' }),
      }),
    );
    expect(updateRes.status).toBe(403);

    const deleteRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${dosenToken}` },
      }),
    );
    expect(deleteRes.status).toBe(403);
  });

  it('admin dapat mengedit dan menghapus feedback siapa pun', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const updateRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ judul: 'Diedit admin', pesan: 'Isi diedit admin' }),
      }),
    );
    expect(updateRes.status).toBe(200);

    const deleteRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }),
    );
    expect(deleteRes.status).toBe(200);
  });

  it('updateStatus hanya untuk admin', async () => {
    const createRes = await createFeedback(mhsToken);
    const created = await createRes.json();

    const updateRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: 'implemented' }),
      }),
    );
    expect(updateRes.status).toBe(200);

    const forbiddenRes = await app.handle(
      new Request(`http://localhost/feedback/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mhsToken}`,
        },
        body: JSON.stringify({ status: 'implemented' }),
      }),
    );
    expect(forbiddenRes.status).toBe(403);
  });
});
