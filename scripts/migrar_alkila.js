// Script de migración de imágenes para artículos desde alkila.csv
// Requiere: npm install sharp csv-parser node-fetch@2 @supabase/supabase-js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const sharp = require('sharp');
const csv = require('csv-parser');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURACIÓN HARDCODEADA ---
const SUPABASE_URL = 'https://zyrqdqpbrsevuygjrhvk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5cnFkcXBicnNldnV5Z2pyaHZrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE2OTk0NCwiZXhwIjoyMDc5NzQ1OTQ0fQ.4afaYw7-SGNqbjGTtC_t0brOnCbWoIvCec4RuZ6vF_Y'; // <-- Pega aquí tu clave service_role
const BUCKET = 'articulosMice';
const FOLDER = 'alkila';
const INPUT_CSV = 'alkila.csv';
const TMP_IMG_DIR = 'tmp_alkila_imgs';
const MAX_SIZE = 600;
const WEBP_QUALITY = 70;
const BATCH_SIZE = 100;

if (!fs.existsSync(TMP_IMG_DIR)) fs.mkdirSync(TMP_IMG_DIR);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-\.]/gi, '_').toLowerCase();
}

async function downloadAndProcessImage(url, outputPath) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Error descargando ${url}: ${response.statusText}`);
    const buffer = await response.buffer();
    await sharp(buffer)
      .resize(MAX_SIZE, MAX_SIZE, { fit: 'inside' })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
    return true;
  } catch (err) {
    console.error(`❌ Error con ${url}: ${err.message}`);
    return false;
  }
}

async function uploadToSupabase(localPath, remoteName) {
  const fileBuffer = fs.readFileSync(localPath);
  const { data, error } = await supabase.storage.from(BUCKET)
    .upload(`${FOLDER}/${remoteName}`, fileBuffer, {
      contentType: 'image/webp',
      upsert: true
    });
  if (error) {
    console.error(`❌ Error subiendo ${remoteName}: ${error.message}`);
    return null;
  }
  // Construir URL pública
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/${remoteName}`;
}

async function updateArticuloImagen(nombre, imagenUrl) {
  // Buscar artículo por nombre exacto
  const { data: articulos, error } = await supabase
    .from('articulos')
    .select('id, nombre')
    .eq('nombre', nombre);
  if (error) {
    console.error(`❌ Error buscando artículo '${nombre}': ${error.message}`);
    return false;
  }
  if (!articulos || articulos.length === 0) {
    console.warn(`⚠️  Artículo no encontrado: '${nombre}'`);
    return false;
  }
  const articuloId = articulos[0].id;
  const imagenesArray = imagenUrl ? [imagenUrl] : [];
  const { error: updateError } = await supabase
    .from('articulos')
    .update({ imagenes: imagenesArray })
    .eq('id', articuloId);
  if (updateError) {
    console.error(`❌ Error actualizando imágenes para '${nombre}': ${updateError.message}`);
    return false;
  }
  return true;
}

async function processBatch(batch, batchNum) {
  console.log(`\n--- Procesando lote ${batchNum} (${batch.length} artículos) ---`);
  for (const row of batch) {
    const nombre = row['Art']?.trim();
    const imagenUrl = row['Foto ALKILA']?.trim();
    if (!nombre) {
      console.warn('Fila sin nombre, saltando:', row);
      continue;
    }
    let finalImageUrl = '';
    if (imagenUrl) {
      const filename = sanitizeFilename(`${nombre}.webp`);
      const localPath = path.join(TMP_IMG_DIR, filename);
      const ok = await downloadAndProcessImage(imagenUrl, localPath);
      if (ok) {
        const uploadedUrl = await uploadToSupabase(localPath, filename);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
          console.log(`✔️  ${nombre}: Imagen subida y procesada.`);
        } else {
          console.warn(`⚠️  ${nombre}: Fallo al subir imagen.`);
        }
      } else {
        console.warn(`⚠️  ${nombre}: Fallo al procesar imagen.`);
      }
    } else {
      console.log(`ℹ️  ${nombre}: Sin imagen, se dejará array vacío.`);
    }
    const updated = await updateArticuloImagen(nombre, finalImageUrl);
    if (updated) {
      console.log(`✅ ${nombre}: Campo 'imagenes' actualizado.`);
    } else {
      console.warn(`⚠️  ${nombre}: No se pudo actualizar el campo 'imagenes'.`);
    }
  }
}

function processCSV() {
  const rows = [];
  fs.createReadStream(INPUT_CSV)
    .pipe(csv({ separator: ';' }))
    .on('data', (row) => rows.push(row))
    .on('end', async () => {
      let batchNum = 1;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        await processBatch(batch, batchNum++);
      }
      console.log('\n🎉 Proceso completado.');
    });
}

processCSV();
