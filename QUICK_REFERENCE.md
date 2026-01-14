# ⚡ QUICK REFERENCE - FK FIX

## The Issue
```
User: Click "Enviar Sub-Pedidos"
Expected: Sub-orders consolidated, appear in "Consolidados" tab
Actual: ❌ FK constraint error, nothing happens
```

## The Fix
```
Added UUID detection in API
When UUID detected:
  1. Query eventos for numero_expediente
  2. Use numero_expediente for all DB ops
  3. FK constraint satisfied ✅
```

## Files Changed
- `hooks/use-pedidos-enviados.ts` - Removed unnecessary resolution
- `app/api/pedidos/generate-pdf/route.ts` - Added UUID conversion

## Quick Test
```
1. npm run dev (if not running)
2. F12 → Console tab
3. Go to /os/[numero]/alquiler
4. Click "Enviar Sub-Pedidos"
5. Select order, submit
6. Watch console for ✅ logs
7. Check "Consolidados" tab
```

## Expected Result
```
✅ PASO 1: ✅ numero_expediente encontrado: 2025-12345
✅ PASO 5: ✅ Creado exitosamente (ID: xxx)
✅ Toast: "Pedidos consolidados" (green)
✅ Order appears in Consolidados tab
```

## If It Fails
```
Check PASO 1 logs:
- Missing "numero_expediente encontrado"? UUID lookup failed
- Showing UUID instead of "2025-12345"? Conversion didn't work

Check PASO 5 logs:
- Still showing UUID as os_id? Conversion didn't apply
- Error message? Check full error text

Still stuck? 
→ Read TESTING_READY.md troubleshooting section
```

## Status
✅ Code Complete  
✅ Server Running (port 3001)  
✅ Documentation Complete  
⏳ Awaiting Test Confirmation  

## Links
- **Quick Start**: [TESTING_READY.md](TESTING_READY.md)
- **Full Docs**: [FK_CONSTRAINT_FIX_COMPLETE.md](FK_CONSTRAINT_FIX_COMPLETE.md)
- **Code Review**: [DETAILED_CODE_CHANGES.md](DETAILED_CODE_CHANGES.md)
- **Navigation**: [FK_FIX_DOCUMENTATION_INDEX.md](FK_FIX_DOCUMENTATION_INDEX.md)

## Commands
```bash
# Start server (if needed)
npm run dev

# View server logs
tail -f /tmp/server.log

# Kill server and restart
lsof -ti:3001 | xargs kill -9
npm run dev
```

## Key Insight
The problem wasn't in the code logic, it was in **type mismatch**:
- UUID: Technical ID (UUID v4 format)
- numero_expediente: Business ID (string like "2025-12345")
- Solution: Convert UUID → numero_expediente before DB inserts

---

**Time to Test**: 5 minutes  
**Status**: Ready to Go  
**Confidence**: High (well-tested architecture)
