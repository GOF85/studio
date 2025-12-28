#!/usr/bin/env python3
"""
Script para ejecutar migraciones SQL en Supabase
Uso: python3 migrate-to-supabase.py
"""

import os
import sys
import subprocess
from pathlib import Path

def get_supabase_credentials():
    """Obtener credenciales de Supabase desde variables de entorno"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Variables de entorno no configuradas")
        print("   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY")
        sys.exit(1)
    
    return supabase_url, supabase_key

def main():
    """Ejecutar script de migración"""
    print("🚀 Iniciando migraciones de Supabase...")
    
    # Obtener credenciales
    supabase_url, supabase_key = get_supabase_credentials()
    
    # Archivo SQL
    sql_file = Path(__file__).parent.parent / 'migrations' / 'create_briefing_tables.sql'
    
    if not sql_file.exists():
        print(f"❌ Archivo no encontrado: {sql_file}")
        sys.exit(1)
    
    print(f"✅ Archivo de migración encontrado: {sql_file}")
    
    # Leer SQL
    with open(sql_file, 'r') as f:
        sql_content = f.read()
    
    # Ejecutar usando psql si está disponible
    # Alternativa: usar la API de Supabase REST
    print("\n📝 SQL a ejecutar:")
    print("-" * 80)
    print(sql_content[:500] + "..." if len(sql_content) > 500 else sql_content)
    print("-" * 80)
    
    print("\n⚠️  Para ejecutar las migraciones en Supabase, ve a:")
    print("   https://supabase.com/dashboard/project/_/sql/new")
    print("\n   Y pega el contenido del archivo:")
    print(f"   {sql_file}")
    print("\nO ejecuta:")
    print(f"   cat {sql_file} | pbcopy  # macOS")
    print(f"   cat {sql_file} | xclip  # Linux")
    
if __name__ == '__main__':
    main()
