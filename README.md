# Gestion_Medicamentos_AWS
# Inventario de Medicamentos – Farmacia hospitalaria

Aplicación web contenerizada para registrar y consultar medicamentos (nombre comercial, principio activo, presentación, lote, fecha de vencimiento, stock y si requiere receta). La interfaz muestra alertas de medicamentos **vencidos**, **próximos a vencer** (90 días o menos) y con **stock bajo** (menos de 20 unidades).

Proyecto del laboratorio *Arquitectura en AWS* (Docker → Amazon ECR → Amazon ECS con Fargate → Amazon RDS). Este repositorio incluye todo lo necesario para **ejecutarlo en local con Docker Compose**. La guía de despliegue en AWS está en [`docs/Laboratorio_AWS_Farmacia.md`](docs/Laboratorio_AWS_Farmacia.md).

## Arquitectura (entorno local)

```
Navegador ──► Frontend (Nginx, puerto 8080) ──► Backend (Node.js/Express, interno) ──► PostgreSQL (interno)
```

Solo el frontend publica un puerto. El backend y la base de datos quedan dentro de la red de Docker, igual que en las subredes privadas de AWS. Nginx reenvía las rutas `/api/` al backend.

| Componente | Tecnología |
|---|---|
| Frontend | HTML + CSS + JavaScript servido por Nginx 1.27 |
| Backend / API | Node.js 20, Express, pg |
| Base de datos | PostgreSQL 16 (en AWS: Amazon RDS) |
| Orquestación local | Docker Compose |

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **abierto** (en Windows requiere WSL 2; Docker Desktop te guía si falta).
- [Git](https://git-scm.com/downloads) (en Windows incluye **Git Bash**).
- Conexión a Internet en la primera ejecución, para descargar las imágenes base y el certificado de RDS que usa el backend.
- Puerto **8080** libre.

Comprueba que Docker responde:

```bash
docker --version
docker compose version
```

## Instalación y ejecución

1. Clona el repositorio y entra a la carpeta:

   ```bash
   git clone https://github.com/TU_USUARIO/farmacia-lab.git
   cd farmacia-lab
   ```

2. Construye y levanta los tres servicios:

   ```bash
   docker compose up --build -d
   ```

   La primera vez tarda unos minutos (descarga de imágenes).

3. Verifica el estado:

   ```bash
   docker compose ps
   ```

   `db` debe aparecer como **healthy** y `backend` y `frontend` como **running**.

4. Abre **http://localhost:8080**. Arriba a la derecha debe decir *"API y base de datos conectadas"*. Si dice *"API no disponible"*, espera 10-20 segundos y recarga.

## Uso

Desde la interfaz: llena el formulario y pulsa **Registrar medicamento**. La tabla de la derecha se actualiza y permite buscar por nombre o principio activo.

### Probar la API desde la terminal

**Git Bash / Linux / macOS**

```bash
# INSERT
curl -X POST http://localhost:8080/api/medicamentos -H "Content-Type: application/json" \
  -d '{"nombre":"Panadol 500 mg","principio_activo":"Paracetamol","presentacion":"Tableta","lote":"L-2026-031","fecha_vencimiento":"2027-11-30","stock":150,"requiere_receta":false}'

# SELECT
curl http://localhost:8080/api/medicamentos/1
curl http://localhost:8080/api/medicamentos
curl http://localhost:8080/api/health
```

**PowerShell (Windows)**

En PowerShell `curl` es un alias de `Invoke-WebRequest` y muestra advertencias. Usa estos comandos:

```powershell
# INSERT
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/medicamentos -ContentType "application/json" -Body '{"nombre":"Panadol 500 mg","principio_activo":"Paracetamol","presentacion":"Tableta","lote":"L-2026-031","fecha_vencimiento":"2027-11-30","stock":150,"requiere_receta":false}'

# SELECT
Invoke-RestMethod http://localhost:8080/api/medicamentos/1
Invoke-RestMethod http://localhost:8080/api/medicamentos
curl.exe http://localhost:8080/api/health
```

### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Comprueba la conexión con la base de datos |
| POST | `/api/medicamentos` | Inserta un medicamento |
| GET | `/api/medicamentos?q=texto` | Lista medicamentos (búsqueda opcional por nombre o principio activo) |
| GET | `/api/medicamentos/:id` | Consulta un medicamento por id |

### Logs

```bash
docker compose logs backend
```

Deben verse líneas como `Tabla medicamentos lista en RDS`, `INSERT medicamento id=...` y `SELECT medicamentos -> N registro(s)`.

## Comprobar la persistencia

```bash
docker compose down        # elimina contenedores y red; conserva el volumen de datos
docker compose up -d
```

Al volver a consultar `http://localhost:8080/api/medicamentos`, los registros siguen ahí.

## Comprobar que el backend no es público

El backend no publica puertos al host, así que esto debe fallar:

```bash
curl http://localhost:3000/api/health
```

## Detener y limpiar

| Comando | Efecto |
|---|---|
| `docker compose stop` | Detiene los servicios sin borrar nada |
| `docker compose down` | Elimina contenedores y red; **conserva los datos** |
| `docker compose down -v` | Elimina todo, **incluidos los datos** de la base |

## Configuración

Las variables de entorno están definidas en `docker-compose.yml`. La contraseña `local_dev_pass` es solo para pruebas locales; en AWS las credenciales se guardan en Secrets Manager y nunca se escriben en el código.

| Variable | Local | AWS |
|---|---|---|
| `DB_HOST` | `db` | Endpoint de Amazon RDS |
| `DB_SSL` | `false` | `true` |
| `BACKEND_HOST` (frontend) | `backend` | `backend.farmacia.local` (Cloud Map) |
| `DNS_RESOLVER` (frontend) | `127.0.0.11` | `10.0.0.2` |

## Estructura del proyecto

```
farmacia-lab/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── Dockerfile
│   ├── default.conf.template
│   └── index.html
├── docs/
│   └── Laboratorio_AWS_Farmacia.md   # guía de despliegue en AWS
├── docker-compose.yml
├── PRUEBAS_LOCAL.md
└── README.md
```

## Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| `cannot connect to the Docker daemon` / `error during connect` | Docker Desktop no está abierto. Ábrelo y espera a que diga *Engine running*. |
| `port is already allocated` (8080) | Otro programa usa el puerto. En `docker-compose.yml` cambia `"8080:80"` por `"8081:80"` y entra por `:8081`. |
| El build del backend falla en `ADD https://truststore...` | Sin Internet o red bloqueada. Prueba desde otra red. |
| Se queda en "API no disponible" | Revisa `docker compose logs backend`. Si hay error de conexión a la base, espera unos segundos más. |
| Error de WSL en Windows | Docker Desktop necesita WSL 2. Sigue el aviso que muestra y reinicia el equipo. |
| `curl` muestra una advertencia de seguridad (PowerShell) | Usa `curl.exe` o `Invoke-RestMethod`, o ejecuta los comandos en Git Bash. |

## Despliegue en AWS

Requiere una cuenta de AWS con permisos sobre VPC, ECS, ECR, RDS, IAM, CloudWatch y Secrets Manager. Los pasos completos están en [`docs/Laboratorio_AWS_Farmacia.md`](docs/Laboratorio_AWS_Farmacia.md) y están escritos para ejecutarse en **Git Bash**. Al terminar, ejecuta el Paso 7 de esa guía para eliminar los recursos y evitar costos.
