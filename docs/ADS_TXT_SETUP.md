# Configuración de ads.txt para Google AdSense

## ¿Qué es ads.txt?

El archivo `ads.txt` (Authorized Digital Sellers) es un archivo de texto que debe estar en la raíz de tu dominio para autorizar a Google AdSense (y otras redes publicitarias) a vender inventario publicitario en tu sitio.

## 📍 Ubicación del Archivo

✅ **Ya creado**: `public/ads.txt`

Este archivo se servirá automáticamente en:
```
https://tudominio.com/ads.txt
```

## 🔧 Configuración Paso a Paso

### 1. Obtener tu Publisher ID

1. Ve a tu dashboard de Google AdSense
2. Navega a **Account → Account Information**
3. Copia tu **Publisher ID** (formato: `pub-XXXXXXXXXXXXXXXX`)

### 2. Editar el archivo ads.txt

Abre `public/ads.txt` y reemplaza:

```txt
# ANTES (placeholder)
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0

# DESPUÉS (con tu Publisher ID real)
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

**Ejemplo real**:
```txt
google.com, pub-9876543210987654, DIRECT, f08c47fec0942fa0
```

### 3. Formato Explicado

```
<DOMAIN>, <PUBLISHER_ID>, <RELATIONSHIP>, <CERTIFICATION_AUTHORITY_ID>
```

- **google.com**: Dominio de la red publicitaria (Google AdSense)
- **pub-XXXXXXXXXXXXXXXX**: Tu Publisher ID único
- **DIRECT**: Relación directa (tú eres el propietario del sitio)
- **f08c47fec0942fa0**: ID de certificación de Google (siempre el mismo)

### 4. Deploy

```bash
git add public/ads.txt
git commit -m "feat: Add ads.txt for AdSense authorization"
git push origin main
```

### 5. Verificar

Después del deploy, verifica que el archivo sea accesible:

```
https://tudominio.com/ads.txt
```

Deberías ver el contenido del archivo en texto plano.

## ✅ Verificación en Google AdSense

1. Ve a **Sites** en tu dashboard de AdSense
2. Busca tu sitio
3. Verifica el estado de ads.txt:
   - ✅ **Authorized**: Tu Publisher ID fue encontrado (correcto)
   - ❌ **Unauthorized**: Publisher ID no encontrado (revisar archivo)
   - ⚠️ **Not found**: Archivo ads.txt no encontrado (verificar deploy)

## ⏱️ Tiempo de Propagación

- **Crawling inicial**: 24-48 horas
- **Actualizaciones**: Puede tomar hasta 24 horas

## 🔍 Troubleshooting

### Problema: "Not found"
**Solución**: 
- Verifica que el archivo esté en `public/ads.txt`
- Confirma que el deploy fue exitoso
- Espera 24-48 horas para el primer crawl

### Problema: "Unauthorized"
**Solución**:
- Verifica que el Publisher ID sea correcto
- Asegúrate de no tener espacios extra
- Confirma que el formato sea exacto

### Problema: Archivo no accesible
**Solución**:
- En Next.js, archivos en `public/` se sirven desde la raíz
- Verifica que no haya reglas de redirect que interfieran
- Revisa que el archivo tenga extensión `.txt` (no `.txt.txt`)

## 📝 Múltiples Redes Publicitarias

Si usas más de una red publicitaria, agrega una línea por red:

```txt
# Google AdSense
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0

# Media.net (ejemplo)
media.net, 8CU123456, DIRECT

# Otro network (ejemplo)
example.com, 123456, DIRECT
```

## 🔒 Seguridad

- ✅ El archivo es público (debe serlo)
- ✅ Solo contiene información de autorización
- ✅ No contiene información sensible
- ✅ No requiere autenticación

## 📊 Impacto en Revenue

**Tener ads.txt correctamente configurado**:
- ✅ Aumenta confianza de anunciantes
- ✅ Puede mejorar CPM
- ✅ Previene fraude publicitario
- ✅ Requerido por Google AdSense

**No tener ads.txt**:
- ❌ AdSense no mostrará anuncios
- ❌ Pérdida de revenue
- ❌ Advertencias en dashboard

## ✅ Checklist Final

- [ ] Archivo `public/ads.txt` creado
- [ ] Publisher ID obtenido de AdSense
- [ ] Publisher ID reemplazado en el archivo
- [ ] Formato verificado (sin espacios extra)
- [ ] Commit y push realizados
- [ ] Deploy exitoso a producción
- [ ] Archivo accesible en `https://tudominio.com/ads.txt`
- [ ] Esperado 24-48h para verificación en AdSense
- [ ] Estado "Authorized" confirmado en AdSense dashboard

## 🔗 Recursos

- [IAB ads.txt Specification](https://iabtechlab.com/ads-txt/)
- [Google AdSense ads.txt Guide](https://support.google.com/adsense/answer/7532444)
- [ads.txt Validator](https://adstxt.guru/)

---

**Nota**: El archivo `ads.txt` es **obligatorio** para que Google AdSense muestre anuncios en tu sitio. Sin él, los anuncios no aparecerán.
