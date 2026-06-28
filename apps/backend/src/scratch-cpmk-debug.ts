import { app } from './app';
import { getAuthToken } from './__tests__/test-helper';

async function run() {
  const token = await getAuthToken('dosen@simak.id', 'dosen');
  console.log('Token:', token);

  // 1. Get Kelas
  const resKelas = await app.handle(
    new Request('http://localhost/kelas-kuliah', {
      headers: { Authorization: `Bearer ${token}` }
    })
  );
  const dataKelas = await resKelas.json();
  console.log('Kelas result:', JSON.stringify(dataKelas, null, 2));

  // 2. Get CPMK
  if (dataKelas.data && dataKelas.data.length > 0) {
    const mkId = dataKelas.data[0].mataKuliahId;
    console.log('Mata Kuliah ID:', mkId);
    const resCpmk = await app.handle(
      new Request(`http://localhost/cpmk/mata-kuliah/${mkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
    const dataCpmk = await resCpmk.json();
    console.log('CPMK result:', JSON.stringify(dataCpmk, null, 2));
  }
}

run().catch(console.error);
