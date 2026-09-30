# Prueba local (Git Bash / PowerShell, dentro de `farmacia-lab`)

```bash
docker compose up --build -d
docker compose ps                      # los 3 servicios en "running"/"healthy"
```

Abrir http://localhost:8080 (arriba debe decir "API y base de datos conectadas").

## INSERT y SELECT
```bash
curl -X POST http://localhost:8080/api/medicamentos -H "Content-Type: application/json" \
  -d '{"nombre":"Panadol 500 mg","principio_activo":"Paracetamol","presentacion":"Tableta","lote":"L-2026-031","fecha_vencimiento":"2027-11-30","stock":150,"requiere_receta":false}'

curl http://localhost:8080/api/medicamentos/1
curl http://localhost:8080/api/medicamentos
curl http://localhost:8080/api/health
```

## Logs
```bash
docker compose logs backend
```
Deben verse: `Tabla medicamentos lista en RDS`, `INSERT medicamento id=...`, `SELECT medicamento id=...`.

## Persistencia (equivale al paso 6.6 de AWS)
```bash
docker compose down                    # borra contenedores, NO el volumen
docker compose up -d
curl http://localhost:8080/api/medicamentos     # los registros siguen ahi
```

## Verificar que el backend y la BD no son publicos
```bash
curl http://localhost:3000/api/health   # debe fallar (conexion rechazada)
```

## Limpiar todo (incluye los datos)
```bash
docker compose down -v
```

## Si algo falla
- Puerto 8080 ocupado: cambia `"8080:80"` por `"8081:80"`.
- "API no disponible" al inicio: espera unos segundos y recarga.
- Error en el build del backend por la descarga del certificado: revisa tu conexion a Internet.
