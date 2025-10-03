# 🔧 Configurar Variables de Entorno en Netlify

## 📋 Variables Requeridas

Basándome en tu archivo `.env.example`, necesitas configurar estas variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# External Authentication System
VITE_AUTH_BASE_URL=https://auth-center.abacusai.app
VITE_AUTH_APP_ID=app_mg1rvnob8d0563aa3323fa8e
VITE_AUTH_API_KEY=ak_production_your_production_key
```

## 🚀 Pasos para Configurar en Netlify

### Opción 1: A través del Dashboard de Netlify

1. **Accede a tu sitio en Netlify:**
   - Ve a: https://app.netlify.com
   - Busca tu sitio: `lighthearted-axolotl-3a5de4`

2. **Navega a Environment Variables:**
   - Clic en tu sitio
   - Ve a `Site settings`
   - En el menú lateral: `Environment variables`

3. **Agrega cada variable:**
   - Clic en `Add a variable`
   - Key: `VITE_SUPABASE_URL`
   - Value: `tu_url_de_supabase`
   - Clic en `Create variable`

4. **Repite para todas las variables:**
   ```
   VITE_SUPABASE_URL = tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY = tu_clave_anonima_de_supabase
   VITE_AUTH_BASE_URL = https://auth-center.abacusai.app
   VITE_AUTH_APP_ID = app_mg1rvnob8d0563aa3323fa8e
   VITE_AUTH_API_KEY = tu_clave_de_produccion
   ```

### Opción 2: A través de Netlify CLI

Si tienes Netlify CLI instalado:

```bash
# Instalar Netlify CLI (si no lo tienes)
npm install -g netlify-cli

# Hacer login
netlify login

# Configurar variables
netlify env:set VITE_SUPABASE_URL "tu_url_de_supabase"
netlify env:set VITE_SUPABASE_ANON_KEY "tu_clave_anonima"
netlify env:set VITE_AUTH_BASE_URL "https://auth-center.abacusai.app"
netlify env:set VITE_AUTH_APP_ID "app_mg1rvnob8d0563aa3323fa8e"
netlify env:set VITE_AUTH_API_KEY "tu_clave_de_produccion"
```

## 📝 Valores que Necesitas Obtener

### 🗄️ Supabase
1. **VITE_SUPABASE_URL:**
   - Ve a tu proyecto en Supabase
   - Settings → API
   - Copia la "Project URL"

2. **VITE_SUPABASE_ANON_KEY:**
   - En la misma página de API
   - Copia la "anon public" key

### 🔐 Sistema de Autenticación
1. **VITE_AUTH_BASE_URL:**
   - Usar: `https://auth-center.abacusai.app`

2. **VITE_AUTH_APP_ID:**
   - Usar: `app_mg1rvnob8d0563aa3323fa8e`

3. **VITE_AUTH_API_KEY:**
   - Necesitas obtener tu clave de producción del sistema de auth

## 🔄 Redesplegar Después de Configurar

Después de agregar las variables:

1. **Trigger nuevo deploy:**
   - En Netlify Dashboard
   - Ve a `Deploys`
   - Clic en `Trigger deploy`
   - Selecciona `Deploy site`

2. **O desde aquí en Bolt:**
   - Simplemente vuelve a hacer deploy desde Bolt
   - Las nuevas variables se aplicarán automáticamente

## ⚠️ Notas Importantes

- ✅ **Variables VITE_**: Solo las variables que empiecen con `VITE_` estarán disponibles en el frontend
- ✅ **Rebuild requerido**: Después de cambiar variables, necesitas redesplegar
- ✅ **Seguridad**: Las variables `VITE_` son públicas, no pongas secretos ahí
- ✅ **Producción**: Usa las credenciales de producción, no las de desarrollo

## 🎯 Resultado Esperado

Una vez configuradas las variables, tu aplicación podrá:
- ✅ Conectarse a Supabase
- ✅ Usar el sistema de autenticación externo
- ✅ Funcionar completamente en producción