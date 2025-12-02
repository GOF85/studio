# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.0.0] - 2025-12-02

### Added

### Changed

### Fixed

### Removed

### Security

---

## [Migration: Logistics and Orders] - 2025-12-02

### Changed
- Expanded migration process to include missing logistics orders (Transporte, Decoración, Atípicos, Material, Hielo).
- Database: Added `data` (JSONB) column to order tables for flexible fields.
- Migration Script: Updated `src/lib/migrate-localStorage.ts` to read these orders from `localStorage` and save to Supabase.
- Store: Updated `use-data-store.ts` to read these data from Supabase instead of `localStorage`.

### Action Required
- Re-run migration from `/migration` page.

---

## [Fix: Image Management in Spaces] - 2025-12-02

### Fixed
- Images were uploaded to Supabase Storage but not saved to the database or displayed in the interface.
- TypeScript Type: Added `categoria?: 'foto' | 'plano'` property to `ImagenEspacio`.
- Espacios Service: Corrected `createEspacio()` and `updateEspacio()` to save/update images, and `mapEspacioFromDB()` to map correctly.
- Database Schema: Added `categoria` column to `espacios_imagenes` table.

### Action Required
- Execute SQL migration in Supabase (ALTER TABLE `espacios_imagenes` ADD COLUMN `categoria`...).

---
