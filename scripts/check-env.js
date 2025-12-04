// Script para verificar que las variables de entorno estén configuradas
const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(process.cwd(), '.env.local');
const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_TMDB_API_KEY',
];

console.log('🔍 Verificando configuración de variables de entorno...\n');

// Verificar si existe el archivo
if (!fs.existsSync(envLocalPath)) {
    console.error('❌ El archivo .env.local NO existe en:', envLocalPath);
    console.log('\n📝 Para crear el archivo:');
    console.log('   1. Crea un archivo llamado .env.local en la raíz del proyecto');
    console.log('   2. Agrega todas las variables de entorno necesarias');
    console.log('   3. Reinicia el servidor de desarrollo (npm run dev)\n');
    process.exit(1);
}

console.log('✅ El archivo .env.local existe\n');

// Leer y verificar variables
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    }
});

console.log('📋 Variables encontradas en .env.local:\n');
let allPresent = true;

requiredVars.forEach(varName => {
    const value = envVars[varName];
    if (value) {
        const displayValue = value.length > 50 ? value.substring(0, 50) + '...' : value;
        console.log(`   ✅ ${varName}: ${displayValue}`);
    } else {
        console.log(`   ❌ ${varName}: NO ENCONTRADA`);
        allPresent = false;
    }
});

console.log('\n📊 Resumen:');
if (allPresent) {
    console.log('✅ Todas las variables requeridas están presentes');
    console.log('\n💡 Si aún tienes problemas:');
    console.log('   1. Asegúrate de haber reiniciado el servidor (Ctrl+C y luego npm run dev)');
    console.log('   2. Verifica que no haya espacios extra en el archivo .env.local');
    console.log('   3. Verifica que cada variable esté en una línea separada');
} else {
    console.log('❌ Faltan algunas variables requeridas');
    process.exit(1);
}

