# Graph Report - apps/backend/src  (2026-09-09)

## Corpus Check
- Large corpus: 281 files · ~182,716 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1483 nodes · 2270 edges · 45 communities detected
- Extraction: 62% EXTRACTED · 38% INFERRED · 0% AMBIGUOUS · INFERRED: 857 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth, Notification & Tagihan|Auth, Notification & Tagihan]]
- [[_COMMUNITY_Master Data CRUD|Master Data CRUD]]
- [[_COMMUNITY_Admisi & Seleksi|Admisi & Seleksi]]
- [[_COMMUNITY_Bahan Kajian & OBE|Bahan Kajian & OBE]]
- [[_COMMUNITY_Auth & Password Reset|Auth & Password Reset]]
- [[_COMMUNITY_DB Scripts & Migration|DB Scripts & Migration]]
- [[_COMMUNITY_BAP & Perkuliahan|BAP & Perkuliahan]]
- [[_COMMUNITY_RBAC & Prodi Scope|RBAC & Prodi Scope]]
- [[_COMMUNITY_Apel & Kedisiplinan|Apel & Kedisiplinan]]
- [[_COMMUNITY_Apel Service & Presensi|Apel Service & Presensi]]
- [[_COMMUNITY_Admisi Admin|Admisi Admin]]
- [[_COMMUNITY_Kelas Kuliah & Nilai Praktik|Kelas Kuliah & Nilai Praktik]]
- [[_COMMUNITY_Feedback & Settings|Feedback & Settings]]
- [[_COMMUNITY_KHS & Penilaian|KHS & Penilaian]]
- [[_COMMUNITY_Changelog & Mahasiswa|Changelog & Mahasiswa]]
- [[_COMMUNITY_KRS & Rencana Studi|KRS & Rencana Studi]]
- [[_COMMUNITY_Bimbingan Akademik|Bimbingan Akademik]]
- [[_COMMUNITY_Pelanggaran & Kompensasi|Pelanggaran & Kompensasi]]
- [[_COMMUNITY_CPMK & CPL Mapping|CPMK & CPL Mapping]]
- [[_COMMUNITY_Kurikulum|Kurikulum]]
- [[_COMMUNITY_Visi Misi Prodi|Visi Misi Prodi]]
- [[_COMMUNITY_Kelas Kuliah Service|Kelas Kuliah Service]]
- [[_COMMUNITY_Profil Lulusan|Profil Lulusan]]
- [[_COMMUNITY_Mata Kuliah|Mata Kuliah]]
- [[_COMMUNITY_CPL|CPL]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 48|Community 48]]

## God Nodes (most connected - your core abstractions)
1. `hasRole()` - 207 edges
2. `AdmisiAdminController` - 48 edges
3. `AdmisiAdminService` - 46 edges
4. `isAdminOrProdi()` - 29 edges
5. `allowed()` - 27 edges
6. `ApelService` - 23 edges
7. `RombelPraktikumService` - 22 edges
8. `log()` - 22 edges
9. `ApelController` - 21 edges
10. `RombelPraktikumController` - 21 edges

## Surprising Connections (you probably didn't know these)
- `shutdown()` --calls--> `log()`  [INFERRED]
  index.ts → scripts/safe-migrate.ts
- `isPrivilegedScope()` --calls--> `hasRole()`  [INFERRED]
  utils/dosen-scope.ts → utils/role.ts
- `main()` --calls--> `log()`  [INFERRED]
  scripts/manage-superadmin.ts → scripts/safe-migrate.ts
- `main()` --calls--> `log()`  [INFERRED]
  scripts/reset-baseline.ts → scripts/safe-migrate.ts
- `migrateBimbinganRefactor()` --calls--> `log()`  [INFERRED]
  scripts/migrate-bimbingan-refactor.ts → scripts/safe-migrate.ts

## Communities

### Community 0 - "Auth, Notification & Tagihan"
Cohesion: 0.02
Nodes (13): NotificationController, UserController, main(), AdmisiAdminService, AdmisiService, CutiService, MahasiswaKeluarService, SsoService (+5 more)

### Community 1 - "Master Data CRUD"
Cohesion: 0.02
Nodes (21): AngkatanKurikulumController, AuditController, CutiController, DosenController, DosenPengajarController, KurikulumController, MahasiswaKeluarController, MataKuliahController (+13 more)

### Community 2 - "Admisi & Seleksi"
Cohesion: 0.03
Nodes (8): AdmisiController, MahasiswaController, BahanKajianService, CapaianCplService, CsvImportService, ObeReportService, formData(), parsePagination()

### Community 3 - "Bahan Kajian & OBE"
Cohesion: 0.03
Nodes (12): BahanKajianController, BahanKajianCplMappingController, CapaianCplController, CplController, CplMappingController, CplMataKuliahController, EvaluasiKurikulumController, MataKuliahBahanKajianController (+4 more)

### Community 4 - "Auth & Password Reset"
Cohesion: 0.04
Nodes (9): AuthController, AccountActivationService, hashToken(), AuthService, hashToken(), MataKuliahBahanKajianService, RombelPraktikumService, RpsService (+1 more)

### Community 5 - "DB Scripts & Migration"
Cohesion: 0.06
Nodes (52): auditLog(), getDbConfig(), main(), resolveBackupDir(), ts(), ensureEnums(), migrateBimbinganRefactor(), main() (+44 more)

### Community 6 - "BAP & Perkuliahan"
Cohesion: 0.05
Nodes (7): BapController, extractErrorMessage(), YudisiumController, BapService, YudisiumService, getBapKelasId(), guardKelasScope()

### Community 7 - "RBAC & Prodi Scope"
Cohesion: 0.05
Nodes (7): ProdiScopeController, RbacController, SystemController, CpmkService, ProdiScopeService, RbacService, isSuperAdminOrAdmin()

### Community 8 - "Apel & Kedisiplinan"
Cohesion: 0.06
Nodes (5): ApelController, KompensasiManualController, VerifikasiUnknownController, KompensasiManualService, allowed()

### Community 9 - "Apel Service & Presensi"
Cohesion: 0.05
Nodes (7): ApelService, getSuratUploadDir(), PresensiService, SystemParameterService, getAppTimezone(), getNowDateString(), getNowTimeString()

### Community 10 - "Admisi Admin"
Cohesion: 0.05
Nodes (1): AdmisiAdminController

### Community 11 - "Kelas Kuliah & Nilai Praktik"
Cohesion: 0.08
Nodes (15): KelasKuliahController, NilaiPraktikController, RpsController, getDosenAllowedKelasIds(), getDosenIdByEmail(), getRencanaEvaluasiMataKuliahId(), getRombelInfo(), getRpsMataKuliah() (+7 more)

### Community 12 - "Feedback & Settings"
Cohesion: 0.07
Nodes (4): FeedbackController, SettingsController, FeedbackService, SettingsService

### Community 13 - "KHS & Penilaian"
Cohesion: 0.07
Nodes (2): KhsController, KhsService

### Community 14 - "Changelog & Mahasiswa"
Cohesion: 0.1
Nodes (7): ChangelogService, findChangelogPath(), MahasiswaService, nowStamp(), readGitHash(), readPackageVersion(), VersionService

### Community 15 - "KRS & Rencana Studi"
Cohesion: 0.09
Nodes (2): KrsController, KrsService

### Community 16 - "Bimbingan Akademik"
Cohesion: 0.14
Nodes (2): BimbinganController, BimbinganService

### Community 17 - "Pelanggaran & Kompensasi"
Cohesion: 0.16
Nodes (5): PelanggaranController, safeErrorMessage(), hitungDegradasiNilaiSikap(), hitungPredikatTxly(), PelanggaranService

### Community 18 - "CPMK & CPL Mapping"
Cohesion: 0.13
Nodes (3): CpmkController, CpmkCplMappingController, isAdminOrProdiOrDosen()

### Community 19 - "Kurikulum"
Cohesion: 0.22
Nodes (1): KurikulumService

### Community 20 - "Visi Misi Prodi"
Cohesion: 0.18
Nodes (1): VisiMisiService

### Community 21 - "Kelas Kuliah Service"
Cohesion: 0.2
Nodes (1): KelasKuliahService

### Community 22 - "Profil Lulusan"
Cohesion: 0.22
Nodes (1): ProfilLulusanService

### Community 23 - "Mata Kuliah"
Cohesion: 0.22
Nodes (1): MataKuliahService

### Community 24 - "CPL"
Cohesion: 0.22
Nodes (1): CplService

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (1): ObeReportController

### Community 26 - "Community 26"
Cohesion: 0.43
Nodes (1): KategoriBimbinganController

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (1): SubCpmkService

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (1): AngkatanKurikulumService

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (1): DosenService

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (1): EvaluasiKurikulumService

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (1): CpmkCplMappingService

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (1): PasalPelanggaranService

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (1): ProdiService

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (1): PeriodeAkademikService

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (1): CapaianCpmkController

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (1): BahanKajianCplMappingService

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (1): CplMappingService

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (1): AuditService

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (1): KategoriBimbinganService

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (1): CapaianCpmkService

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (1): DosenPengajarService

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (1): NilaiPraktikService

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (1): PddiktiService

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (1): DbInitService

## Knowledge Gaps
- **Thin community `Admisi Admin`** (46 nodes): `AdmisiAdminController`, `.addProdiToSession()`, `.announceResults()`, `.createDocumentRequirement()`, `.createExamSchedule()`, `.createSelectionComponent()`, `.createSession()`, `.createVABank()`, `.deleteAnnouncement()`, `.deleteDocumentRequirement()`, `.deleteSelectionComponent()`, `.deleteVABank()`, `.editNIM()`, `.exportApplications()`, `.generateNIMBulk()`, `.getAllProdi()`, `.getAllSessions()`, `.getAllVABanks()`, `.getAnnouncements()`, `.getApplications()`, `.getDashboardStats()`, `.getExamSchedules()`, `.getPassedCandidates()`, `.getPayments()`, `.getPendingPayments()`, `.getSelectionComponents()`, `.getSessionDetail()`, `.inputScore()`, `.issueNIM()`, `.markDocsVerified()`, `.removeProdiFromSession()`, `.reopenApplication()`, `.toggleProdiActive()`, `.updateAppBiodata()`, `.updateApplicationStatus()`, `.updateAppProdi()`, `.updateDocumentRequirement()`, `.updateSession()`, `.updateVABank()`, `.validateNIM()`, `.verifyAllDocuments()`, `.verifyDocument()`, `.verifyPayment()`, `.verifyPaymentVA()`, `admisi-admin.controller.ts`, `.getReRegistrationPayments()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `KHS & Penilaian`** (33 nodes): `.getAkademikSummary()`, `KhsController`, `.deleteKonversi()`, `.deletePredikat()`, `.getAllKonversi()`, `.getAllPredikat()`, `.getByMhsIdAndPeriode()`, `.getDetailNilaiMK()`, `.getExamEligibility()`, `.getMatriksNilaiMK()`, `.getRekapNilai()`, `.getRekapPerProdi()`, `.getTranskrip()`, `.saveKonversi()`, `.savePredikat()`, `khs.controller.ts`, `.selfEnroll()`, `KhsService`, `.checkBebasTanggungan()`, `.deleteKonversi()`, `.deletePredikat()`, `.getAllKonversi()`, `.getAllPredikat()`, `.getDetailNilaiMataKuliah()`, `.getExamEligibility()`, `.getKhs()`, `.getMatriksNilaiMataKuliah()`, `.getRekapNilai()`, `.getRekapPerProdi()`, `.getTranskrip()`, `khs.service.ts`, `.getKompensasiDetail()`, `.getMahasiswaIdByEmail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `KRS & Rencana Studi`** (30 nodes): `KrsController`, `.approve()`, `.approveBatch()`, `.bulkCreate()`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getDosenIdByEmail()`, `.getMahasiswaIdByEmail()`, `.getPendingStudents()`, `.getRencanaStudi()`, `.getStats()`, `.update()`, `.validasiKrs()`, `krs.controller.ts`, `KrsService`, `.approveBatchKrs()`, `.approveKrs()`, `.bulkCreate()`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getPendingStudents()`, `.getRencanaStudi()`, `.getStats()`, `.update()`, `.validasiKrs()`, `krs.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Bimbingan Akademik`** (29 nodes): `BimbinganController`, `.addSesi()`, `.clearChat()`, `.createThreadMessage()`, `.deleteSesi()`, `.getByMhsId()`, `.getDosenIdByEmail()`, `.getMahasiswaIdByEmail()`, `.getMonitoring()`, `.getMonitoringLengkap()`, `.getRekapBkd()`, `.markAsRead()`, `.updateBimbingan()`, `.updateSesi()`, `bimbingan.controller.ts`, `BimbinganService`, `.addAttachment()`, `.addSesiBimbingan()`, `.addThreadMessage()`, `.clearChatThread()`, `.deleteSesiBimbingan()`, `.getActivePeriode()`, `.getBimbinganById()`, `.getMonitoringBimbingan()`, `.getMonitoringBimbinganLengkap()`, `.getOrCreateBimbingan()`, `.getRekapBimbinganDosen()`, `.notifyDosenPa()`, `bimbingan.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Kurikulum`** (13 nodes): `KurikulumService`, `.addMataKuliah()`, `.copyFromKurikulum()`, `.create()`, `.delete()`, `.duplicate()`, `.getAll()`, `.getById()`, `.importMkCsv()`, `.removeBatchMataKuliah()`, `.removeMataKuliah()`, `.update()`, `kurikulum.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Visi Misi Prodi`** (11 nodes): `visi-misi.service.ts`, `VisiMisiService`, `.create()`, `.delete()`, `.getAktif()`, `.getAll()`, `.getById()`, `.getTemplateCsv()`, `.import()`, `.setAktif()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Kelas Kuliah Service`** (10 nodes): `KelasKuliahService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getByMk()`, `.getTemplateCsv()`, `.import()`, `.update()`, `kelas-kuliah.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profil Lulusan`** (9 nodes): `ProfilLulusanService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getTemplateCsv()`, `.import()`, `.update()`, `profil-lulusan.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mata Kuliah`** (9 nodes): `MataKuliahService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getTemplateCsv()`, `.import()`, `.update()`, `mata-kuliah.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `CPL`** (9 nodes): `CplService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.getTemplateCsv()`, `.import()`, `.update()`, `cpl.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (8 nodes): `ObeReportController`, `.getBkMkCoverage()`, `.getCplAchievement()`, `.getCplCpmkCoverage()`, `.getCpmkAchievement()`, `.getEvaluasiRekap()`, `.getObeSummary()`, `obe-report.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (7 nodes): `KategoriBimbinganController`, `.create()`, `.delete()`, `.getAll()`, `.isAuthorized()`, `.update()`, `kategori-bimbingan.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (7 nodes): `SubCpmkService`, `.create()`, `.delete()`, `.getByCpmk()`, `.getById()`, `.update()`, `sub-cpmk.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (7 nodes): `AngkatanKurikulumService`, `.create()`, `.delete()`, `.getAktif()`, `.getAll()`, `.update()`, `angkatan-kurikulum.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (7 nodes): `DosenService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.update()`, `dosen.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (7 nodes): `EvaluasiKurikulumService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.update()`, `evaluasi-kurikulum.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (7 nodes): `CpmkCplMappingService`, `.create()`, `.delete()`, `.getAll()`, `.getMatriks()`, `.getMatriksPerCpmk()`, `cpmk-cpl-mapping.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (7 nodes): `PasalPelanggaranService`, `.bulkRemove()`, `.create()`, `.getAll()`, `.remove()`, `.update()`, `pasal.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (7 nodes): `ProdiService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.update()`, `prodi.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (7 nodes): `PeriodeAkademikService`, `.create()`, `.delete()`, `.getAll()`, `.getById()`, `.update()`, `periode-akademik.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (6 nodes): `CapaianCpmkController`, `.getByKelas()`, `.getByMahasiswa()`, `.getRekapPerCpmk()`, `.hitungPerKelas()`, `capaian-cpmk.controller.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (6 nodes): `BahanKajianCplMappingService`, `.create()`, `.delete()`, `.getAll()`, `.getMatriks()`, `bahan-kajian-cpl-mapping.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (6 nodes): `CplMappingService`, `.create()`, `.delete()`, `.getAll()`, `.getMatriks()`, `cpl-mapping.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (6 nodes): `AuditService`, `.exportCsv()`, `.getAll()`, `.getById()`, `.log()`, `audit.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (6 nodes): `KategoriBimbinganService`, `.create()`, `.delete()`, `.getAll()`, `.update()`, `kategori-bimbingan.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (6 nodes): `CapaianCpmkService`, `.getByKelas()`, `.getByMahasiswa()`, `.getRekapPerCpmk()`, `.hitungPerKelas()`, `capaian-cpmk.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `DosenPengajarService`, `.create()`, `.delete()`, `.getAll()`, `dosen-pengajar.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (4 nodes): `NilaiPraktikService`, `.getNilaiByRombel()`, `.saveNilaiBulk()`, `nilai-praktik.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `PddiktiService`, `.getStats()`, `.syncAll()`, `pddikti.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `DbInitService`, `.ensureTablesExist()`, `db-init.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `hasRole()` connect `Master Data CRUD` to `Auth, Notification & Tagihan`, `Admisi & Seleksi`, `Bahan Kajian & OBE`, `Community 35`, `BAP & Perkuliahan`, `RBAC & Prodi Scope`, `Apel & Kedisiplinan`, `Apel Service & Presensi`, `Kelas Kuliah & Nilai Praktik`, `Feedback & Settings`, `KHS & Penilaian`, `KRS & Rencana Studi`, `Bimbingan Akademik`, `Pelanggaran & Kompensasi`, `CPMK & CPL Mapping`?**
  _High betweenness centrality (0.362) - this node is a cross-community bridge._
- **Why does `log()` connect `DB Scripts & Migration` to `Auth, Notification & Tagihan`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `main()` connect `Auth, Notification & Tagihan` to `DB Scripts & Migration`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 201 inferred relationships involving `hasRole()` (e.g. with `.getAll()` and `.getById()`) actually correct?**
  _`hasRole()` has 201 INFERRED edges - model-reasoned connections that need verification._
- **Are the 27 inferred relationships involving `isAdminOrProdi()` (e.g. with `.create()` and `.update()`) actually correct?**
  _`isAdminOrProdi()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 26 inferred relationships involving `allowed()` (e.g. with `.createKelompok()` and `.updateKelompok()`) actually correct?**
  _`allowed()` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Should `Auth, Notification & Tagihan` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._